import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { Users } from 'lucide-react'

export default async function RestauranteClientesPage({
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
    .from('v_customers_by_restaurant')
    .select('id, nome, telefone, total_chamadas, total_reservas, total_takeaways, total_ultima_hora, ultima_interacao')
    .eq('restaurant_id', rest.id)
    .order('ultima_interacao', { ascending: false })
    .limit(200)

  const customers = data ?? []

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-sm text-slate-500">{customers.length} clientes</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {customers.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sem clientes registados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Nome', 'Telefone', 'Chamadas', 'Reservas', 'Takeaways', 'Últ. Hora', 'Última Interacção'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {customers.map((c: Record<string, unknown>) => (
                  <tr key={c.id as string} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">
                      {(c.nome as string) ?? <span className="text-slate-400 font-normal">Desconhecido</span>}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">
                      {(c.telefone as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {(c.total_chamadas as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {(c.total_reservas as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {(c.total_takeaways as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700 text-center">
                      {(c.total_ultima_hora as number) ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {c.ultima_interacao ? formatDateTime(c.ultima_interacao as string) : '—'}
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
