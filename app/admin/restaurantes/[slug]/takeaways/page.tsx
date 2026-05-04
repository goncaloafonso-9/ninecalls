import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { ShoppingBag } from 'lucide-react'
import { cn } from '@/lib/utils'

const estadoBadge: Record<string, string> = {
  pendente_restaurante: 'bg-amber-50 text-amber-700 border-amber-200',
  confirmado:           'bg-green-50 text-green-700 border-green-200',
  rejeitado:            'bg-red-50 text-red-600 border-red-200',
}
const estadoLabel: Record<string, string> = {
  pendente_restaurante: 'Pendente',
  confirmado:           'Confirmado',
  rejeitado:            'Rejeitado',
}

export default async function TakeawaysPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()
  const { data: rest } = await db.from('restaurants').select('id').eq('slug', slug).single()
  if (!rest) notFound()

  const { data } = await db
    .from('v_takeaways_enriched')
    .select('id, criado_em, nome_cliente, telefone_cliente, hora_levantamento, itens_pedido, estado, expira_em')
    .eq('restaurant_id', rest.id)
    .order('criado_em', { ascending: false })
    .limit(100)

  const takeaways = data ?? []

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-sm text-slate-500">{takeaways.length} takeaways (últimos 100)</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {takeaways.length === 0 ? (
          <div className="py-16 text-center">
            <ShoppingBag className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sem takeaways registados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Data', 'Nome', 'Telefone', 'Hora Levant.', 'Pedido', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {takeaways.map((t: Record<string, unknown>) => (
                  <tr key={t.id as string} className={cn(
                    'border-b border-slate-50 hover:bg-slate-50/60 transition-colors',
                    t.estado === 'pendente_restaurante' && 'bg-amber-50/30'
                  )}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(t.criado_em as string)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(t.nome_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">
                      {(t.telefone_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {t.hora_levantamento ? formatDateTime(t.hora_levantamento as string) : '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-500 truncate">{(t.itens_pedido as string) ?? '—'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', estadoBadge[t.estado as string] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
                        {estadoLabel[t.estado as string] ?? t.estado as string}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
