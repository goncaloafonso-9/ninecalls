'use client'

import { useEffect, useState } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'

interface Props {
  restaurantId: string
  limit?: number
}

interface CallRow {
  id: string
  created_at: string
  tipo_chamada: string | null
  call_summary: string | null
  call_successful: boolean | null
  user_sentiment: 'positive' | 'neutral' | 'negative' | null
  duration_seconds: number | null
}

const SENTIMENT_BADGE: Record<string, string> = {
  positive: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  neutral:  'bg-slate-100 text-slate-500 border-slate-200',
  negative: 'bg-red-50 text-red-700 border-red-200',
}
const SENTIMENT_LABEL: Record<string, string> = {
  positive: 'Positivo', neutral: 'Neutro', negative: 'Negativo',
}
const TIPO_LABELS: Record<string, string> = {
  agendamento: 'Agendamento', reagendamento: 'Reagendamento', cancelamento: 'Cancelamento',
  takeaway: 'Takeaway', ultima_hora: 'Última Hora', apoio: 'Apoio',
  transferencia: 'Transferência', spam_hangup: 'Spam',
}

export function CallSummaryList({ restaurantId, limit = 20 }: Props) {
  const [calls, setCalls] = useState<CallRow[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      const { data } = await supabase
        .from('calls')
        .select('id, created_at, tipo_chamada, call_summary, call_successful, user_sentiment, duration_seconds')
        .eq('restaurant_id', restaurantId)
        .order('created_at', { ascending: false })
        .limit(limit)

      setCalls((data ?? []) as CallRow[])
      setLoading(false)
    }
    load()
  }, [restaurantId, limit])

  function toggle(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  if (loading) return (
    <div className="space-y-2">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 bg-slate-100 rounded-lg animate-pulse" />)}
    </div>
  )

  if (calls.length === 0) return (
    <div className="py-12 text-center text-sm text-slate-400">Sem chamadas para mostrar</div>
  )

  return (
    <div className="divide-y divide-slate-50">
      {calls.map(c => {
        const isOpen = expanded.has(c.id)
        const dt = c.created_at ? new Date(c.created_at) : null
        const mins = c.duration_seconds ? Math.floor(c.duration_seconds / 60) : 0
        const secs = c.duration_seconds ? c.duration_seconds % 60 : 0

        return (
          <div key={c.id} className="py-3">
            <div
              className={cn('flex items-center gap-3 cursor-pointer', c.call_summary && 'hover:bg-slate-50 -mx-2 px-2 rounded-lg transition-colors')}
              onClick={() => c.call_summary && toggle(c.id)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-slate-700">
                    {TIPO_LABELS[c.tipo_chamada ?? ''] ?? c.tipo_chamada ?? '—'}
                  </span>
                  {c.user_sentiment && (
                    <span className={cn('text-xs border px-1.5 py-0.5 rounded-full', SENTIMENT_BADGE[c.user_sentiment])}>
                      {SENTIMENT_LABEL[c.user_sentiment]}
                    </span>
                  )}
                  {c.call_successful === false && (
                    <span className="text-xs bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">Insucesso</span>
                  )}
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  {dt ? format(dt, "d MMM · HH:mm", { locale: pt }) : '—'}
                  {c.duration_seconds ? ` · ${mins}m${secs}s` : ''}
                </p>
              </div>
              {c.call_summary && (
                <span className="text-slate-300 shrink-0">
                  {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </span>
              )}
            </div>
            {isOpen && c.call_summary && (
              <p className="mt-2 text-sm text-slate-600 bg-slate-50 rounded-lg px-3 py-2">{c.call_summary}</p>
            )}
          </div>
        )
      })}
    </div>
  )
}
