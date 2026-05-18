import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { formatDate } from '@/lib/utils'
import type { Restaurant } from '@/types'
import { Store, ChevronRight } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export default async function RestaurantesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('restaurants')
    .select('*, clients(nome_empresa)')
    .order('estado', { ascending: true })
    .order('nome', { ascending: true })

  const restaurants = data ?? []

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
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
          Restaurantes
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
        </p>
        <div style={{ marginTop: '16px' }}>
          <Link
            href="/admin/onboarding/restaurante"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '13px',
              fontWeight: 500,
              background: 'var(--gray-950)',
              color: '#ffffff',
              padding: '8px 16px',
              borderRadius: '8px',
              textDecoration: 'none',
              transition: 'opacity 150ms ease',
              whiteSpace: 'nowrap',
              fontFamily: 'var(--font-geist), sans-serif',
            }}
          >
            + Novo Restaurante
          </Link>
        </div>
      </div>

      {/* List */}
      <div
        className="animate-in"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {restaurants.length === 0 ? (
          <EmptyState
            icon={<Store style={{ width: '40px', height: '40px' }} />}
            title="Nenhum restaurante criado ainda"
            description="Adiciona o primeiro restaurante para começar."
          />
        ) : (
          restaurants.map((r: Restaurant & { clients: { nome_empresa: string } }, idx) => (
            <Link
              key={r.id}
              href={`/admin/restaurantes/${r.slug}`}
              className="nc-hover-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: idx < restaurants.length - 1 ? '1px solid var(--surface-border)' : 'none',
                textDecoration: 'none',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    background: 'var(--bg-muted)',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <Store style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                    {r.nome}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {r.clients?.nome_empresa} · /{r.slug}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <RestaurantStatusBadge estado={r.estado} />
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {formatDate(r.criado_em)}
                </span>
                <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--text-disabled, var(--text-muted))' }} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
