'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts'
import { createClient } from '@/lib/supabase/client'
import { format, eachDayOfInterval, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

interface Props {
  restaurantId: string
  cycleId: string
  dataInicio: string
}

export function WeeklySentimentTrend({ restaurantId, cycleId, dataInicio }: Props) {
  const [data, setData] = useState<{ day: string; pct: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      const { data: calls } = await supabase
        .from('calls')
        .select('created_at, user_sentiment')
        .eq('restaurant_id', restaurantId)
        .eq('billing_cycle_id', cycleId)
        .not('user_sentiment', 'is', null)
        .order('created_at', { ascending: true })

      if (!calls || calls.length === 0) { setLoading(false); return }

      // Group by day
      const byDay: Record<string, { pos: number; total: number }> = {}
      for (const c of calls) {
        const day = c.created_at.split('T')[0]
        if (!byDay[day]) byDay[day] = { pos: 0, total: 0 }
        byDay[day].total++
        if (c.user_sentiment === 'positive') byDay[day].pos++
      }

      const startDate = parseISO(dataInicio)
      const endDate = new Date()
      const days = eachDayOfInterval({ start: startDate, end: endDate })

      setData(
        days.map(d => {
          const key = format(d, 'yyyy-MM-dd')
          const stats = byDay[key]
          return {
            day: format(d, 'd MMM', { locale: pt }),
            pct: stats ? Math.round((stats.pos / stats.total) * 100) : 0,
          }
        })
      )
      setLoading(false)
    }
    load()
  }, [restaurantId, cycleId, dataInicio])

  if (loading) return <div className="h-36 bg-slate-100 rounded-lg animate-pulse" />
  if (data.length === 0) return (
    <div className="h-36 flex items-center justify-center text-sm text-slate-400">Sem dados de sentimento</div>
  )

  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 4, right: 8, left: -24, bottom: 0 }}>
        <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
        <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={v => `${v}%`} />
        <Tooltip formatter={(value) => [`${value}%`, 'Sentimento positivo']} />
        <ReferenceLine y={50} stroke="#e2e8f0" strokeDasharray="4 4" />
        <Line type="monotone" dataKey="pct" stroke="#00D4AA" strokeWidth={2} dot={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}
