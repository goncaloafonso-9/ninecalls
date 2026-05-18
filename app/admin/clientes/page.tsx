import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import Link from 'next/link'
import { formatDate } from '@/lib/utils'
import type { ClientProfile } from '@/types'
import { Building2, ChevronRight } from 'lucide-react'
import { ClientesEmptyAction } from '@/components/admin/clientes-empty-action'

export default async function ClientesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('clients')
    .select('*, restaurants(id)')
    .order('criado_em', { ascending: false })

  const clients = data ?? []

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
          Clientes
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {clients.length} cliente{clients.length !== 1 ? 's' : ''}
        </p>
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
        {clients.length === 0 ? (
          <ClientesEmptyAction />
        ) : (
          clients.map((client: ClientProfile & { restaurants: { id: string }[] }, idx) => (
            <Link
              key={client.id}
              href={`/admin/clientes/${client.id}`}
              className="nc-hover-row"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 20px',
                borderBottom: idx < clients.length - 1 ? '1px solid var(--surface-border)' : 'none',
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
                  <Building2 style={{ width: '16px', height: '16px', color: 'var(--text-muted)' }} />
                </div>
                <div>
                  <p style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                    {client.nome_empresa}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {client.email_contacto} · NIF {client.nif}
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    {client.restaurants?.length ?? 0} restaurante{(client.restaurants?.length ?? 0) !== 1 ? 's' : ''}
                  </p>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                    {formatDate(client.criado_em)}
                  </p>
                </div>
                {client.stripe_customer_id ? (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--green-50)',
                      color: 'var(--green-700)',
                      border: '1px solid var(--green-200, #bbf7d0)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}
                  >
                    Stripe ✓
                  </span>
                ) : (
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 600,
                      background: 'var(--bg-muted)',
                      color: 'var(--text-muted)',
                      border: '1px solid var(--surface-border)',
                      padding: '2px 8px',
                      borderRadius: '100px',
                    }}
                  >
                    Sem Stripe
                  </span>
                )}
                <ChevronRight style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  )
}
