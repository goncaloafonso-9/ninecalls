import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Receipt } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
}

const PAYMENT_LABELS: Record<string, string> = {
  pendente:   'Pendente',
  pago:       'Pago',
  em_atraso:  'Em Atraso',
}

const PAYMENT_COLORS: Record<string, string> = {
  pendente:   'bg-amber-50 text-amber-700',
  pago:       'bg-emerald-50 text-emerald-700',
  em_atraso:  'bg-red-50 text-red-600',
}

export default async function CiclosPage({ params }: Props) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') redirect('/login')

  const { data: restaurant } = await supabase
    .from('restaurants')
    .select('id, nome')
    .eq('slug', slug)
    .single()

  if (!restaurant) notFound()

  const { data: ciclos } = await supabase
    .from('billing_cycles')
    .select('id, numero_ciclo, data_inicio, data_fim_prevista, estado, estado_pagamento, valor_total, n_chamadas_total, total_pessoas_reservas, total_pessoas_ultima_hora, n_takeaways_confirmados, fatura_at_numero')
    .eq('restaurant_id', restaurant.id)
    .order('numero_ciclo', { ascending: false })

  const rows = ciclos ?? []

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Ciclos de Faturação</h1>
        <p className="text-sm text-slate-500 mt-0.5">{rows.length} ciclos</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sem ciclos de faturação</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Ciclo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Período</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Chamadas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pessoas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Takeaways</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Valor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pagamento</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(c => {
                  const inicio = c.data_inicio ? new Date(c.data_inicio) : null
                  const fim    = c.data_fim_prevista ? new Date(c.data_fim_prevista) : null
                  const totalPessoas = (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0)
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">#{c.numero_ciclo}</span>
                          {c.numero_ciclo === 0 && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700">
                              Garantia
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs">
                        {inicio ? format(inicio, 'd MMM', { locale: pt }) : '—'}
                        {' → '}
                        {fim ? format(fim, 'd MMM yyyy', { locale: pt }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{c.n_chamadas_total ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{totalPessoas}</td>
                      <td className="px-4 py-3 text-slate-600">{c.n_takeaways_confirmados ?? 0}</td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {c.valor_total != null ? formatEuro(Number(c.valor_total)) : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          PAYMENT_COLORS[c.estado_pagamento ?? ''] ?? 'bg-slate-100 text-slate-500'
                        )}>
                          {PAYMENT_LABELS[c.estado_pagamento ?? ''] ?? c.estado_pagamento ?? '—'}
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
    </div>
  )
}
