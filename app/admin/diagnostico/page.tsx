'use client'

import { useEffect, useState, useCallback } from 'react'
import { CheckCircle2, XCircle, AlertCircle, RefreshCw, Wrench, Database, Activity } from 'lucide-react'

interface DiagResult {
  calls_count: number
  bookings_count: number
  takeaways_count: number
  ultima_hora_count: number
  missing_columns: string[]
  missing_triggers: string[]
  missing_views: string[]
  process_incoming_call_exists: boolean
  healthy: boolean
}

interface ApplyResult {
  ok: boolean
  results: { step: string; ok: boolean; error?: string }[]
}

function StatusIcon({ ok, warn }: { ok: boolean; warn?: boolean }) {
  if (ok) return <CheckCircle2 style={{ width: '16px', height: '16px', color: 'var(--green-500)' }} />
  if (warn) return <AlertCircle style={{ width: '16px', height: '16px', color: 'var(--amber-500, #f59e0b)' }} />
  return <XCircle style={{ width: '16px', height: '16px', color: 'var(--red-500)' }} />
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{
      border: '1px solid var(--surface-border)',
      borderRadius: '12px',
      background: 'var(--surface-1)',
      overflow: 'hidden',
    }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--surface-border)',
        background: 'var(--bg-subtle)',
      }}>
        <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)' }}>
          {title}
        </span>
      </div>
      <div style={{ padding: '16px' }}>
        {children}
      </div>
    </div>
  )
}

