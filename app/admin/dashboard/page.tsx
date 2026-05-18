import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { StatusBadge } from '@/components/ui/status-badge'
import { RestaurantsTable } from '@/components/admin/restaurants-table'
import { DashboardKpiSection } from '@/components/admin/dashboard-kpi-section'
import type { AdminRestaurantRow } from '@/types'

export default async function AdminDashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  const [statusRes, restaurantsRes] = await Promise.all([
    db.from('restaurants').select('estado'),
    db
      .from('v_admin_restaurants_overview')
      .select('*')
      .order('estado', { ascending: true }),
  ])

  const restaurants = (restaurantsRes.data ?? []) as AdminRestaurantRow[]
  const allRestaurants = statusRes.data ?? []

  const total_restaurantes_ativos = allRestaurants.filter(r => r.estado === 'ativo').length
  const total_em_garantia = allRestaurants.filter(r => r.estado === 'em_garantia').length
  const total_em_construcao = allRestaurants.filter(r => r.estado === 'em_construcao').length
  const total_pausados = allRestaurants.filter(r => r.estado === 'pausado').length
  const total_rescindidos = allRestaurants.filter(r => r.estado === 'rescindido').length

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
          {(user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'Nine Calls Admin'}
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Visão geral de todos os restaurantes
        </p>
      </div>

      {/* ── KPI Cards com modo temporal ── */}
      <DashboardKpiSection />

      {/* ── Secondary stats ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        <StatusBadge variant="ativo">{total_restaurantes_ativos} Ativos</StatusBadge>
        <StatusBadge variant="em_garantia">{total_em_garantia} Em Garantia</StatusBadge>
        <StatusBadge variant="em_construcao">{total_em_construcao} Em Construção</StatusBadge>
        <StatusBadge variant="pausado">{total_pausados} Pausados</StatusBadge>
        {total_rescindidos > 0 && (
          <StatusBadge variant="rescindido">{total_rescindidos} Rescindidos</StatusBadge>
        )}
      </div>

      {/* ── Restaurants table ── */}
      <div>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
          }}
        >
          <h2
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            Restaurantes
          </h2>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            {restaurants.length} restaurantes
          </span>
        </div>
        <RestaurantsTable data={restaurants} />
      </div>
    </div>
  )
}
