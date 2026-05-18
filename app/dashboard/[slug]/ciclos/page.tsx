import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Receipt } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { StripePortalButton } from '@/components/dashboard/stripe-portal-button'
import { GoogleDriveButton } from '@/components/dashboard/google-drive-button'

interface Props {
  params: Promise<{ slug: string }>
}

const PAYMENT_LABELS: Record<string, string> = {
  pendente:   'Pendente',
  pago:       'Pago',
  em_atraso:  'Em Atraso',
}

const PAYMENT_STYLE: Record<string, { background: string; color: string }> = {
  pendente:   { background: 'var(--amber-50)', color: 'var(--amber-600)' },
  pago:       { background: 'var(--green-50)', color: 'var(--green-700, #15803d)' },
  em_atraso:  { background: 'var(--red-50)',   color: 'var(--red-600)' },
}

const thStyle: React.CSSProperties = {
  textAlign: 'left',
  padding: '10px 16px',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
  background: 'var(--bg-subtle)',
  borderBottom: '1px solid var(--surface-border)',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}

export default async function CiclosPage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome, google_drive_folder_link')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const [ciclosRes, clientRes] = await Promise.all([
    supabase
      .from('billing_cycles')
      .select('id, numero_ciclo, data_inicio, data_fim_prevista, estado, estado_pagamento, valor_total, total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados, numero_fatura_at')
      .eq('restaurant_id', restaurant.id)
      .order('numero_ciclo', { ascending: false }),
    supabase
      .from('clients')
      .select('stripe_customer_id')
      .eq('auth_user_id', user.id)
      .single(),
  ])

  const rows = ciclosRes.data ?? []
  const hasStripe = !!(clientRes.data?.stripe_customer_id)

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Ciclos de Faturação
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {rows.length} ciclo{rows.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'nowrap', flexShrink: 0 }}>
          {restaurant.google_drive_folder_link && <GoogleDriveButton driveLink={restaurant.google_drive_folder_link} />}
          {hasStripe && <StripePortalButton slug={slug} />}
        </div>
      </div>

      {/* ── Vista desktop: tabela ── */}
      <div className="nc-table-desktop" style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {rows.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Receipt style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem ciclos de faturação</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Ciclo</th>
                  <th style={thStyle}>Período</th>
                  <th style={thStyle}>Chamadas</th>
                  <th style={thStyle}>Pessoas</th>
                  <th style={thStyle}>Takeaways</th>
                  <th style={thStyle}>Valor</th>
                  <th style={thStyle}>Pagamento</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, idx) => {
                  const inicio = c.data_inicio ? new Date(c.data_inicio) : null
                  const fim    = c.data_fim_prevista ? new Date(c.data_fim_prevista) : null
                  const totalPessoas = (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0)
                  const badge = PAYMENT_STYLE[c.estado_pagamento ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
                  return (
                    <tr
                      key={c.id}
                      className="nc-data-row"
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        transition: 'background 80ms ease',
                      }}
                    >
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, color: 'var(--text-primary)' }}>#{c.numero_ciclo}</span>
                          {c.numero_ciclo === 0 && (
                            <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'var(--green-50)', color: 'var(--green-700, #15803d)' }}>
                              Garantia
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {inicio ? format(inicio, 'd MMM', { locale: pt }) : '—'}
                        {' → '}
                        {fim ? format(fim, 'd MMM yyyy', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>—</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{totalPessoas}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{c.total_takeaways_confirmados ?? 0}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 600 }}>
                        {c.valor_total != null ? formatEuro(Number(c.valor_total)) : '—'}
                      </td>
                      <td style={tdStyle}>
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '2px 8px',
                          borderRadius: '100px',
                          whiteSpace: 'nowrap',
                          background: badge.background,
                          color: badge.color,
                        }}>
                          {PAYMENT_LABELS[c.estado_pagamento ?? ''] ?? c.estado_pagamento ?? '—'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Vista mobile: cards ── */}
      <div className="nc-mobile-card">
        {rows.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Receipt style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem ciclos de faturação</p>
          </div>
        ) : (
          rows.map(c => {
            const inicio = c.data_inicio ? new Date(c.data_inicio) : null
            const fim    = c.data_fim_prevista ? new Date(c.data_fim_prevista) : null
            const totalPessoas = (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0)
            const badge = PAYMENT_STYLE[c.estado_pagamento ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
            return (
              <div key={c.id} className="nc-mobile-card-item">
                {/* Linha 1: ciclo + garantia + badge pagamento */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: 'var(--text-primary)' }}>
                    Ciclo #{c.numero_ciclo}
                  </span>
                  {c.numero_ciclo === 0 && (
                    <span style={{ padding: '2px 6px', borderRadius: '4px', fontSize: '10px', fontWeight: 600, background: 'var(--green-50)', color: 'var(--green-700, #15803d)' }}>
                      Garantia
                    </span>
                  )}
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', background: badge.background, color: badge.color, marginLeft: 'auto' }}>
                    {PAYMENT_LABELS[c.estado_pagamento ?? ''] ?? c.estado_pagamento ?? '—'}
                  </span>
                </div>
                {/* Linha 2: período */}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', margin: '0 0 6px' }}>
                  {inicio ? format(inicio, 'd MMM', { locale: pt }) : '—'} → {fim ? format(fim, 'd MMM yyyy', { locale: pt }) : '—'}
                </p>
                {/* Linha 3: stats + valor */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {totalPessoas} pess.
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {c.total_takeaways_confirmados ?? 0} tkaways
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', marginLeft: 'auto' }}>
                    {c.valor_total != null ? formatEuro(Number(c.valor_total)) : '—'}
                  </span>
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
