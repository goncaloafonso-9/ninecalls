import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { subDays, startOfDay, format } from 'date-fns'
import { pt } from 'date-fns/locale'
import { PeriodFilter } from '@/components/dashboard/period-filter'
import { Calendar } from 'lucide-react'
import { NoShowButton } from '@/components/dashboard/no-show-button'
import { cn } from '@/lib/utils'

interface Props {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ periodo?: string }>
}

const ESPACO_LABELS: Record<string, string> = {
  sala:            'Sala',
  terraco:         'Terraço',
  esplanada:       'Esplanada',
  sem_preferencia: 'Sem pref.',
  desconhecido:    '—',
}

const SERVICO_LABELS: Record<string, string> = {
  almoco:       'Almoço',
  jantar:       'Jantar',
  desconhecido: '—',
}

export default async function ReservasPage({ params, searchParams }: Props) {
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

  const { data: bookings } = await supabase
    .from('v_bookings_enriched')
    .select('id, booking_datetime, number_of_people, cliente_nome, espaco, servico, estado, pode_marcar_no_show, horas_restantes_no_show, special_requests')
    .eq('restaurant_id', restaurant.id)
    .gte('booking_datetime', startDate.toISOString())
    .order('booking_datetime', { ascending: false })
    .limit(200)

  const rows = bookings ?? []

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">Reservas</h1>
          <p className="text-sm text-slate-500 mt-0.5">{rows.length} reservas no período</p>
        </div>
        <PeriodFilter active={periodo} />
      </div>

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-12 text-center">
            <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-3" />
            <p className="text-sm text-slate-500">Sem reservas no período seleccionado</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Data</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Hora</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Nome</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Pessoas</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Espaço</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Serviço</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Estado</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-slate-500 uppercase tracking-wide">Acção</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {rows.map(b => {
                  const dt = b.booking_datetime ? new Date(b.booking_datetime) : null
                  const noShow = b.estado === 'no_show'
                  return (
                    <tr key={b.id} className={cn('hover:bg-slate-50 transition-colors', noShow && 'opacity-60')}>
                      <td className="px-4 py-3 text-slate-700">
                        {dt ? format(dt, 'd MMM yyyy', { locale: pt }) : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {dt ? format(dt, 'HH:mm') : '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">
                        {b.cliente_nome ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        {b.number_of_people ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {ESPACO_LABELS[b.espaco ?? ''] ?? b.espaco ?? '—'}
                      </td>
                      <td className="px-4 py-3 text-slate-500">
                        {SERVICO_LABELS[b.servico ?? ''] ?? b.servico ?? '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn(
                          'inline-flex px-2 py-0.5 rounded-full text-xs font-medium',
                          noShow
                            ? 'bg-slate-100 text-slate-500'
                            : 'bg-emerald-50 text-emerald-700'
                        )}>
                          {noShow ? 'No-Show' : 'Confirmada'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {b.pode_marcar_no_show && (
                          <NoShowButton
                            bookingId={b.id}
                            horasRestantes={Math.round(b.horas_restantes_no_show ?? 0)}
                          />
                        )}
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
