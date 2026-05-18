'use client'

import { useState } from 'react'
import { RowDetailModal } from '@/components/ui/row-detail-modal'

const tipoLabel: Record<string, string> = {
  agendamento:    'Reserva',
  reagendamento:  'Reagendamento',
  takeaway:       'Takeaway',
  ultima_hora:    'Última Hora',
  apoio:          'Apoio',
  transferencia:  'Transferência',
  spam_hangup:    'Spam/Hangup',
}

type TipoBadgeStyle = { background: string; color: string; border: string }
const tipoBadgeStyle: Record<string, TipoBadgeStyle> = {
  agendamento:   { background: 'var(--blue-50)',  color: 'var(--blue-700, #1d4ed8)',  border: '1px solid var(--blue-200, #bfdbfe)' },
  reagendamento: { background: '#eff6ff',          color: '#1e40af',                   border: '1px solid #bfdbfe' },
  takeaway:      { background: '#faf5ff',          color: '#6d28d9',                   border: '1px solid #ddd6fe' },
  ultima_hora:   { background: '#fff7ed',          color: '#c2410c',                   border: '1px solid #fed7aa' },
  apoio:         { background: 'var(--bg-muted)',  color: 'var(--text-secondary)',      border: '1px solid var(--surface-border)' },
  transferencia: { background: 'var(--bg-muted)',  color: 'var(--text-secondary)',      border: '1px solid var(--surface-border)' },
  spam_hangup:   { background: 'var(--red-50)',    color: 'var(--red-600)',             border: '1px solid var(--red-200, #fecaca)' },
}

const sentimentoLabel: Record<string, string> = {
  positive: 'Positivo',
  neutral:  'Neutro',
  negative: 'Negativo',
}

const sentimentoStyle: Record<string, { background: string; color: string }> = {
  positive: { background: 'var(--green-50, #f0fdf4)', color: 'var(--green-700, #15803d)' },
  neutral:  { background: 'var(--bg-muted)',           color: 'var(--text-secondary)' },
  negative: { background: 'var(--red-50)',             color: 'var(--red-600)' },
}

function formatDuration(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}m${s.toString().padStart(2, '0')}s`
}

function formatDateTime(iso: string | null) {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleString('pt-PT', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

type Call = Record<string, unknown>

interface Props {
  calls: Call[]
}

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

export function ChamadasAdminTable({ calls }: Props) {
  const [selected, setSelected] = useState<Call | null>(null)

  const modalFields = selected ? (() => {
    const tipo = selected.tipo_chamada as string
    const sentiment = selected.user_sentiment as string
    const badge = tipoBadgeStyle[tipo]
    return [
      { label: 'Data / Hora', value: formatDateTime(selected.criado_em as string) },
      { label: 'Duração', value: formatDuration(selected.duration_seconds as number | null) },
      {
        label: 'Tipo', value: tipo ? (
          <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', ...(badge ?? { background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }) }}>
            {tipoLabel[tipo] ?? tipo}
          </span>
        ) : '—',
      },
      {
        label: 'Sentimento', value: sentiment && sentimentoLabel[sentiment] ? (
          <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', ...sentimentoStyle[sentiment] }}>
            {sentimentoLabel[sentiment]}
          </span>
        ) : '—',
      },
      { label: 'Língua', value: (selected.lingua_detectada as string)?.toUpperCase() ?? '—' },
      { label: 'Telefone', value: (selected.caller_phone as string) ?? '—' },
      { label: 'Nome do cliente', value: (selected.nome_cliente as string) ?? '—' },
      { label: 'Resumo', value: (selected.call_summary as string) ?? '—' },
    ]
  })() : []

  return (
    <>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: 'var(--bg-subtle)', borderBottom: '1px solid var(--surface-border)' }}>
              {([
                { label: 'Data/Hora', hide: false },
                { label: 'Duração', hide: true },
                { label: 'Telefone', hide: false },
                { label: 'Nome', hide: false },
                { label: 'Tipo', hide: false },
                { label: 'Sent.', hide: true },
                { label: 'Língua', hide: true },
                { label: 'Resumo', hide: true },
              ] as { label: string; hide: boolean }[]).map(h => (
                <th key={h.label} className={h.hide ? 'nc-col-hide-mobile' : undefined} style={thStyle}>{h.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {calls.map((call, idx) => {
              const tipo = call.tipo_chamada as string
              const badge = tipoBadgeStyle[tipo]
              return (
                <tr
                  key={call.id as string}
                  onClick={() => setSelected(call)}
                  style={{
                    borderBottom: idx < calls.length - 1 ? '1px solid var(--surface-border)' : 'none',
                    transition: 'background 80ms ease',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  <td style={tdStyle}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', whiteSpace: 'nowrap' }}>
                      {formatDateTime(call.criado_em as string)}
                    </span>
                  </td>
                  <td className="nc-col-hide-mobile" style={tdStyle}>
                    <span style={{ fontSize: '12px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                      {formatDuration(call.duration_seconds as number | null)}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                      {(call.caller_phone as string) ?? '—'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: '13px', color: 'var(--text-primary)' }}>
                      {(call.nome_cliente as string) ?? '—'}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {tipo ? (
                      <span style={{ fontSize: '11px', fontWeight: 600, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', ...(badge ?? { background: 'var(--bg-muted)', color: 'var(--text-muted)', border: '1px solid var(--surface-border)' }) }}>
                        {tipoLabel[tipo] ?? tipo}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>—</span>}
                  </td>
                  <td className="nc-col-hide-mobile" style={tdStyle}>
                    {call.user_sentiment && sentimentoLabel[call.user_sentiment as string] ? (
                      <span style={{ fontSize: '11px', fontWeight: 500, padding: '2px 8px', borderRadius: '100px', whiteSpace: 'nowrap', ...sentimentoStyle[call.user_sentiment as string] }}>
                        {sentimentoLabel[call.user_sentiment as string]}
                      </span>
                    ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                  </td>
                  <td className="nc-col-hide-mobile" style={tdStyle}>
                    <span style={{ fontSize: '11px', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {(call.lingua_detectada as string) ?? '—'}
                    </span>
                  </td>
                  <td className="nc-col-hide-mobile" style={{ ...tdStyle, maxWidth: '260px' }}>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(call.call_summary as string) ?? '—'}
                    </p>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <RowDetailModal
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Detalhe da Chamada"
        subtitle={selected ? formatDateTime(selected.criado_em as string) : undefined}
        fields={modalFields}
      />
    </>
  )
}
