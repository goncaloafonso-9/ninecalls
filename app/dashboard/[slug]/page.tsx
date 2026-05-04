import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { CallsChart } from '@/components/dashboard/calls-chart'
import { CallTypeChart } from '@/components/dashboard/call-type-chart'
import {
  Phone, CheckCircle, Calendar, TrendingUp, ArrowLeftRight, Timer,
  ShieldCheck, AlertCircle,
} from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.round(seconds % 60)
  return `${m}m ${s.toString().padStart(2, '0')}s`
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

  // Resolve restaurant
  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome, slug, estado')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  // Date range
  const now = new Date()
  const startDate = periodo === 'hoje'
    ? startOfDay(now)
    : periodo === '7d'
      ? subDays(now, 7)
      : subDays(now, 30)

  const startIso = startDate.toISOString()

  // Fetch daily_stats for period
  const { data: dailyStats } = await supabase
    .from('daily_stats')
    .select('stat_date, total_chamadas, chamadas_sucesso, chamadas_transferidas, reservas_criadas, duracao_media_segundos')
    .eq('restaurant_id', restaurant.id)
    .gte('stat_date', format(startDate, 'yyyy-MM-dd'))
    .order('stat_date')

  const stats = dailyStats ?? []

  // Aggregate KPIs
  const totalChamadas    = stats.reduce((s, d) => s + (d.total_chamadas ?? 0), 0)
  const chamadasSucesso  = stats.reduce((s, d) => s + (d.chamadas_sucesso ?? 0), 0)
  const chamadasTransf   = stats.reduce((s, d) => s + (d.chamadas_transferidas ?? 0), 0)
  const reservasCriadas  = stats.reduce((s, d) => s + (d.reservas_criadas ?? 0), 0)
  const duracaoMedia     = stats.length
    ? stats.reduce((s, d) => s + (d.duracao_media_segundos ?? 0), 0) / stats.length
    : 0

  // Call type breakdown from calls table
  const { data: callTypes } = await supabase
    .from('calls')
    .select('tipo_chamada')
    .eq('restaurant_id', restaurant.id)
    .gte('call_start_at', startIso)

  const typeCount: Record<string, number> = {}
  for (const c of callTypes ?? []) {
    if (c.tipo_chamada) typeCount[c.tipo_chamada] = (typeCount[c.tipo_chamada] ?? 0) + 1
  }
  const callTypeData = Object.entries(typeCount)
    .map(([tipo, count]) => ({ tipo, count }))
    .sort((a, b) => b.count - a.count)

  // Guarantee tracking (if em_garantia)
  let guarantee = null
  if (restaurant.estado === 'em_garantia') {
    const { data: gt } = await supabase
      .from('v_guarantee_status')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .single()
    guarantee = gt
  }

  const kpis = [
    {
      label: 'Total de Chamadas',
      value: totalChamadas,
      icon: Phone,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
    },
    {
      label: 'Taxa de Sucesso',
      value: formatPct(chamadasSucesso, totalChamadas),
      icon: CheckCircle,
      color: Number(formatPct(chamadasSucesso, totalChamadas).replace('%','')) < 20 ? 'text-red-500' : 'text-emerald-600',
      bg: Number(formatPct(chamadasSucesso, totalChamadas).replace('%','')) < 20 ? 'bg-red-50' : 'bg-emerald-50',
    },
    {
      label: 'Reservas Criadas',
      value: reservasCriadas,
      icon: Calendar,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
    },
    {
      label: 'Taxa de Reservas',
      value: formatPct(reservasCriadas, totalChamadas),
      icon: TrendingUp,
      color: 'text-slate-600',
      bg: 'bg-slate-100',
    },
    {
      label: 'Taxa de Transferência',
      value: formatPct(chamadasTransf, totalChamadas),
      icon: ArrowLeftRight,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
    },
    {
      label: 'Duração Média',
      value: formatDuration(duracaoMedia),
      icon: Timer,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <PeriodFilter active={periodo} />
      </div>

      {/* Guarantee Widget */}
      {guarantee && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-emerald-50 flex items-center justify-center shrink-0">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="text-sm font-semibold text-slate-900">Período de Garantia</p>
                <span className="text-xs text-slate-500">
                  {(guarantee as Record<string, unknown>).dia_efectivo as number} / 30 dias
                </span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-2 mb-2">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all"
                  style={{
                    width: `${Math.min(
                      Math.round(((guarantee as Record<string, unknown>).contagem_actual as number) / ((guarantee as Record<string, unknown>).objetivo as number) * 100),
                      100
                    )}%`
                  }}
                />
              </div>
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>{(guarantee as Record<string, unknown>).contagem_actual as number} pessoas geradas</span>
                <span>Objectivo: {(guarantee as Record<string, unknown>).objetivo as number} pessoas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <div key={i} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className={`w-8 h-8 rounded-lg ${kpi.bg} flex items-center justify-center mb-3`}>
                <Icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <p className="text-xl font-bold text-slate-900 leading-none mb-1">{kpi.value}</p>
              <p className="text-xs text-slate-500">{kpi.label}</p>
            </div>
          )
        })}
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Calls by day */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Chamadas por dia</h2>
          </div>
          <CallsChart data={stats.map(d => ({ stat_date: d.stat_date, total_chamadas: d.total_chamadas }))} />
        </div>

        {/* Call type */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-semibold text-slate-900">Tipo de chamada</h2>
          </div>
          <CallTypeChart data={callTypeData} total={totalChamadas} />
        </div>
      </div>

      {/* Empty state when no data */}
      {totalChamadas === 0 && (
        <div className="bg-white rounded-xl border border-slate-100 p-8 text-center">
          <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mx-auto mb-3">
            <AlertCircle className="w-5 h-5 text-slate-400" />
          </div>
          <p className="text-sm font-medium text-slate-700">Sem chamadas no período seleccionado</p>
          <p className="text-xs text-slate-400 mt-1">Os dados aparecem aqui à medida que o agente atende chamadas.</p>
        </div>
      )}
    </div>
  )
}
