'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantId: string
  cycleId?: string
  dateRange?: { from: string; to: string }
}

const COLORS = { positive: '#00D4AA', neutral: '#888888', negative: '#FF4444' }
const LABELS = { positive: 'Positivo', neutral: 'Neutro', negative: 'Negativo' }

export function SentimentChart({ restaurantId, cycleId, dateRange }: Props) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let query = supabase
        .from('calls')
        .select('user_sentiment')
        .eq('restaurant_id', restaurantId)
        .not('user_sentiment', 'is', null)

      if (cycleId) query = query.eq('billing_cycle_id', cycleId)
      else if (dateRange) query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to)

      const { data: calls } = await query
      if (!calls) { setLoading(false); return }

      const counts = { positive: 0, neutral: 0, negative: 0 }
      for (const c of calls) {
        if (c.user_sentiment in counts) counts[c.user_sentiment as keyof typeof counts]++
      }

      setData(
        Object.entries(counts)
          .filter(([, v]) => v > 0)
          .map(([key, value]) => ({
            name: LABELS[key as keyof typeof LABELS],
            value,
            color: COLORS[key as keyof typeof COLORS],
          }))
      )
      setLoading(false)
    }
    load()
  }, [restaurantId, cycleId, dateRange])

  if (loading) return (
    <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
  )

  if (data.length === 0) return (
    <div className="h-48 flex items-center justify-center text-sm text-slate-400">
      Sem dados de sentimento
    </div>
  )

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={80} dataKey="value" paddingAngle={3}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip formatter={(value) => [`${value} chamadas`, '']} />
        <Legend formatter={(value) => <span className="text-xs text-slate-600">{value}</span>} />
      </PieChart>
    </ResponsiveContainer>
  )
}