export default function DiagnosticoPage() {
  const [diag, setDiag] = useState<DiagResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [applying, setApplying] = useState(false)
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchDiag = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/diagnostico-bd')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json() as DiagResult
      setDiag(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchDiag() }, [fetchDiag])

  async function handleApply() {
    setApplying(true)
    setApplyResult(null)
    try {
      const res = await fetch('/api/admin/diagnostico-bd', { method: 'POST' })
      const data = await res.json() as ApplyResult
      setApplyResult(data)
      // Re-fetch diagnosis after apply
      await fetchDiag()
    } catch (e) {
      setApplyResult({ ok: false, results: [{ step: 'fetch', ok: false, error: String(e) }] })
    } finally {
      setApplying(false)
    }
  }

  const hasProblems = diag && (
    diag.missing_columns.length > 0 ||
    diag.missing_triggers.length > 0 ||
    diag.missing_views.length > 0 ||
    diag.process_incoming_call_exists
  )

  return (
    <div style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px',
            background: 'var(--blue-50, rgba(59,130,246,0.08))',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Activity style={{ width: '20px', height: '20px', color: 'var(--blue-600)' }} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: 'var(--text-primary)' }}>
              Diagnóstico da Base de Dados
            </h1>
            <p style={{ margin: '2px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
              Verifica colunas, triggers, views e funções necessários para o funcionamento correcto
            </p>
          </div>
        </div>
        <button
          onClick={fetchDiag}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            height: '34px', padding: '0 14px',
            borderRadius: '8px', border: '1px solid var(--surface-border)',
            background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
            fontSize: '13px', cursor: loading ? 'default' : 'pointer',
            fontFamily: 'var(--font-geist), sans-serif',
            opacity: loading ? 0.6 : 1,
          }}
        >
          <RefreshCw style={{ width: '13px', height: '13px', animation: loading ? 'spin 1s linear infinite' : 'none' }} />
          Actualizar
        </button>
      </div>

      {/* Spin animation */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>

      {error && (
        <div style={{
          padding: '14px 16px', borderRadius: '10px', marginBottom: '20px',
          background: 'var(--red-50, #fef2f2)', border: '1px solid var(--red-200, #fecaca)',
          color: 'var(--red-700, #b91c1c)', fontSize: '13px',
        }}>
          Erro ao carregar diagnóstico: {error}
        </div>
      )}

      {loading && !diag && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              height: '80px', borderRadius: '12px',
              background: 'var(--bg-muted)',
              animation: 'pulse 1.5s ease-in-out infinite',
            }} />
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      )}

      {diag && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

          {/* Global status banner */}
          <div style={{
            padding: '14px 18px',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            background: diag.healthy
              ? 'var(--green-50, rgba(34,197,94,0.08))'
              : 'var(--red-50, rgba(239,68,68,0.08))',
            border: `1px solid ${diag.healthy ? 'var(--green-200, #bbf7d0)' : 'var(--red-200, #fecaca)'}`,
          }}>
            <StatusIcon ok={diag.healthy} />
            <span style={{
              fontSize: '14px', fontWeight: 600,
              color: diag.healthy ? 'var(--green-700, #15803d)' : 'var(--red-700, #b91c1c)',
            }}>
              {diag.healthy
                ? 'Base de dados OK — todos os componentes estão presentes'
                : `Problemas detectados — ${[diag.missing_columns.length, diag.missing_triggers.length, diag.missing_views.length].reduce((a, b) => a + b, 0) + (diag.process_incoming_call_exists ? 1 : 0)} item(s) a corrigir`
              }
            </span>
          </div>

          {/* Counts */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px' }}>
            {[
              { label: 'Chamadas', count: diag.calls_count },
              { label: 'Reservas', count: diag.bookings_count },
              { label: 'Takeaways', count: diag.takeaways_count },
              { label: 'Última Hora', count: diag.ultima_hora_count },
            ].map(({ label, count }) => (
              <div key={label} style={{
                padding: '14px 16px',
                borderRadius: '10px',
                background: 'var(--surface-1)',
                border: '1px solid var(--surface-border)',
                textAlign: 'center',
              }}>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  {count}
                </p>
                <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--text-muted)' }}>{label}</p>
              </div>
            ))}
          </div>

          {/* Legacy function */}
          <Card title="Função Legacy">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <StatusIcon ok={!diag.process_incoming_call_exists} />
              <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                process_incoming_call
              </span>
              <span style={{ fontSize: '12px', color: diag.process_incoming_call_exists ? 'var(--red-600)' : 'var(--text-muted)' }}>
                {diag.process_incoming_call_exists ? '— presente (deve ser removida)' : '— ausente (correcto)'}
              </span>
            </div>
          </Card>

          {/* Columns */}
          <Card title={`Colunas em calls (${REQUIRED_COLUMNS.length - diag.missing_columns.length}/${REQUIRED_COLUMNS.length})`}>
            {diag.missing_columns.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-600, #16a34a)', fontSize: '13px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                Todas as colunas presentes
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {diag.missing_columns.map(col => (
                  <div key={col} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle style={{ width: '14px', height: '14px', color: 'var(--red-500)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>{col}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Triggers */}
          <Card title={`Triggers em calls (${REQUIRED_TRIGGERS.length - diag.missing_triggers.length}/${REQUIRED_TRIGGERS.length})`}>
            {diag.missing_triggers.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-600, #16a34a)', fontSize: '13px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                Todos os triggers presentes
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {diag.missing_triggers.map(trg => (
                  <div key={trg} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle style={{ width: '14px', height: '14px', color: trg.includes('_05_') || trg.includes('_06_') || trg.includes('_07_') ? 'var(--red-500)' : 'var(--amber-500, #f59e0b)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>{trg}</span>
                    {(trg.includes('_05_') || trg.includes('_06_') || trg.includes('_07_')) && (
                      <span style={{ fontSize: '11px', color: 'var(--red-600)', background: 'var(--red-50, #fef2f2)', padding: '1px 6px', borderRadius: '4px' }}>CRÍTICO</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Views */}
          <Card title={`Views (${REQUIRED_VIEWS.length - diag.missing_views.length}/${REQUIRED_VIEWS.length})`}>
            {diag.missing_views.length === 0 ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--green-600, #16a34a)', fontSize: '13px' }}>
                <CheckCircle2 style={{ width: '15px', height: '15px' }} />
                Todas as views presentes
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {diag.missing_views.map(v => (
                  <div key={v} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <XCircle style={{ width: '14px', height: '14px', color: 'var(--red-500)', flexShrink: 0 }} />
                    <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>{v}</span>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Apply fix button */}
          {hasProblems && (
            <div style={{
              padding: '20px',
              borderRadius: '12px',
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
            }}>
              <div>
                <p style={{ margin: 0, fontSize: '14px', fontWeight: 600, color: 'var(--text-primary)' }}>
                  Aplicar Fix Automático
                </p>
                <p style={{ margin: '4px 0 0', fontSize: '13px', color: 'var(--text-muted)' }}>
                  Adiciona colunas, cria triggers e views em falta. Operação idempotente — segura para executar múltiplas vezes.
                </p>
              </div>
              <button
                onClick={handleApply}
                disabled={applying}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  height: '38px',
                  padding: '0 20px',
                  borderRadius: '8px',
                  border: 'none',
                  background: applying ? 'var(--blue-400)' : 'var(--blue-600)',
                  color: 'white',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: applying ? 'default' : 'pointer',
                  fontFamily: 'var(--font-geist), sans-serif',
                  flexShrink: 0,
                  transition: 'background 150ms ease',
                }}
              >
                <Wrench style={{ width: '14px', height: '14px', animation: applying ? 'spin 1s linear infinite' : 'none' }} />
                {applying ? 'A aplicar...' : 'Aplicar Fix'}
              </button>
            </div>
          )}

          {/* Apply results */}
          {applyResult && (
            <Card title="Resultado do Fix">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {applyResult.results.map(r => (
                  <div key={r.step} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                    <StatusIcon ok={r.ok} />
                    <div>
                      <span style={{ fontSize: '13px', color: 'var(--text-primary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                        {r.step}
                      </span>
                      {r.error && (
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: 'var(--red-600)' }}>{r.error}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div style={{
                  marginTop: '8px',
                  padding: '10px 14px',
                  borderRadius: '8px',
                  background: applyResult.ok ? 'var(--green-50, rgba(34,197,94,0.08))' : 'var(--amber-50, rgba(245,158,11,0.08))',
                  border: `1px solid ${applyResult.ok ? 'var(--green-200, #bbf7d0)' : 'var(--amber-200, #fde68a)'}`,
                  fontSize: '13px',
                  fontWeight: 600,
                  color: applyResult.ok ? 'var(--green-700, #15803d)' : 'var(--amber-700, #b45309)',
                }}>
                  {applyResult.ok
                    ? '✓ Fix aplicado com sucesso — recarrega a página para verificar'
                    : '⚠ Alguns passos falharam — poderão requerer execução manual no Supabase SQL Editor'
                  }
                </div>
              </div>
            </Card>
          )}

          {/* Manual fallback note */}
          <div style={{
            padding: '14px 16px',
            borderRadius: '10px',
            background: 'var(--bg-subtle)',
            border: '1px solid var(--surface-border)',
            fontSize: '12px',
            color: 'var(--text-muted)',
            lineHeight: '1.6',
          }}>
            <Database style={{ width: '13px', height: '13px', display: 'inline', marginRight: '6px', verticalAlign: 'middle' }} />
            Se o fix automático falhar, executa manualmente o ficheiro{' '}
            <code style={{ fontFamily: 'var(--font-geist-mono), monospace', background: 'var(--bg-muted)', padding: '1px 4px', borderRadius: '3px' }}>
              supabase/migrations/008_ensure_complete_schema.sql
            </code>
            {' '}no Supabase SQL Editor com permissões service_role.
          </div>

        </div>
      )}
    </div>
  )
}

const REQUIRED_COLUMNS = [
  'contacto_cliente', 'call_start_at', 'call_end_at', 'call_successful',
  'call_transferred', 'motivo_transferencia', 'razao_insucesso',
  'numero_slots_tentados', 'booking_datetime', 'number_of_people', 'servico',
  'special_requests', 'reserva_id_verdadeira', 'takeaway_pickup_time',
  'takeaway_items', 'takeaway_pessoas', 'ultima_hora_datetime',
  'ultima_hora_pessoas', 'ultima_hora_espaco',
]

const REQUIRED_TRIGGERS = [
  'trg_calls_01_resolve_agent',
  'trg_calls_02_resolve_restaurant',
  'trg_calls_03_resolve_customer',
  'trg_calls_04_resolve_cycle',
  'trg_calls_05_create_booking',
  'trg_calls_06_create_takeaway',
  'trg_calls_07_create_ultima_hora',
  'trg_calls_08_update_customer_counters',
  'trg_calls_09_update_daily_stats',
  'trg_calls_10_update_guarantee',
]

const REQUIRED_VIEWS = [
  'v_calls_enriched',
  'v_bookings_enriched',
  'v_takeaways_enriched',
  'v_ultima_hora_enriched',
  'v_customers_by_restaurant',
  'v_guarantee_status',
  'v_kpis_dashboard',
  'v_cycle_metrics',
  'v_admin_restaurants_overview',
]
