import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { StatCard } from '@/components/shared/stat-card'
import { RestaurantsTable } from '@/components/admin/restaurants-table'
import { formatEuro } from '@/lib/utils'
import type { AdminSnapshot, AdminRestaurantRow } from '@/types'
import {
  Euro,
  TrendingUp,
  Users,
  Clock,
} from 'lucide-react'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  // Fetch snapshot and restaurants in parallel
  const [snapshotRes, restaurantsRes] = await Promise.all([
    db
      .from('admin_daily_snapshot')
      .select('*')
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    db
      .from('v_admin_restaurants_overview')
      .select('*')
      .order('estado', { ascending: true }),
  ])

  const snapshot = snapshotRes.data as AdminSnapshot | null
  const restaurants = (restaurantsRes.data ?? []) as AdminRestaurantRow[]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-500 mt-0.5">Visão geral de todos os restaurantes</p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Receita Mês Corrente"
          value={snapshot ? formatEuro(snapshot.receita_mes_corrente) : '—'}
          sub="mês actual"
          icon={Euro}
        />
        <StatCard
          label="Receita Mês Anterior"
          value={snapshot ? formatEuro(snapshot.receita_mes_anterior) : '—'}
          sub="mês passado"
          icon={TrendingUp}
        />
        <StatCard
          label="Conversões Mês"
          value={snapshot ? `${snapshot.total_conversoes_mes} pessoas` : '—'}
          sub="geradas pelo agente"
          icon={Users}
        />
        <StatCard
          label="Minutos Mês"
          value={snapshot ? `${Math.round(snapshot.total_minutos_mes)} min` : '—'}
          sub="tempo total de chamadas"
          icon={Clock}
        />
      </div>

      {/* Secondary stats */}
      {snapshot && (
        <div className="flex flex-wrap gap-3">
          <StatPill label="Ativos" value={snapshot.total_restaurantes_ativos} color="green" />
          <StatPill label="Em Garantia" value={snapshot.total_em_garantia} color="blue" />
          <StatPill label="Em Construção" value={snapshot.total_em_construcao} color="slate" />
          <StatPill label="Pausados" value={snapshot.total_pausados} color="amber" />
          <StatPill label="Rescindidos este mês" value={snapshot.total_rescindidos_mes} color="red" />
        </div>
      )}

      {/* Restaurants table */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">Restaurantes</h2>
          <span className="text-xs text-slate-400">{restaurants.length} restaurantes</span>
        </div>
        <RestaurantsTable data={restaurants} />
      </div>
    </div>
  )
}

// Small pill for secondary stats
function StatPill({ label, value, color }: { label: string; value: number; color: string }) {
  const colors: Record<string, string> = {
    green: 'bg-green-50 text-green-700 border-green-200',
    blue:  'bg-blue-50 text-blue-700 border-blue-200',
    slate: 'bg-slate-100 text-slate-600 border-slate-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    red:   'bg-red-50 text-red-600 border-red-200',
  }
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${colors[color] ?? colors.slate}`}>
      <span className="tabular-nums font-bold text-sm">{value}</span>
      <span>{label}</span>
    </div>
  )
}
