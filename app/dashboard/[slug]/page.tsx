import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { CallsVsReservasChart } from '@/components/dashboard/calls-vs-reservas-chart'
import { CallTypeChart } from '@/components/dashboard/call-type-chart'
import { KpiCard } from '@/components/ui/kpi-card'
import { EmptyState } from '@/components/ui/empty-state'
import { PhoneOff, ShieldCheck } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

function formatPct(n: number, d: number): string {
  if (!d) return '0%'
  return `${Math.round((n / d) * 100)}%`
}

export default async function DashboardPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { periodo = '30d' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome, slug, estado, tem_takeaway, aceita_ultima_hora')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const now = new Date()
  const startDate = periodo === 'hoje'
    ? startOfDay(now)
    : periodo === '7d'
    ? subDays(now, 7)
    : subDays(now, 30)

  const startIso = startDate.toISOString()

  const { data: dailyStats } = await supabase
    .from('daily_stats')
    .select('stat_date, total_chamadas, chamadas_sucesso, chamadas_transferidas, reservas_criadas, duracao_media_segundos')
    .eq('restaurant_id', restaurant.id)
    .gte('stat_date', format(startDate, 'yyyy-MM-dd'))
    .order('stat_date')

  const stats = dailyStats ?? []

  const totalChamadas   = stats.reduce((s, d) => s + (d.total_chamadas ?? 0), 0)
  const chamadasSucesso = stats.reduce((s, d) => s + (d.chamadas_sucesso ?? 0), 0)
  const chamadasTransf  = stats.reduce((s, d) => s + (d.chamadas_transferidas ?? 0), 0)
  const reservasCriadas = stats.reduce((s, d) => s + (d.reservas_criadas ?? 0), 0)

  // Dados sempre dos últimos 7 dias para o chart Chamadas vs Reservas
  const last7Start = subDays(now, 7)
  const { data: stats7d } = await supabase
    .from('daily_stats')
    .select('stat_date, total_chamadas, reservas_criadas')
    .eq('restaurant_id', restaurant.id)
    .gte('stat_date', format(last7Start, 'yyyy-MM-dd'))
    .order('stat_date')

  // Tipo de chamada: TODAS as chamadas do restaurante (sem filtro temporal)
  const { data: callTypes } = await supabase
    .from('calls')
    .select('tipo_chamada')
    .eq('restaurant_id', restaurant.id)

  const typeCount: Record<string, number> = {}
  for (const c of callTypes ?? []) {
    if (c.tipo_chamada) typeCount[c.tipo_chamada] = (typeCount[c.tipo_chamada] ?? 0) + 1
  }
  const callTypeData = Object.entries(typeCount)
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)

  // Receita Estimada — filtrada pelo período seleccionado
  // bookings: campo number_of_people, data confirmado_em
  // ultima_hora_requests: campo pessoas, data criado_em (só se aceita_ultima_hora = true)
  // takeaway_orders: data criado_em (só se tem_takeaway = true)
  const reservasQuery = supabase
    .from('bookings')
    .select('number_of_people')
    .eq('restaurant_id', restaurant.id)
    .gte('confirmado_em', startIso)
    .eq('estado', 'confirmada')

  const ultimaHoraQuery = restaurant.aceita_ultima_hora
    ? supabase
        .from('ultima_hora_requests')
        .select('pessoas')
        .eq('restaurant_id', restaurant.id)
        .gte('criado_em', startIso)
        .eq('estado', 'aceite')
    : Promise.resolve({ data: [] as { pessoas: number }[] })

  const takeawayQuery = restaurant.tem_takeaway
    ? supabase
        .from('takeaway_orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .gte('criado_em', startIso)
        .eq('estado', 'confirmado')
    : Promise.resolve({ data: [] as { id: string }[] })

  const [reservasPeriodoRes, ultimaHoraPeriodoRes, takeawaysPeriodoRes] = await Promise.all([
    reservasQuery,
    ultimaHoraQuery,
    takeawayQuery,
  ])

  const pessoasReservas   = (reservasPeriodoRes.data ?? []).reduce((s, b) => s + ((b as Record<string, unknown>).number_of_people as number ?? 0), 0)
  const pessoasUltimaHora = (ultimaHoraPeriodoRes.data ?? []).reduce((s, u) => s + ((u as Record<string, unknown>).pessoas as number ?? 0), 0)
  const totalTakeaways    = takeawaysPeriodoRes.data?.length ?? 0
  const receitaEstimada   = (pessoasReservas + pessoasUltimaHora) * 20 + totalTakeaways * 35

  let guarantee = null
  if (restaurant.estado === 'em_garantia') {
    const { data: gt } = await supabase
      .from('v_guarantee_status')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single()
    guarantee = gt
  }

  const successRate   = parseInt(formatPct(chamadasSucesso, totalChamadas))
  const reservaRate   = parseInt(formatPct(reservasCriadas, totalChamadas))

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        minHeight: '100%',
        background: 'var(--bg-base)',
      }}
    >
      {/* ── Page header ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              margin: 0,
            }}
          >
            {restaurant.nome}
          </h1>
          <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            Resumo do período escolhido
          </p>
        </div>
        <PeriodFilter active={periodo} />
      </div>

      {/* ── Guarantee widget ── */}
      {guarantee && (
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            padding: '20px 24px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '16px',
          }}
          className="animate-in"
        >
          <div
            style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'var(--blue-50)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <ShieldCheck style={{ width: '18px', height: '18px', color: 'var(--blue-600)' }} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '10px',
              }}
            >
              <p style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Período de Garantia
              </p>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {(guarantee as Record<string, unknown>).dia_efectivo as number} / 30 dias
              </span>
            </div>
            <div
              style={{
                width: '100%',
                height: '6px',
                background: 'var(--bg-muted)',
                borderRadius: '3px',
                overflow: 'hidden',
                marginBottom: '8px',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '3px',
                  background: 'var(--blue-500)',
                  width: `${Math.min(
                    Math.round(
                      ((guarantee as Record<string, unknown>).contagem_actual as number) /
                      ((guarantee as Record<string, unknown>).objetivo as number) * 100
                    ),
                    100
                  )}%`,
                  transition: 'width 600ms var(--ease-out)',
                }}
              />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '12px',
                color: 'var(--text-muted)',
              }}
            >
              <span>{(guarantee as Record<string, unknown>).contagem_actual as number} pessoas geradas</span>
              <span>Objectivo: {(guarantee as Record<string, unknown>).objetivo as number} pessoas</span>
            </div>
          </div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div
        className="nc-kpi-grid-3"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 'var(--card-gap)',
        }}
      >
        <KpiCard
          label="Total de Chamadas"
          value={totalChamadas}
          animationDelay={0}
        />
        <KpiCard
          label="Taxa de Sucesso"
          value={`${successRate}%`}
          delta={successRate >= 70 ? 0 : undefined}
          animationDelay={60}
        />
        <KpiCard
          label="Reservas Criadas"
          value={reservasCriadas}
          animationDelay={120}
        />
        <KpiCard
          label="Taxa de Transferência"
          value={formatPct(chamadasTransf, totalChamadas)}
          animationDelay={180}
        />
        <KpiCard
          label="Taxa de Reservas"
          value={`${reservaRate}%`}
          animationDelay={240}
        />
        <KpiCard
          label="Receita Estimada"
          value={`€${receitaEstimada.toLocaleString('pt-PT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`}
          animationDelay={300}
        />
      </div>

      {/* ── Charts ── */}
      {totalChamadas > 0 ? (
        <div
          className="nc-charts-grid"
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr',
            gap: 'var(--card-gap)',
          }}
        >
          {/* Chamadas vs Reservas — sempre últimos 7 dias */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              padding: 'var(--card-padding)',
            }}
            className="animate-in"
          >
            <div style={{ marginBottom: '4px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Chamadas vs Reservas
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Últimos 7 dias
              </p>
            </div>
            <CallsVsReservasChart data={stats7d ?? []} />
          </div>

          {/* Call type */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              padding: 'var(--card-padding)',
            }}
            className="animate-in"
          >
            <div style={{ marginBottom: '20px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Tipo de chamada
              </h2>
              <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                Total acumulado
              </p>
            </div>
            <CallTypeChart data={callTypeData} total={callTypeData.reduce((s, d) => s + d.count, 0)} />
          </div>
        </div>
      ) : (
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
          }}
        >
          <EmptyState
            icon={<PhoneOff style={{ width: '40px', height: '40px' }} />}
            title="Sem chamadas no período seleccionado"
            description="Os dados aparecem aqui à medida que o agente atende chamadas."
          />
        </div>
      )}
    </div>
  )
}
