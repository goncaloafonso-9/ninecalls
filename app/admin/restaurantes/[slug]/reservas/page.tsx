import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar } from 'lucide-react'

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
const servicoLabel: Record<string, string> = {
  almoco: 'Almoço', jantar: 'Jantar', desconhecido: '—',
}

export default async function ReservasPage({
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
    .from('bookings')
    .select('id, booking_datetime, cliente_nome, cliente_phone, number_of_people, espaco, servico, estado, confirmado_em')
    .eq('restaurant_id', rest.id)
    .order('booking_datetime', { ascending: false })
    .limit(100)

  const bookings = data ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: 0 }}>
        {bookings.length} reservas (últimas 100)
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
        {bookings.length === 0 ? (
          <EmptyState
            icon={<Calendar style={{ width: '40px', height: '40px' }} />}
            title="Sem reservas registadas"
            description="As reservas aparecem aqui à medida que o agente as cria."
          />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--surface-border)' }}>
                  {['Data Reserva', 'Nome', 'Telefone', 'Pessoas', 'Espaço', 'Serviço', 'Estado', 'Criado em'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: Record<string, unknown>, idx) => (
                  <tr
                    key={b.id as string}
                    className="nc-data-row"
                    style={{ borderBottom: idx < bookings.length - 1 ? '1px solid var(--surface-border)' : 'none', transition: 'background 80ms ease' }}
                  >
                    <td style={tdStyle}>
                      <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                        {formatDateTime(b.booking_datetime as string)}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                        {(b.cliente_nome as string) ?? '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {(b.cliente_phone as string) ?? '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontWeight: 500 }}>
                        {(b.number_of_people as number) ?? '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {espacoLabel[b.espaco as string] ?? '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                        {servicoLabel[b.servico as string] ?? '—'}
                      </span>
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge variant={b.estado === 'no_show' ? 'no_show' : 'confirmada'}>
                        {b.estado === 'no_show' ? 'No-Show' : 'Confirmada'}
                      </StatusBadge>
                    </td>
                    <td style={tdStyle}>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatDate(b.confirmado_em as string)}
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
