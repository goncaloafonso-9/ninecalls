import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatDateTime } from '@/lib/utils'
import { Zap } from 'lucide-react'
import { cn } from '@/lib/utils'

const estadoBadge: Record<string, string> = {
  pendente_restaurante: 'bg-amber-50 text-amber-700 border-amber-200',
  aceite:               'bg-green-50 text-green-700 border-green-200',
  rejeitado:            'bg-red-50 text-red-600 border-red-200',
}
const estadoLabel: Record<string, string> = {
  pendente_restaurante: 'Pendente',
  aceite:               'Aceite',
  rejeitado:            'Rejeitado',
}

export default async function UltimaHoraPage({
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
    .from('v_ultima_hora_enriched')
    .select('id, criado_em, nome_cliente, total_pessoas, espaco, data_hora_pedida, estado')
    .eq('restaurant_id', rest.id)
    .order('criado_em', { ascending: false })
    .limit(100)

  const requests = data ?? []

  const espacoLabel: Record<string, string> = {
    sala: 'Sala', terraco: 'Terraço', esplanada: 'Esplanada',
    sem_preferencia: 'Sem preferência', desconhecido: '—',
  }

  return (
    <div className="p-6">
      <div className="mb-5">
        <p className="text-sm text-slate-500">{requests.length} pedidos (últimos 100)</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {requests.length === 0 ? (
          <div className="py-16 text-center">
            <Zap className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sem pedidos de última hora registados</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Data', 'Nome', 'Pessoas', 'Espaço', 'Data/Hora Pedida', 'Estado'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map((r: Record<string, unknown>) => (
                  <tr key={r.id as string} className={cn(
                    'border-b border-slate-50 hover:bg-slate-50/60 transition-colors',
                    r.estado === 'pendente_restaurante' && 'bg-amber-50/30'
                  )}>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDate(r.criado_em as string)}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(r.nome_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(r.total_pessoas as number) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {espacoLabel[r.espaco as string] ?? '—'}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-700">
                      {r.data_hora_pedida ? formatDateTime(r.data_hora_pedida as string) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', estadoBadge[r.estado as string] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
                        {estadoLabel[r.estado as string] ?? r.estado as string}
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
