import { createAdminClient } from '@/lib/supabase/admin'
import { agentDebugLog } from '@/lib/debug-agent-log'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { Calendar } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const ESPACO_LABELS: Record<string, string> = {
  sala:            'Sala',
  terraco:         'Terraço',
  esplanada:       'Esplanada',
  sem_preferencia: 'Sem pref.',
  desconhecido:    '—',
}

const SERVICO_LABELS: Record<string, string> = {
  almoco:       'Almoço',
  jantar:       'Jantar',
  desconhecido: '—',
}

const ESTADO_STYLE: Record<string, { background: string; color: string; label: string }> = {
  confirmada: { background: 'var(--green-50)',  color: 'var(--green-700, #15803d)', label: 'Confirmada' },
  no_show:    { background: 'var(--red-50)',    color: 'var(--red-600)',             label: 'No-Show'    },
  cancelado:  { background: 'var(--bg-muted)',  color: 'var(--text-secondary)',      label: 'Cancelado'  },
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

export default async function ReservasPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { periodo = '30d' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  // #region agent log
  await agentDebugLog({
    hypothesisId: 'C',
    location: 'reservas/page.tsx:after-getUser',
    message: 'reservas entry',
    data: { slug, periodo, role: user?.app_metadata?.role ?? null, ok: !!(user && user.app_metadata?.role === 'client') },
  })
  // #endregion
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant, error: restErr } = await supabase
    .from('restaurants')
    .select('id, nome')
    .eq('slug', slug)
    .single()

  // #region agent log
  await agentDebugLog({
    hypothesisId: 'B',
    location: 'reservas/page.tsx:after-restaurant',
    message: 'restaurant by slug',
    data: { slug, found: !!restaurant, errCode: restErr?.code ?? null },
  })
  // #endregion

  if (!restaurant) notFound()

  const startDate = periodo === 'hoje'
    ? startOfDay(new Date())
    : periodo === '7d' ? subDays(new Date(), 7) : subDays(new Date(), 30)

  const db = createAdminClient()
  const { data: bookings, error: bookingsErr } = await db
    .from('bookings')
    .select('id, booking_datetime, cliente_nome, cliente_phone, number_of_people, espaco, servico, estado, confirmado_em')
    .eq('restaurant_id', restaurant.id)
    .gte('booking_datetime', startDate.toISOString())
    .order('booking_datetime', { ascending: false })
    .limit(200)

  // #region agent log
  await agentDebugLog({
    hypothesisId: 'A',
    location: 'reservas/page.tsx:after-bookings',
    message: 'bookings query',
    data: { rowCount: bookings?.length ?? 0, errCode: bookingsErr?.code ?? null, startIso: startDate.toISOString() },
  })
  // #endregion

  const rows = bookings ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Reservas
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {rows.length} reserva{rows.length !== 1 ? 's' : ''} no período
          </p>
        </div>
        <PeriodFilter active={periodo} />
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
            <Calendar style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem reservas no período seleccionado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Hora</th>
                  <th style={thStyle}>Nome</th>
                  <th style={thStyle}>Pessoas</th>
                  <th style={thStyle}>Espaço</th>
                  <th style={thStyle}>Serviço</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((b, idx) => {
                  const dt = b.booking_datetime ? new Date(b.booking_datetime) : null
                  const isInactive = b.estado === 'no_show' || b.estado === 'cancelado'
                  const badge = ESTADO_STYLE[b.estado ?? ''] ?? ESTADO_STYLE.confirmada
                  return (
                    <tr
                      key={b.id}
                      className="nc-data-row"
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        opacity: isInactive ? 0.6 : 1,
                        transition: 'background 80ms ease',
                      }}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {dt ? format(dt, 'd MMM yyyy', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {dt ? format(dt, 'HH:mm') : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {b.cliente_nome ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                        {(b as Record<string, unknown>).number_of_people as number ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                        {ESPACO_LABELS[b.espaco ?? ''] ?? b.espaco ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                        {SERVICO_LABELS[b.servico ?? ''] ?? b.servico ?? '—'}
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
                          {badge.label}
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
            <Calendar style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem reservas no período seleccionado</p>
          </div>
        ) : (
          rows.map(b => {
            const dt = b.booking_datetime ? new Date(b.booking_datetime) : null
            const isInactive = b.estado === 'no_show' || b.estado === 'cancelado'
            const badge = ESTADO_STYLE[b.estado ?? ''] ?? ESTADO_STYLE.confirmada
            return (
              <div key={b.id} className="nc-mobile-card-item" style={{ opacity: isInactive ? 0.7 : 1 }}>
                {/* Linha 1: nome + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {b.cliente_nome ?? '—'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', background: badge.background, color: badge.color, flexShrink: 0 }}>
                    {badge.label}
                  </span>
                </div>
                {/* Linha 2: data + hora + pessoas */}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', margin: '0 0 4px' }}>
                  {dt ? format(dt, "d MMM yyyy 'às' HH:mm", { locale: pt }) : '—'}
                  {(b as Record<string, unknown>).number_of_people
                    ? ` · ${(b as Record<string, unknown>).number_of_people} pess.`
                    : ''}
                </p>
                {/* Linha 3: espaço + serviço */}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  {[ESPACO_LABELS[b.espaco ?? ''] ?? b.espaco, SERVICO_LABELS[b.servico ?? ''] ?? b.servico].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
