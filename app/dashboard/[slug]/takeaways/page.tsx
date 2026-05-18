import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { ShoppingBag } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const ESTADO_LABELS: Record<string, string> = {
  pendente_restaurante: 'Pendente',
  confirmado:           'Confirmado',
  rejeitado:            'Rejeitado',
}

const ESTADO_STYLE: Record<string, { background: string; color: string }> = {
  pendente_restaurante: { background: 'var(--amber-50)',  color: 'var(--amber-600)' },
  confirmado:           { background: 'var(--green-50)',  color: 'var(--green-700, #15803d)' },
  rejeitado:            { background: 'var(--red-50)',    color: 'var(--red-600)' },
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

export default async function TakeawaysPage({ params, searchParams }: Props) {
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
  const { data: takeaways } = await db
    .from('v_takeaways_enriched')
    .select('id, criado_em, cliente_nome, cliente_phone, pickup_time, items, estado')
    .eq('restaurant_id', restaurant.id)
    .gte('criado_em', startDate.toISOString())
    .order('criado_em', { ascending: false })
    .limit(200)

  const rows = takeaways ?? []

  return (
    <div style={{ padding: 'var(--page-padding-y) var(--page-padding-x)', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0, letterSpacing: '-0.02em' }}>
            Takeaways
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
            <ShoppingBag style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem takeaways no período seleccionado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data pedido</th>
                  <th style={thStyle}>Levantamento</th>
                  <th style={thStyle}>Cliente</th>
                  <th style={thStyle}>Items</th>
                  <th style={thStyle}>Estado</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((t, idx) => {
                  const criadoEm = t.criado_em ? new Date(t.criado_em) : null
                  const horaLevantamento = (t as Record<string, unknown>).pickup_time
                    ? new Date((t as Record<string, unknown>).pickup_time as string) : null
                  const badge = ESTADO_STYLE[t.estado ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
                  return (
                    <tr
                      key={t.id}
                      className="nc-data-row"
                      style={{
                        borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        transition: 'background 80ms ease',
                      }}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {criadoEm ? format(criadoEm, 'd MMM HH:mm', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {horaLevantamento ? format(horaLevantamento, 'HH:mm') : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-primary)', fontWeight: 500 }}>
                        {t.cliente_nome ?? '—'}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '220px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {(t as Record<string, unknown>).items as string ?? '—'}
                        </p>
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
                          {ESTADO_LABELS[t.estado ?? ''] ?? t.estado ?? '—'}
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
            <ShoppingBag style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem takeaways no período seleccionado</p>
          </div>
        ) : (
          rows.map(t => {
            const criadoEm = t.criado_em ? new Date(t.criado_em) : null
            const horaLevantamento = (t as Record<string, unknown>).pickup_time
              ? new Date((t as Record<string, unknown>).pickup_time as string) : null
            const badge = ESTADO_STYLE[t.estado ?? ''] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }
            return (
              <div key={t.id} className="nc-mobile-card-item">
                {/* Linha 1: cliente + badge */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px', marginBottom: '6px' }}>
                  <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                    {t.cliente_nome ?? '—'}
                  </span>
                  <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', background: badge.background, color: badge.color, flexShrink: 0 }}>
                    {ESTADO_LABELS[t.estado ?? ''] ?? t.estado ?? '—'}
                  </span>
                </div>
                {/* Linha 2: levantamento */}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', margin: '0 0 4px' }}>
                  Levantamento: {horaLevantamento ? format(horaLevantamento, "d MMM 'às' HH:mm", { locale: pt }) : '—'}
                </p>
                {/* Linha 3: items */}
                {(t as Record<string, unknown>).items ? (
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {(t as Record<string, unknown>).items as string}
                  </p>
                ) : null}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
