import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { Clock } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const ESTADO_LABELS: Record<string, string> = {
  pendente_restaurante: 'Pendente',
  aceite:               'Aceite',
  rejeitado:            'Rejeitado',
  nao_aplicavel:        'N/A',
}

const ESTADO_STYLE: Record<string, { background: string; color: string }> = {
  pendente_restaurante: { background: 'var(--amber-50)',  color: 'var(--amber-600)' },
  aceite:               { background: 'var(--green-50)',  color: 'var(--green-700, #15803d)' },
  rejeitado:            { background: 'var(--red-50)',    color: 'var(--red-600)' },
  nao_aplicavel:        { background: 'var(--bg-muted)',  color: 'var(--text-secondary)' },
}

const ESPACO_LABELS: Record<string, string> = {
  sala:            'Sala',
  terraco:         'Terraço',
  esplanada:       'Esplanada',
  sem_preferencia: 'Sem pref.',
  desconhecido:    '—',
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

export default async function UltimaHoraPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { periodo = '30d' } = await searchParams

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const startDate = periodo === 'hoje'
    ? startOfDay(new Date())
    : periodo === '7d' ? subDays(new Date(), 7) : subDays(new Date(), 30)

  const db = createAdminClient()
  const { data: pedidos } = await db
    .from('ultima_hora_requests')
    .select('id, criado_em, cliente_nome, pessoas, espaco_preferido, datetime_solicitado, estado')
    .eq('restaurant_id', restaurant.id)
    .gte('criado_em', startDate.toISOString())
    .order('criado_em', { ascending: false })
    .limit(200)

  const rows = pedidos ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Última Hora
          </h1>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
            {rows.length} pedido{rows.length !== 1 ? 's' : ''} no período
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
            <Clock style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem pedidos de última hora no período</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data pedido</th>
                  <th style={thStyle}>Para quando</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Pessoas</th>
                  <th style={thStyle}>Espaço</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p, idx) => {
                  const criadoEm = p.criado_em ? new Date(p.criado_em) : null
                  const dataHoraPedida = (p as Record<string, unknown>).datetime_solicitado
                    ? new Date((p as Record<string, unknown>).datetime_solicitado as string) : null
                  const badge = ESTADO_STYLE[p.estado ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
                  return (
                    <tr
                      key={p.id}
                      className="nc-data-row"
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        transition: 'background 80ms ease',
                      }}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {criadoEm ? format(criadoEm, 'd MMM HH:mm', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {dataHoraPedida ? format(dataHoraPedida, 'd MMM HH:mm', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {p.cliente_nome ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)' }}>
                        {(p as Record<string, unknown>).pessoas as number ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)' }}>
                        {ESPACO_LABELS[p.espaco_preferido ?? ''] ?? p.espaco_preferido ?? '—'}
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
                          {ESTADO_LABELS[p.estado ?? ''] ?? p.estado ?? '—'}
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
            <Clock style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem pedidos de última hora no período</p>
          </div>
        ) : (
          rows.map(p => {
            const dataHoraPedida = (p as Record<string, unknown>).datetime_solicitado
              ? new Date((p as Record<string, unknown>).datetime_solicitado as string) : null
            const badge = ESTADO_STYLE[p.estado ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
            return (
              <div key={p.id} className="nc-mobile-card-item">
                {/* Linha 1: cliente + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {p.cliente_nome ?? '—'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', background: badge.background, color: badge.color, flexShrink: 0 }}>
                    {ESTADO_LABELS[p.estado ?? ''] ?? p.estado ?? '—'}
                  </span>
                </div>
                {/* Linha 2: para quando */}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', margin: '0 0 4px' }}>
                  Para: {dataHoraPedida ? format(dataHoraPedida, "d MMM 'às' HH:mm", { locale: pt }) : '—'}
                </p>
                {/* Linha 3: pessoas + espaço */}
                <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                  {[(p as Record<string, unknown>).pessoas ? `${(p as Record<string, unknown>).pessoas} pess.` : null, ESPACO_LABELS[p.espaco_preferido ?? ''] ?? p.espaco_preferido].filter(Boolean).join(' · ') || '—'}
                </p>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
