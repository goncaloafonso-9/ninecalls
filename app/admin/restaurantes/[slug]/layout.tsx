import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { RestaurantTabNav } from '@/components/admin/restaurant-tab-nav'
import { ChevronLeft } from 'lucide-react'
import type { Restaurant, ClientProfile } from '@/types'

export default async function RestaurantSlugLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('*, clients(id, nome_empresa)')
    .eq('slug', slug)
    .single()

  if (!data) notFound()

  const restaurant = data as Restaurant & { clients: Pick<ClientProfile, 'id' | 'nome_empresa'> }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
      {/* Page header */}
      <div
        style={{
          background: 'var(--surface-1)',
          borderBottom: '1px solid var(--surface-border)',
          padding: '16px 24px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
          <Link
            href="/admin/restaurantes"
            className="nc-hover-link-txt"
            style={{
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
            }}
          >
            <ChevronLeft style={{ width: '16px', height: '16px' }} />
          </Link>
          <h1
            style={{
              fontSize: '15px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
            }}
          >
            {restaurant.nome}
          </h1>
          <RestaurantStatusBadge estado={restaurant.estado} />
        </div>
        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, paddingLeft: '26px' }}>
          <Link
            href={`/admin/clientes/${restaurant.clients.id}`}
            className="nc-hover-link-txt"
            style={{
              color: 'var(--text-muted)',
              textDecoration: 'none',
            }}
          >
            {restaurant.clients.nome_empresa}
          </Link>
          {' '}· /{restaurant.slug}
        </p>
      </div>

      {/* Tab navigation */}
      <RestaurantTabNav slug={slug} />

      {/* Tab content */}
      <div style={{ flex: 1 }}>
        {children}
      </div>
    </div>
  )
}
