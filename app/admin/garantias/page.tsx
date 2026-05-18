import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { clampPercent, pluralPessoa } from '@/lib/utils'
import type { GuaranteeStatus } from '@/types'
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react'
import { EmptyState } from '@/components/ui/empty-state'

export default async function GarantiasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data } = await db
    .from('v_guarantee_status')
    .select('*')
    .eq('estado', 'em_curso')
    .order('dias_restantes', { ascending: true })

  const guarantees = (data ?? []) as GuaranteeStatus[]

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Header */}
      <div>
        <h1
          style={{
            fontSize: '1.5rem',
            fontWeight: 600,
            color: 'var(--text-primary)',
            letterSpacing: '-0.025em',
            margin: 0,
          }}
        >
          Garantias Activas
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
          Ordenadas por urgência · {guarantees.length} garantias em curso
        </p>
      </div>

      {guarantees.length === 0 ? (
        <div
          style={{
            background: 'var(--surface-1)',
            border: '1px solid var(--surface-border)',
            borderRadius: '16px',
          }}
        >
          <EmptyState
            icon={<ShieldCheck style={{ width: '40px', height: '40px' }} />}
            title="Nenhuma garantia activa"
            description="Quando um restaurante entrar em período de garantia, aparece aqui."
          />
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {guarantees.map(g => {
            const pct = clampPercent(g.progresso_pct)
            const urgente = g.dia_efectivo >= 25
            const alerta = g.dia_efectivo >= 20 && !urgente

            const borderColor = urgente
              ? 'var(--red-200, #fecaca)'
              : alerta
              ? 'var(--amber-200, #fde68a)'
              : 'var(--surface-border)'

            const bgColor = urgente
              ? 'rgba(254,242,242,0.4)'
              : alerta
              ? 'rgba(255,251,235,0.4)'
              : 'var(--surface-1)'

            const barColor = pct >= 100
              ? 'var(--green-500)'
              : urgente
              ? 'var(--red-500)'
              : alerta
              ? '#f59e0b'
              : 'var(--blue-500)'

            return (
              <div
                key={g.restaurant_id}
                className="animate-in"
                style={{
                  background: bgColor,
                  border: `1px solid ${borderColor}`,
                  borderRadius: '16px',
                  padding: '20px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px' }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Name row */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                      {urgente && <AlertOctagon style={{ width: '14px', height: '14px', color: 'var(--red-500)', flexShrink: 0 }} />}
                      {alerta && <AlertTriangle style={{ width: '14px', height: '14px', color: '#f59e0b', flexShrink: 0 }} />}
                      <h3
                        style={{
                          fontWeight: 600,
                          color: 'var(--text-primary)',
                          fontSize: '14px',
                          margin: 0,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {g.restaurant_nome}
                      </h3>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)', flexShrink: 0 }}>
                        · {g.cliente_nome}
                      </span>
                    </div>

                    {/* Progress */}
                    <div style={{ marginBottom: '0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <span style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                          {g.contagem_actual}/{g.objetivo} pessoas
                        </span>
                        <span
                          style={{
                            fontSize: '13px',
                            fontWeight: 700,
                            fontFamily: 'var(--font-geist-mono), monospace',
                            color: pct >= 75
                              ? 'var(--green-600)'
                              : urgente
                              ? 'var(--red-600)'
                              : 'var(--text-primary)',
                          }}
                        >
                          {pct}%
                        </span>
                      </div>
                      <div
                        style={{
                          height: '6px',
                          background: 'var(--bg-muted)',
                          borderRadius: '3px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            height: '100%',
                            borderRadius: '3px',
                            background: barColor,
                            width: `${pct}%`,
                            transition: 'width 400ms ease',
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right stats */}
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        margin: '0 0 4px',
                        color: urgente
                          ? 'var(--red-600)'
                          : alerta
                          ? '#b45309'
                          : 'var(--text-primary)',
                      }}
                    >
                      {g.dias_restantes} dias restantes
                    </p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '0 0 2px' }}>
                      Dia efectivo {g.dia_efectivo}/30
                    </p>
                    {g.pessoas_em_falta > 0 && (
                      <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
                        Faltam {pluralPessoa(g.pessoas_em_falta)}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
