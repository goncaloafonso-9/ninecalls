import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { Users } from 'lucide-react'

interface Props {
  params: Promise<{ slug: string }>
}

function maskPhone(phone: string | null): string {
  if (!phone) return '—'
  const clean = phone.replace(/\D/g, '')
  if (clean.length < 6) return phone
  return phone.slice(0, -4) + '****'
}

export default async function ClientesPage({ params }: Props) {
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

  const { data: customers } = await supabase
    .from('v_customers_by_restaurant')
    .select('id, phone, first_name, total_chamadas, total_reservas, total_takeaways, ultima_chamada_em')
    .eq('restaurant_id', restaurant.id)
    .order('total_chamadas', { ascending: false })
    .limit(200)

  const rows = customers ?? []

  return (
    <div className="p-6 space-y-5">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Clientes</h1>
        <p className="text-sm text-slate-500 mt-0.5">{rows.length} clientes identificados</p>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sem clientes registados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Telefone</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Chamadas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Reservas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Takeaways</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Última chamada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(c => {
                  const ultimaChm = (c as Record<string, unknown>).ultima_chamada_em
                    ? new Date((c as Record<string, unknown>).ultima_chamada_em as string)
                    : null
                  return (
                    <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600 text-xs">
                        {maskPhone(c.phone)}
                      </td>
                      <td className="px-4 py-3 text-slate-700">{c.first_name ?? '—'}</td>
                      <td className="px-4 py-3 text-slate-600">{c.total_chamadas ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{(c.total_reservas as number) ?? 0}</td>
                      <td className="px-4 py-3 text-slate-600">{(c.total_takeaways as number) ?? 0}</td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {ultimaChm ? format(ultimaChm, 'd MMM yyyy', { locale: pt }) : '—'}
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
