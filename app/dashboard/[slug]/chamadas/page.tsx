import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { Phone, CheckCircle, XCircle, ArrowLeftRight } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const TIPO_LABELS: Record<string, string> = {
  agendamento:   'Agendamento',
  takeaway:      'Takeaway',
  ultima_hora:   'Última Hora',
  apoio:         'Apoio',
  transferencia: 'Transferência',
  spam_hangup:   'Spam',
}

const TIPO_COLORS: Record<string, string> = {
  agendamento:   'bg-emerald-50 text-emerald-700',
  takeaway:      'bg-blue-50 text-blue-700',
  ultima_hora:   'bg-amber-50 text-amber-700',
  apoio:         'bg-slate-100 text-slate-600',
  transferencia: 'bg-purple-50 text-purple-700',
  spam_hangup:   'bg-red-50 text-red-600',
}

export default async function ChamadasPage({ params, searchParams }: Props) {
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

  const { data: calls } = await supabase
    .from('v_calls_enriched')
    .select('id, call_start_at, duration_seconds, tipo_chamada, lingua_detectada, call_successful, call_transferred, nome_cliente, caller_phone, call_summary')
    .eq('restaurant_id', restaurant.id)
    .gte('call_start_at', startDate.toISOString())
    .order('call_start_at', { ascending: false })
    .limit(200)

  const rows = calls ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Chamadas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rows.length} chamadas no período</p>
        </div>
        <PeriodFilter active={periodo} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Phone className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sem chamadas no período seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Duração</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Tipo</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Língua</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Resultado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Resumo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(call => {
                  const dt = call.call_start_at ? new Date(call.call_start_at) : null
                  const durSec = call.duration_seconds ?? 0
                  const durFmt = `${Math.floor(durSec / 60)}m ${String(durSec % 60).padStart(2, '0')}s`
                  return (
                    <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 text-slate-600">
                        {dt ? format(dt, 'd MMM', { locale: pt }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {dt ? format(dt, 'HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{durFmt}</td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          TIPO_COLORS[call.tipo_chamada ?? ''] ?? 'bg-slate-100 text-slate-600'
                        )}>
                          {TIPO_LABELS[call.tipo_chamada ?? ''] ?? call.tipo_chamada ?? '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-500 uppercase text-xs">
                        {call.lingua_detectada ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        {call.call_transferred ? (
                          <span title="Transferida"><ArrowLeftRight className="w-4 h-4 text-purple-500" /></span>
                        ) : call.call_successful ? (
                          <span title="Sucesso"><CheckCircle className="w-4 h-4 text-emerald-500" /></span>
                        ) : (
                          <span title="Insucesso"><XCircle className="w-4 h-4 text-red-400" /></span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 max-w-[240px] truncate text-xs">
                        {call.call_summary ?? '—'}
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
