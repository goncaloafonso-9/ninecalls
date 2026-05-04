import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Calendar } from 'lucide-react'
import { cn } from '@/lib/utils'

export default async function ReservasPage({
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
    .from('v_bookings_enriched')
    .select('id, booking_datetime, nome_cliente, telefone_cliente, total_pessoas, espaco, servico, estado, criado_em')
    .eq('restaurant_id', rest.id)
    .order('booking_datetime', { ascending: false })
    .limit(100)

  const bookings = data ?? []

  const espacoLabel: Record<string, string> = {
    sala: 'Sala', terraco: 'Terraço', esplanada: 'Esplanada',
    sem_preferencia: 'Sem preferência', desconhecido: '—',
  }
  const servicoLabel: Record<string, string> = {
    almoco: 'Almoço', jantar: 'Jantar', desconhecido: '—',
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-sm text-slate-500">{bookings.length} reservas (últimas 100)</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {bookings.length === 0 ? (
          <div className="py-16 text-center">
            <Calendar className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sem reservas registadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Data Reserva', 'Nome', 'Telefone', 'Pessoas', 'Espaço', 'Serviço', 'Estado', 'Criado em'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bookings.map((b: Record<string, unknown>) => (
                  <tr key={b.id as string} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-slate-700 font-medium">
                      {formatDateTime(b.booking_datetime as string)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(b.nome_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-500">
                      {(b.telefone_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(b.total_pessoas as number) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {espacoLabel[b.espaco as string] ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {servicoLabel[b.servico as string] ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn(
                        'text-xs px-2 py-0.5 rounded-full border font-medium',
                        b.estado === 'no_show'
                          ? 'bg-red-50 text-red-600 border-red-200'
                          : 'bg-green-50 text-green-700 border-green-200'
                      )}>
                        {b.estado === 'no_show' ? 'No-Show' : 'Confirmada'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {formatDate(b.criado_em as string)}
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
