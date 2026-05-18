import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { Users } from 'lucide-react'

export const dynamic = 'force-dynamic'
import { EmptyState } from '@/components/ui/empty-state'

const thStyle: React.CSSProperties = {
  padding: '10px 16px',
  textAlign: 'left',
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.07em',
  color: 'var(--text-muted)',
  whiteSpace: 'nowrap',
}

const tdStyle: React.CSSProperties = {
  padding: '12px 16px',
  verticalAlign: 'middle',
}

const numStyle: React.CSSProperties = {
  fontSize: '13px',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-geist-mono), monospace',
  textAlign: 'center' as const,
  display: 'block',
}

export default async function RestauranteClientesPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data: rest } = await db.from('restaurants').select('id').eq('slug', slug).single()
  if (!rest) notFound()

  const { data } = await db
    .from('v_customers_by_restaurant')
    .select('id, first_name, phone, total_chamadas, total_reservas, total_takeaways, total_mesas_ultima_hora, ultima_interacao')
    .eq('restaurant_id', rest.id)
    .order('ultima_interacao', { ascending: false })
    .limit(200)

  const customers = data ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {customers.length} clientes
      </p>

      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '16px',
          overflow: 'hidden',
        }}
      >
        {customers.length === 0 ? (
          <EmptyState
            icon={<Users style={{ width: '40px', height: '40px' }} />}
            title="Sem clientes registados"
            description="Os clientes aparecem aqui à medida que interagem com o agente."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--surface-border)' }}>
                  {['Nome', 'Telefone', 'Chamadas', 'Reservas', 'Takeaways', 'Últ. Hora', 'Última Interacção'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c: Record<string, unknown>, idx) => (
                  <tr
                    key={c.id as string}
                    className="nc-data-row"
                    style={{ borderBottom: idx < customers.length - 1 ? '1px solid var(--surface-border)' : 'none', transition: 'background 80ms ease' }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontSize: '14px', fontWeight: 500, color: 'var(--text-primary)' }}>
                        {(c.first_name as string) ?? <span style={{ color: 'var(--text-muted)', fontWeight: 400, fontSize: '13px' }}>Desconhecido</span>}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {(c.phone as string) ?? '—'}
                      </span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={numStyle}>{(c.total_chamadas as number) ?? 0}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={numStyle}>{(c.total_reservas as number) ?? 0}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={numStyle}>{(c.total_takeaways as number) ?? 0}</span>
                    </td>
                    <td style={{ ...tdStyle, textAlign: 'center' }}>
                      <span style={numStyle}>{(c.total_mesas_ultima_hora as number) ?? 0}</span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {c.ultima_interacao ? formatDateTime(c.ultima_interacao as string) : '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
