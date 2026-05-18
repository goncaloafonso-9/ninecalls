import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Users } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
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


export default async function ClientesPage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const db = createAdminClient()
  const { data: customers } = await db
    .from('v_customers_by_restaurant')
    .select('id, first_name, phone, total_chamadas, total_reservas, total_takeaways, total_mesas_ultima_hora, ultima_interacao')
    .eq('restaurant_id', restaurant.id)
    .order('ultima_interacao', { ascending: false })
    .limit(200)

  const rows = customers ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
          Clientes
        </h1>
        <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          {rows.length} cliente{rows.length !== 1 ? 's' : ''} identificado{rows.length !== 1 ? 's' : ''}
        </p>
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
            <Users style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem clientes registados</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Telefone</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Chamadas</th>
                  <th style={thStyle}>Reservas</th>
                  <th style={thStyle}>Takeaways</th>
                  <th style={thStyle}>Últ. Hora</th>
                  <th style={thStyle}>Última interacção</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((c, idx) => {
                  const ultimaInteracao = c.ultima_interacao ? new Date(c.ultima_interacao) : null
                  return (
                    <tr
                      key={c.id}
                      className="nc-data-row"
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        transition: 'background 80ms ease',
                      }}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {c.phone ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {c.first_name ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{c.total_chamadas ?? 0}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{(c.total_reservas as number) ?? 0}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{(c.total_takeaways as number) ?? 0}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>{(c.total_mesas_ultima_hora as number) ?? 0}</td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {ultimaInteracao ? format(ultimaInteracao, 'd MMM yyyy', { locale: pt }) : '—'}
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
            <Users style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem clientes registados</p>
          </div>
        ) : (
          rows.map(c => {
            const ultimaInteracao = c.ultima_interacao ? new Date(c.ultima_interacao) : null
            return (
              <div key={c.id} className="nc-mobile-card-item">
                {/* Linha 1: nome + telefone */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {c.first_name ?? '—'}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    {c.phone ?? '—'}
                  </span>
                </div>
                {/* Linha 2: stats */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    📞 {c.total_chamadas ?? 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    📅 {(c.total_reservas as number) ?? 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    🛍 {(c.total_takeaways as number) ?? 0}
                  </span>
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', marginLeft: 'auto' }}>
                    {ultimaInteracao ? format(ultimaInteracao, 'd MMM', { locale: pt }) : '—'}
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
