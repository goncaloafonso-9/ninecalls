import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'

export const dynamic = 'force-dynamic'
import { EmptyState } from '@/components/ui/empty-state'
import { StatusBadge } from '@/components/ui/status-badge'

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

export default async function TakeawaysPage({
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
    .from('v_takeaways_enriched')
    .select('id, criado_em, cliente_nome, cliente_phone, pickup_time, items, estado, expira_em')
    .eq('restaurant_id', rest.id)
    .order('criado_em', { ascending: false })
    .limit(100)

  const takeaways = data ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {takeaways.length} takeaways (últimos 100)
      </p>

      <div
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        {takeaways.length === 0 ? (
          <EmptyState
            icon={<ShoppingBag style={{ width: '40px', height: '40px' }} />}
            title="Sem takeaways registados"
            description="Os takeaways aparecem aqui à medida que o agente os cria."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--surface-border)' }}>
                  {['Data', 'Nome', 'Telefone', 'Hora Levant.', 'Pedido', 'Estado'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {takeaways.map((t: Record<string, unknown>, idx) => {
                  const isPendente = t.estado === 'pendente_restaurante'
                  return (
                    <tr
                      key={t.id as string}
                      className={isPendente ? 'nc-data-row-amber' : 'nc-data-row'}
                      style={{ borderBottom: idx < takeaways.length - 1 ? '1px solid var(--surface-border)' : 'none', transition: 'background 80ms ease' }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(t.criado_em as string)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {(t.cliente_nome as string) ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                          {(t.cliente_phone as string) ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {t.pickup_time ? formatDateTime(t.pickup_time as string) : '—'}
                        </span>
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '240px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(t.items as string) ?? '—'}
                        </p>
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge variant={
                          t.estado === 'confirmado' ? 'confirmada'
                          : t.estado === 'rejeitado' ? 'cancelado'
                          : 'pendente'
                        }>
                          {t.estado === 'confirmado' ? 'Confirmado'
                            : t.estado === 'rejeitado' ? 'Rejeitado'
                            : 'Pendente'}
                        </StatusBadge>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
