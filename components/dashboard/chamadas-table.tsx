'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Phone, FileText, X } from 'lucide-react'
import { RowDetailModal } from '@/components/ui/row-detail-modal'

const TIPO_LABELS: Record<string, string> = {
  agendamento:   'Agendamento',
  takeaway:      'Takeaway',
  ultima_hora:   'Última Hora',
  apoio:         'Apoio',
  transferencia: 'Transferência',
  spam_hangup:   'Spam',
}

const TIPO_CSS_COLORS: Record<string, { background: string; color: string }> = {
  agendamento:   { background: 'var(--green-50)',  color: 'var(--green-700, #15803d)' },
  takeaway:      { background: 'var(--blue-50)',   color: 'var(--blue-700)' },
  ultima_hora:   { background: 'var(--amber-50)',  color: 'var(--amber-600)' },
  apoio:         { background: 'var(--bg-muted)',  color: 'var(--text-secondary)' },
  transferencia: { background: '#faf5ff',          color: '#6d28d9' },
  spam_hangup:   { background: 'var(--red-50)',    color: 'var(--red-600)' },
}

const SENTIMENTO_LABEL: Record<string, string> = {
  positive: 'Positivo',
  neutral:  'Neutro',
  negative: 'Negativo',
}

const SENTIMENTO_STYLE: Record<string, { background: string; color: string }> = {
  positive: { background: 'var(--green-50, #f0fdf4)',  color: 'var(--green-700, #15803d)' },
  neutral:  { background: 'var(--bg-muted, #f1f3f5)',  color: 'var(--text-secondary, #4b5563)' },
  negative: { background: 'var(--red-50, #fef2f2)',    color: 'var(--red-600, #dc2626)' },
}

interface Call {
  id: string
  criado_em: string | null
  duration_seconds: number | null
  tipo_chamada: string | null
  lingua_detectada: string | null
  user_sentiment: string | null
  nome_cliente: string | null
  caller_phone: string | null
  call_summary: string | null
}

function TypeBadge({ tipo }: { tipo: string }) {
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 600,
      padding: '2px 8px',
      borderRadius: '100px',
      whiteSpace: 'nowrap',
      ...(TIPO_CSS_COLORS[tipo] ?? { background: 'var(--bg-muted)', color: 'var(--text-secondary)' }),
    }}>
      {TIPO_LABELS[tipo] ?? tipo}
    </span>
  )
}

function SentimentBadge({ sentiment }: { sentiment: string }) {
  return (
    <span style={{
      fontSize: '11px',
      fontWeight: 500,
      padding: '2px 8px',
      borderRadius: '100px',
      whiteSpace: 'nowrap',
      ...SENTIMENTO_STYLE[sentiment],
    }}>
      {SENTIMENTO_LABEL[sentiment]}
    </span>
  )
}

function formatDur(seconds: number | null) {
  const s = seconds ?? 0
  return `${Math.floor(s / 60)}m ${String(s % 60).padStart(2, '0')}s`
}

