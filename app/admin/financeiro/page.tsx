import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { formatEuro, formatDate } from '@/lib/utils'
import { Euro, AlertCircle, TrendingUp, TrendingDown, BarChart3 } from 'lucide-react'
import { RegistarFaturaButton } from '@/components/admin/registar-fatura-button'
import { ReenviarPortalButton } from '@/components/admin/reenviar-portal-button'
import { FinanceiroRestaurantesTable } from '@/components/admin/financeiro-restaurantes-table'
import type { FinanceiroRestauranteRow } from '@/components/admin/financeiro-restaurantes-table'
import type { RestaurantEstado } from '@/types'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--surface-border)',
  borderRadius: '16px',
  padding: '20px',
}

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  const [
    paidCyclesRes,
    arrearsCyclesRes,
    allCallsRes,
    allCyclesRes,
    activeCyclesRes,
    custosRes,
    faturasPendentesRes,
    emAtrasoRes,
  ] = await Promise.all([
    // Ciclos pagos (histórico completo)
    db.from('billing_cycles')
      .select('valor_total, restaurant_id')
      .eq('estado_pagamento', 'pago'),

    // Ciclos em atraso
    db.from('billing_cycles')
      .select('valor_total, restaurant_id')
      .eq('estado_pagamento', 'em_atraso'),

    // Todas as chamadas (para custo IA histórico)
    db.from('calls').select('duration_seconds'),

    // Todos os ciclos concluídos com dados do restaurante
    db.from('billing_cycles')
      .select('restaurant_id, valor_total, estado_pagamento, numero_ciclo, restaurants(nome, slug, estado)')
      .neq('estado', 'ativo')
      .not('isento_faturacao', 'eq', true),

    // Ciclos activos actuais (receita em aberto)
    db.from('billing_cycles')
      .select('restaurant_id, valor_total, restaurants(nome, slug, estado)')
      .eq('estado', 'ativo')
      .not('isento_faturacao', 'eq', true),

    // Custos IA por restaurante
    db.from('v_admin_custos').select('restaurant_id, restaurant_nome, total_minutos, custo_total_eur'),

    // AT pendentes
    db.from('billing_cycles')
      .select('*, restaurants(nome, slug, client_id, clients(nome_empresa))')
      .eq('estado_pagamento', 'pago')
      .is('numero_fatura_at', null)
      .not('isento_faturacao', 'eq', true)
      .order('data_fim_real', { ascending: true }),

    // Em atraso
    db.from('billing_cycles')
      .select('*, restaurants(nome, slug, client_id, clients(nome_empresa))')
      .eq('estado_pagamento', 'em_atraso')
      .order('data_fim_real', { ascending: true }),
  ])

  const paidCycles = paidCyclesRes.data ?? []
  const arrearsCycles = arrearsCyclesRes.data ?? []
  const allCalls = allCallsRes.data ?? []
  const allCycles = allCyclesRes.data ?? []
  const activeCycles = activeCyclesRes.data ?? []
  const custos = custosRes.data ?? []
  const pendentes = faturasPendentesRes.data ?? []
  const atraso = emAtrasoRes.data ?? []

  // ── KPIs globais ─────────────────────────────────────────────────────────────
  const totalFaturado = paidCycles.reduce((s, c) => s + (Number(c.valor_total) || 0), 0)
  const totalEmAtraso = arrearsCycles.reduce((s, c) => s + (Number(c.valor_total) || 0), 0)
  const totalEmAberto = activeCycles.reduce((s, c) => s + (Number(c.valor_total) || 0), 0)
  const totalCustosIA = Math.round(
    (allCalls.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60) * 0.14 * 100
  ) / 100
  const margemBruta = totalFaturado - totalCustosIA

  // ── Breakdown por restaurante ─────────────────────────────────────────────────
  type RestaurantRow = {
    nome: string
    slug: string
    estado: RestaurantEstado
    faturado: number
    emAtraso: number
    emAberto: number
    custosIA: number
    margem: number
    numeroCiclos: number
  }

  const restaurantMap = new Map<string, RestaurantRow>()

  for (const c of allCycles) {
    const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
    if (!r || !c.restaurant_id) continue
    const existing = restaurantMap.get(c.restaurant_id) ?? {
      nome: r.nome ?? '',
      slug: r.slug ?? '',
      estado: r.estado as RestaurantEstado,
      faturado: 0,
      emAtraso: 0,
      emAberto: 0,
      custosIA: 0,
      margem: 0,
      numeroCiclos: 0,
    }
    const val = Number(c.valor_total) || 0
    if (c.estado_pagamento === 'pago') existing.faturado += val
    if (c.estado_pagamento === 'em_atraso') existing.emAtraso += val
    existing.numeroCiclos += 1
    restaurantMap.set(c.restaurant_id, existing)
  }

  for (const c of activeCycles) {
    const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
    if (!r || !c.restaurant_id) continue
    const existing = restaurantMap.get(c.restaurant_id) ?? {
      nome: r.nome ?? '',
      slug: r.slug ?? '',
      estado: r.estado as RestaurantEstado,
      faturado: 0,
      emAtraso: 0,
      emAberto: 0,
      custosIA: 0,
      margem: 0,
      numeroCiclos: 0,
    }
    existing.emAberto = Number(c.valor_total) || 0
    restaurantMap.set(c.restaurant_id, existing)
  }

  for (const custo of custos) {
    if (!custo.restaurant_id) continue
    const existing = restaurantMap.get(custo.restaurant_id)
    if (existing) {
      existing.custosIA = Math.round(Number(custo.custo_total_eur || 0) * 100) / 100
      existing.margem = Math.round((existing.faturado - existing.custosIA) * 100) / 100
    }
  }

  const restaurantRows: FinanceiroRestauranteRow[] = Array.from(restaurantMap.values())
    .sort((a, b) => b.faturado - a.faturado)

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '32px',
      }}
    >
      {/* Header */}
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
          Financeiro
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Receita, custos e margem da Nine Calls
        </p>
      </div>

      {/* ── KPI Summary ── */}
      <section>
        <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 12px' }}>
          Histórico Total
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 'var(--card-gap)' }}>
          {/* Total Faturado */}
          <div style={{ ...cardStyle, background: 'var(--gray-950)', border: '1px solid transparent' }}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'rgba(255,255,255,0.5)', margin: '0 0 10px' }}>
              Total Faturado
            </p>
            <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '2rem', fontWeight: 600, color: '#fff', letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
              {formatEuro(totalFaturado)}
            </p>
            {totalEmAtraso > 0 && (
              <p style={{ fontSize: '11px', color: 'rgba(255,100,100,0.8)', margin: '8px 0 0' }}>
                + {formatEuro(totalEmAtraso)} em atraso
              </p>
            )}
          </div>

          {/* Custos IA */}
          <div style={cardStyle}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Custos IA
            </p>
            <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
              {formatEuro(totalCustosIA)}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              chamadas × €0,14/min
            </p>
          </div>

          {/* Margem Bruta */}
          <div style={cardStyle}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Margem Bruta
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {margemBruta >= 0
                ? <TrendingUp style={{ width: '16px', height: '16px', color: 'var(--green-600, #16a34a)', flexShrink: 0 }} />
                : <TrendingDown style={{ width: '16px', height: '16px', color: 'var(--red-600, #dc2626)', flexShrink: 0 }} />
              }
              <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '2rem', fontWeight: 600, color: margemBruta >= 0 ? 'var(--green-600, #16a34a)' : 'var(--red-600, #dc2626)', letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
                {formatEuro(margemBruta)}
              </p>
            </div>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              faturado − custos IA
            </p>
          </div>

          {/* Em Aberto */}
          <div style={cardStyle}>
            <p style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: '0 0 10px' }}>
              Em Aberto
            </p>
            <p style={{ fontFamily: 'var(--font-geist-mono), monospace', fontSize: '2rem', fontWeight: 600, color: 'var(--text-primary)', letterSpacing: '-0.03em', margin: 0, lineHeight: 1 }}>
              {formatEuro(totalEmAberto)}
            </p>
            <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '8px 0 0' }}>
              ciclos activos a faturar
            </p>
          </div>
        </div>
      </section>

      {/* ── Breakdown por restaurante ── */}
      {restaurantRows.length > 0 && (
        <section>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <BarChart3 style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
            <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              Por Restaurante
            </h2>
          </div>
          <FinanceiroRestaurantesTable rows={restaurantRows} />
        </section>
      )}

      {/* ── Facturas AT pendentes ── */}
      <section className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <Euro style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Facturas AT por Registar
          </h2>
          {pendentes.length > 0 && (
            <span
              style={{
                background: 'var(--amber-100, #fef3c7)',
                color: 'var(--amber-700, #b45309)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: '100px',
              }}
            >
              {pendentes.length}
            </span>
          )}
        </div>
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {pendentes.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Todas as facturas estão registadas ✓
            </div>
          ) : (
            pendentes.map((cycle: Record<string, unknown>, idx) => {
              const rest = cycle.restaurants as Record<string, unknown>
              const client = rest?.clients as Record<string, unknown>
              return (
                <div
                  key={cycle.id as string}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    borderBottom: idx < pendentes.length - 1 ? '1px solid var(--surface-border)' : 'none',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {rest?.nome as string}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {client?.nome_empresa as string} · Ciclo {cycle.numero_ciclo as number} · {formatDate(cycle.data_fim_real as string)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-geist-mono), monospace',
                      }}
                    >
                      {formatEuro(cycle.valor_total as number)}
                    </span>
                    <RegistarFaturaButton
                      cycleId={cycle.id as string}
                      restauranteNome={rest?.nome as string}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* ── Pagamentos em atraso ── */}
      <section className="animate-in">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <AlertCircle style={{ width: '14px', height: '14px', color: 'var(--red-500)' }} />
          <h2 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
            Pagamentos em Atraso
          </h2>
          {atraso.length > 0 && (
            <span
              style={{
                background: 'var(--red-50)',
                color: 'var(--red-600)',
                fontSize: '11px',
                fontWeight: 600,
                padding: '1px 8px',
                borderRadius: '100px',
              }}
            >
              {atraso.length}
            </span>
          )}
        </div>
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
            overflow: 'hidden',
          }}
        >
          {atraso.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '14px' }}>
              Nenhum pagamento em atraso ✓
            </div>
          ) : (
            atraso.map((cycle: Record<string, unknown>, idx) => {
              const rest = cycle.restaurants as Record<string, unknown>
              const client = rest?.clients as Record<string, unknown>
              return (
                <div
                  key={cycle.id as string}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 20px',
                    background: 'rgba(254,242,242,0.4)',
                    borderBottom: idx < atraso.length - 1 ? '1px solid var(--surface-border)' : 'none',
                  }}
                >
                  <div>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                      {rest?.nome as string}
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                      {client?.nome_empresa as string} · Ciclo {cycle.numero_ciclo as number} · {formatDate(cycle.data_fim_real as string)}
                    </p>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span
                      style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: 'var(--red-600)',
                        fontFamily: 'var(--font-geist-mono), monospace',
                      }}
                    >
                      {formatEuro(cycle.valor_total as number)}
                    </span>
                    <ReenviarPortalButton clientId={rest?.client_id as string} />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
