import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Zap } from 'lucide-react'

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

const espacoLabel: Record<string, string> = {
  sala: 'Sala', terraco: 'Terraço', esplanada: 'Esplanada',
  sem_preferencia: 'Sem preferência', desconhecido: '—',
}

export default async function UltimaHoraPage({
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
    .from('ultima_hora_requests')
    .select('id, criado_em, cliente_nome, pessoas, espaco_preferido, datetime_solicitado, estado')
    .eq('restaurant_id', rest.id)
    .order('criado_em', { ascending: false })
    .limit(100)

  const requests = data ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {requests.length} pedidos (últimos 100)
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
        {requests.length === 0 ? (
          <EmptyState
            icon={<Zap style={{ width: '40px', height: '40px' }} />}
            title="Sem pedidos de última hora"
            description="Os pedidos aparecem aqui à medida que o agente os recebe."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--surface-border)' }}>
                  {['Data', 'Nome', 'Pessoas', 'Espaço', 'Data/Hora Pedida', 'Estado'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r: Record<string, unknown>, idx) => {
                  const isPendente = r.estado === 'pendente_restaurante'
                  return (
                    <tr
                      key={r.id as string}
                      className={isPendente ? 'nc-data-row-amber' : 'nc-data-row'}
                      style={{ borderBottom: idx < requests.length - 1 ? '1px solid var(--surface-border)' : 'none', transition: 'background 80ms ease' }}
                    >
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(r.criado_em as string)}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                          {(r.cliente_nome as string) ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                          {(r.pessoas as number) ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                          {espacoLabel[r.espaco_preferido as string] ?? '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <span style={{ fontSize: '12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                          {r.datetime_solicitado ? formatDateTime(r.datetime_solicitado as string) : '—'}
                        </span>
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge variant={
                          r.estado === 'aceite' ? 'confirmada'
                          : r.estado === 'rejeitado' ? 'cancelado'
                          : r.estado === 'nao_aplicavel' ? 'neutro'
                          : 'pendente'
                        }>
                          {r.estado === 'aceite' ? 'Aceite'
                            : r.estado === 'rejeitado' ? 'Rejeitado'
                            : r.estado === 'nao_aplicavel' ? 'N/A'
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