export function ChamadasTable({ calls }: { calls: Call[] }) {
  const [selectedCall, setSelectedCall] = useState<Call | null>(null)
  const [transcriptCallId, setTranscriptCallId] = useState<string | null>(null)
  const [transcript, setTranscript] = useState<string | null>(null)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)

  async function openTranscript(callId: string, e: React.MouseEvent) {
    e.stopPropagation()
    setTranscriptCallId(callId)
    setTranscript(null)
    setFetchError(null)
    setLoadingId(callId)
    try {
      const res = await fetch(`/api/client/chamadas/${callId}/transcricao`)
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao carregar transcrição')
      setTranscript(json.transcript ?? '(sem transcrição disponível)')
    } catch (e) {
      setFetchError((e as Error).message)
    } finally {
      setLoadingId(null)
    }
  }

  function closeTranscript() {
    setTranscriptCallId(null)
    setTranscript(null)
    setFetchError(null)
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

  const modalFields = selectedCall ? (() => {
    const dt = selectedCall.criado_em ? new Date(selectedCall.criado_em) : null
    const tipo = selectedCall.tipo_chamada ?? ''
    const sentiment = selectedCall.user_sentiment ?? ''
    return [
      { label: 'Data / Hora', value: dt ? format(dt, "d MMM yyyy 'às' HH:mm", { locale: pt }) : '—' },
      { label: 'Duração', value: formatDur(selectedCall.duration_seconds) },
      { label: 'Tipo', value: tipo ? <TypeBadge tipo={tipo} /> : '—' },
      { label: 'Sentimento', value: sentiment && SENTIMENTO_LABEL[sentiment] ? <SentimentBadge sentiment={sentiment} /> : '—' },
      { label: 'Língua', value: selectedCall.lingua_detectada ? selectedCall.lingua_detectada.toUpperCase() : '—' },
      { label: 'Nome do cliente', value: selectedCall.nome_cliente ?? '—' },
      { label: 'Telefone', value: selectedCall.caller_phone ?? '—' },
      { label: 'Resumo', value: selectedCall.call_summary ?? '—' },
    ]
  })() : []

  return (
    <>
      {/* ── Vista desktop: tabela ── */}
      <div className="nc-table-desktop" style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}>
        {calls.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center' }}>
            <Phone style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem chamadas no período seleccionado</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr>
                  <th style={thStyle}>Data</th>
                  <th style={thStyle}>Hora</th>
                  <th style={thStyle}>Duração</th>
                  <th style={thStyle}>Tipo</th>
                  <th style={thStyle}>Língua</th>
                  <th style={thStyle}>Sentimento</th>
                  <th style={thStyle}>Resumo</th>
                  <th style={thStyle}>Transcrição</th>
                </tr>
              </thead>
              <tbody>
                {calls.map((call, idx) => {
                  const dt = call.criado_em ? new Date(call.criado_em) : null
                  const tipo = call.tipo_chamada ?? ''
                  return (
                    <tr
                      key={call.id}
                      style={{
                        borderBottom: idx < calls.length - 1 ? '1px solid var(--surface-border)' : 'none',
                        transition: 'background 80ms ease',
                        cursor: 'pointer',
                      }}
                      onClick={() => setSelectedCall(call)}
                      onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-subtle)' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                    >
                      <td style={{ ...tdStyle, color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {dt ? format(dt, 'd MMM', { locale: pt }) : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {dt ? format(dt, 'HH:mm') : '—'}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                        {formatDur(call.duration_seconds)}
                      </td>
                      <td style={tdStyle}>
                        {tipo ? <TypeBadge tipo={tipo} /> : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, color: 'var(--text-muted)', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.05em' }}>
                        {call.lingua_detectada ?? '—'}
                      </td>
                      <td style={tdStyle}>
                        {call.user_sentiment && SENTIMENTO_LABEL[call.user_sentiment] ? (
                          <SentimentBadge sentiment={call.user_sentiment} />
                        ) : <span style={{ color: 'var(--text-muted)' }}>—</span>}
                      </td>
                      <td style={{ ...tdStyle, maxWidth: '200px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {call.call_summary ?? '—'}
                        </p>
                      </td>
                      <td style={tdStyle}>
                        <button
                          onClick={(e) => openTranscript(call.id, e)}
                          disabled={loadingId === call.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            fontSize: '12px',
                            color: 'var(--blue-600)',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: 0,
                            fontFamily: 'var(--font-geist), sans-serif',
                            opacity: loadingId === call.id ? 0.5 : 1,
                            transition: 'opacity 150ms ease',
                          }}
                        >
                          <FileText style={{ width: '13px', height: '13px' }} />
                          {loadingId === call.id ? '...' : 'Ver'}
                        </button>
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
        {calls.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <Phone style={{ width: '32px', height: '32px', color: 'var(--text-muted)', margin: '0 auto 12px' }} />
            <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>Sem chamadas no período seleccionado</p>
          </div>
        ) : (
          calls.map(call => {
            const dt = call.criado_em ? new Date(call.criado_em) : null
            const tipo = call.tipo_chamada ?? ''
            return (
              <div
                key={call.id}
                className="nc-mobile-card-item"
                onClick={() => setSelectedCall(call)}
                style={{ cursor: 'pointer' }}
              >
                {/* Linha 1: tipo + sentimento + duração */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {tipo ? <TypeBadge tipo={tipo} /> : null}
                    {call.user_sentiment && SENTIMENTO_LABEL[call.user_sentiment]
                      ? <SentimentBadge sentiment={call.user_sentiment} />
                      : null
                    }
                  </div>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', flexShrink: 0 }}>
                    {formatDur(call.duration_seconds)}
                  </span>
                </div>
                {/* Linha 2: data + hora */}
                <p style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace', margin: '0 0 6px' }}>
                  {dt ? format(dt, "d MMM yyyy 'às' HH:mm", { locale: pt }) : '—'}
                </p>
                {/* Linha 3: resumo */}
                {call.call_summary && (
                  <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '0 0 8px', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {call.call_summary}
                  </p>
                )}
                {/* Ver transcrição */}
                <button
                  onClick={(e) => openTranscript(call.id, e)}
                  disabled={loadingId === call.id}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '12px',
                    color: 'var(--blue-600)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: 0,
                    fontFamily: 'var(--font-geist), sans-serif',
                    opacity: loadingId === call.id ? 0.5 : 1,
                  }}
                >
                  <FileText style={{ width: '12px', height: '12px' }} />
                  {loadingId === call.id ? 'A carregar...' : 'Ver transcrição'}
                </button>
              </div>
            )
          })
        )}
      </div>

      {/* Row detail modal */}
      <RowDetailModal
        open={!!selectedCall}
        onClose={() => setSelectedCall(null)}
        title="Detalhe da Chamada"
        subtitle={selectedCall?.criado_em ? format(new Date(selectedCall.criado_em), "d MMM yyyy 'às' HH:mm", { locale: pt }) : undefined}
        fields={modalFields}
      />

      {/* Transcript modal */}
      {transcriptCallId && (
        <div
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}
          onClick={closeTranscript}
        >
          <div
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '16px',
              maxWidth: '640px',
              width: '100%',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px', borderBottom: '1px solid var(--surface-border)' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>Transcrição da Chamada</h2>
              <button
                onClick={closeTranscript}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '4px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <X style={{ width: '16px', height: '16px' }} />
              </button>
            </div>
            <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>
              {fetchError ? (
                <p style={{ fontSize: '13px', color: 'var(--red-600)' }}>{fetchError}</p>
              ) : transcript === null ? (
                <p style={{ fontSize: '13px', color: 'var(--text-muted)' }}>A carregar...</p>
              ) : (
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', lineHeight: 1.6, margin: 0 }}>{transcript}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
