import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDateTime } from '@/lib/utils'
import { Phone } from 'lucide-react'
import { cn } from '@/lib/utils'

const tipoLabel: Record<string, string> = {
  agendamento: 'Reserva',
  takeaway: 'Takeaway',
  ultima_hora: 'Última Hora',
  apoio: 'Apoio',
  transferencia: 'Transferência',
  spam_hangup: 'Spam/Hangup',
}
const tipoBadge: Record<string, string> = {
  agendamento: 'bg-blue-50 text-blue-700 border-blue-200',
  takeaway: 'bg-purple-50 text-purple-700 border-purple-200',
  ultima_hora: 'bg-orange-50 text-orange-700 border-orange-200',
  apoio: 'bg-slate-100 text-slate-600 border-slate-200',
  transferencia: 'bg-slate-100 text-slate-600 border-slate-200',
  spam_hangup: 'bg-red-50 text-red-600 border-red-200',
}
const sentimentoEmoji: Record<string, string> = {
  positivo: '😊',
  neutro: '😐',
  negativo: '😞',
}

export default async function ChamadasPage({
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
    .from('v_calls_enriched')
    .select('id, created_at, duracao_segundos, telefone_cliente, nome_cliente, tipo_chamada, sentimento, lingua, resumo, appointment_booked, takeaway, ultima_hora')
    .eq('restaurant_id', rest.id)
    .order('created_at', { ascending: false })
    .limit(100)

  const calls = data ?? []

  function formatDuration(seconds: number | null) {
    if (!seconds) return '—'
    const m = Math.floor(seconds / 60)
    const s = seconds % 60
    return `${m}m${s.toString().padStart(2, '0')}s`
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-slate-500">{calls.length} chamadas (últimas 100)</p>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {calls.length === 0 ? (
          <div className="py-16 text-center">
            <Phone className="w-8 h-8 text-slate-200 mx-auto mb-3" />
            <p className="text-slate-400 text-sm">Sem chamadas registadas</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/60">
                  {['Data/Hora', 'Duração', 'Telefone', 'Nome', 'Tipo', 'Sent.', 'Língua', 'Resumo'].map(h => (
                    <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {calls.map((call: Record<string, unknown>) => (
                  <tr key={call.id as string} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap text-xs text-slate-500">
                      {formatDateTime(call.created_at as string)}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {formatDuration(call.duracao_segundos as number | null)}
                    </td>
                    <td className="px-4 py-3 text-xs font-mono text-slate-700">
                      {(call.telefone_cliente as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {(call.nome_cliente as string) ?? <span className="text-slate-300">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      {call.tipo_chamada ? (
                        <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', tipoBadge[call.tipo_chamada as string] ?? 'bg-slate-100 text-slate-500 border-slate-200')}>
                          {tipoLabel[call.tipo_chamada as string] ?? call.tipo_chamada as string}
                        </span>
                      ) : <span className="text-slate-300 text-xs">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {call.sentimento ? sentimentoEmoji[call.sentimento as string] ?? '—' : '—'}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 uppercase">
                      {(call.lingua as string) ?? '—'}
                    </td>
                    <td className="px-4 py-3 max-w-xs">
                      <p className="text-xs text-slate-500 truncate">
                        {(call.resumo as string) ?? <span className="text-slate-300">—</span>}
                      </p>
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
