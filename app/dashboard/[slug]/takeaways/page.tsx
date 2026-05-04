import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const ESTADO_LABELS: Record<string, string> = {
  pendente_restaurante: 'Pendente',
  confirmado:           'Confirmado',
  rejeitado:            'Rejeitado',
}

const ESTADO_COLORS: Record<string, string> = {
  pendente_restaurante: 'bg-amber-50 text-amber-700',
  confirmado:           'bg-emerald-50 text-emerald-700',
  rejeitado:            'bg-red-50 text-red-600',
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

  const { data: takeaways } = await supabase
    .from('v_takeaways_enriched')
    .select('id, pickup_time, items, pessoas, estado, cliente_nome, timestamp_resposta_restaurante, criado_em')
    .eq('restaurant_id', restaurant.id)
    .gte('criado_em', startDate.toISOString())
    .order('criado_em', { ascending: false })
    .limit(200)

  const rows = takeaways ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Takeaways</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rows.length} pedidos no período</p>
        </div>
        <PeriodFilter active={periodo} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <ShoppingBag className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sem takeaways no período seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Data pedido</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Levantamento</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Cliente</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pessoas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Items</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Resposta</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(t => {
                  const criadoEm = t.criado_em ? new Date(t.criado_em) : null
                  const pickup = t.pickup_time ? new Date(t.pickup_time) : null
                  const resposta = t.timestamp_resposta_restaurante ? new Date(t.timestamp_resposta_restaurante) : null
                  return (
                    <tr key={t.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600">
                        {criadoEm ? format(criadoEm, 'd MMM HH:mm', { locale: pt }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {pickup ? format(pickup, 'd MMM HH:mm', { locale: pt }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{t.cliente_nome ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500">{t.pessoas ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate text-xs">{t.items ?? '—'}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          ESTADO_COLORS[t.estado ?? ''] ?? 'bg-slate-100 text-slate-500'
                        )}>
                          {ESTADO_LABELS[t.estado ?? ''] ?? t.estado ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {resposta ? format(resposta, 'HH:mm') : '—'}
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
