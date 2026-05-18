import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ClientForm } from '@/components/admin/client-form'
import { RestaurantStatusBadge } from '@/components/admin/restaurant-status-badge'
import { StripeActionsPanel } from '@/components/admin/stripe-actions-panel'
import { DeleteClientButton } from '@/components/admin/delete-client-button'
import { formatDate, formatEuro } from '@/lib/utils'
import type { ClientProfile, Restaurant } from '@/types'
import { ChevronLeft, Store, TrendingDown } from 'lucide-react'

export default async function ClienteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  const [clientRes, restaurantsRes, custosRes] = await Promise.all([
    db.from('clients').select('*').eq('id', id).single(),
    db.from('restaurants').select('*').eq('client_id', id).order('ordem', { ascending: true }),
    db.from('v_admin_custos').select('total_minutos, custo_total_eur').eq('client_id', id),
  ])

  if (!clientRes.data) notFound()

  const client = clientRes.data as ClientProfile
  const restaurants = (restaurantsRes.data ?? []) as Restaurant[]
  const allRescindidos = restaurants.length > 0 && restaurants.every(r => r.estado === 'rescindido')

  const custosRows = custosRes.data ?? []
  const custoClienteTotal = custosRows.reduce((sum, r) => sum + Number(r.custo_total_eur ?? 0), 0)
  const minutosClienteTotal = custosRows.reduce((sum, r) => sum + Number(r.total_minutos ?? 0), 0)

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
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        <Link
          href="/admin/clientes"
          className="nc-hover-link-txt"
          style={{
            color: 'var(--text-muted)',
            display: 'flex',
            alignItems: 'center',
            textDecoration: 'none',
            flexShrink: 0,
          }}
        >
          <ChevronLeft style={{ width: '16px', height: '16px' }} />
        </Link>
        <div>
          <h1
            style={{
              fontSize: '1.25rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.02em',
              margin: 0,
            }}
          >
            {client.nome_empresa}
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            NIF {client.nif} · Cliente desde {formatDate(client.criado_em)}
          </p>
        </div>
      </div>

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 300px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left — form */}
        <ClientForm client={client} />

        {/* Right — sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <StripeActionsPanel clientId={client.id} stripeCustomerId={client.stripe_customer_id ?? null} />

          {/* Restaurantes */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderBottom: '1px solid var(--surface-border)',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Store style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
                <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                  Restaurantes
                </h3>
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    background: 'var(--bg-muted)',
                    color: 'var(--text-muted)',
                    padding: '1px 6px',
                    borderRadius: '100px',
                  }}
                >
                  {restaurants.length}
                </span>
              </div>
              <Link
                href="/admin/onboarding/restaurante"
                className="nc-hover-link-txt"
                style={{
                  fontSize: '12px',
                  color: 'var(--text-muted)',
                  textDecoration: 'none',
                }}
              >
                + Adicionar
              </Link>
            </div>
            <div>
              {restaurants.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                  Sem restaurantes
                </div>
              ) : (
                restaurants.map((r, idx) => (
                  <Link
                    key={r.id}
                    href={`/admin/restaurantes/${r.slug}`}
                    className="nc-hover-row"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 16px',
                      borderBottom: idx < restaurants.length - 1 ? '1px solid var(--surface-border)' : 'none',
                      textDecoration: 'none',
                    }}
                  >
                    <div>
                      <p style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', margin: 0 }}>
                        {r.nome}
                      </p>
                      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                        /{r.slug}
                      </p>
                    </div>
                    <RestaurantStatusBadge estado={r.estado} />
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* Custo AI Total do Cliente — apenas admin */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
              <TrendingDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <h3 style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
                Custo AI (admin)
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Total minutos</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  {minutosClienteTotal.toFixed(1)} min
                </span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', borderTop: '1px solid var(--surface-border)', paddingTop: '8px' }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Custo total</span>
                <span style={{ fontWeight: 700, color: '#b91c1c', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '15px' }}>
                  {formatEuro(custoClienteTotal)}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                0,14 €/min · {restaurants.length} restaurante{restaurants.length !== 1 ? 's' : ''}
              </div>
            </div>
          </div>

          {/* Quick info */}
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              padding: '16px',
            }}
          >
            <h3
              style={{
                fontSize: '13px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: '0 0 12px',
              }}
            >
              Informação
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email login</span>
                <span style={{ color: 'var(--text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', marginLeft: '8px', maxWidth: '160px' }}>
                  {client.email_contacto}
                </span>
              </div>
              {client.docusign_envelope_id && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
                  <span style={{ color: 'var(--text-muted)' }}>DocuSign</span>
                  <span
                    style={{
                      color: 'var(--text-secondary)',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      fontSize: '11px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginLeft: '8px',
                      maxWidth: '160px',
                    }}
                  >
                    {client.docusign_envelope_id}
                  </span>
                </div>
              )}
              {client.password_alterada_cliente && (
                <div
                  style={{
                    marginTop: '4px',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: '#b45309',
                    background: 'rgba(255,251,235,0.8)',
                    border: '1px solid #fde68a',
                    borderRadius: '6px',
                    padding: '6px 8px',
                  }}
                >
                  ⚠ Password alterada pelo cliente via self-service
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Danger zone */}
      {allRescindidos && (
        <div
          style={{
            borderTop: '1px solid var(--surface-border)',
            paddingTop: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 12px',
            }}
          >
            Zona de Perigo
          </h3>
          <DeleteClientButton clientId={client.id} clientName={client.nome_empresa} />
        </div>
      )}
    </div>
  )
}
