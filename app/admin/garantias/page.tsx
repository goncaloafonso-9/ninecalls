import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cn, clampPercent, pluralPessoa } from '@/lib/utils'
import type { GuaranteeStatus } from '@/types'
import { ShieldCheck, AlertTriangle, AlertOctagon } from 'lucide-react'

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
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Garantias Activas</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ordenadas por urgência — {guarantees.length} garantias em curso
        </p>
      </div>

      {guarantees.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-12 text-center">
          <ShieldCheck className="w-10 h-10 text-slate-200 mx-auto mb-3" />
          <p className="text-slate-400 text-sm">Nenhuma garantia activa de momento</p>
        </div>
      ) : (
        <div className="space-y-3">
          {guarantees.map(g => {
            const pct = clampPercent(g.progresso_pct)
            const urgente = g.dia_efectivo >= 25
            const alerta = g.dia_efectivo >= 20 && !urgente

            return (
              <div
                key={g.restaurant_id}
                className={cn(
                  'bg-white border rounded-lg p-5',
                  urgente ? 'border-red-200 bg-red-50/30' : alerta ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200'
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {urgente && <AlertOctagon className="w-4 h-4 text-red-500 shrink-0" />}
                      {alerta && <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />}
                      <h3 className="font-semibold text-slate-900 text-sm truncate">{g.restaurant_nome}</h3>
                      <span className="text-xs text-slate-400 shrink-0">· {g.cliente_nome}</span>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm text-slate-600">
                          {g.contagem_actual}/{g.objetivo} pessoas
                        </span>
                        <span className={cn(
                          'text-sm font-bold tabular-nums',
                          pct >= 75 ? 'text-green-600' : urgente ? 'text-red-500' : 'text-slate-700'
                        )}>
                          {pct}%
                        </span>
                      </div>
                      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={cn(
                            'h-full rounded-full transition-all',
                            pct >= 100 ? 'bg-green-500' :
                            urgente ? 'bg-red-400' :
                            alerta ? 'bg-amber-400' :
                            'bg-blue-400'
                          )}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Right stats */}
                  <div className="text-right shrink-0 space-y-1">
                    <div className={cn('text-sm font-semibold', urgente ? 'text-red-600' : alerta ? 'text-amber-600' : 'text-slate-700')}>
                      {g.dias_restantes} dias restantes
                    </div>
                    <div className="text-xs text-slate-400">Dia efectivo {g.dia_efectivo}/30</div>
                    {g.pessoas_em_falta > 0 && (
                      <div className="text-xs text-slate-500">
                        Faltam {pluralPessoa(g.pessoas_em_falta)}
                      </div>
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
