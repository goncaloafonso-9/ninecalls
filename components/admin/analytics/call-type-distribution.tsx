'use client'

import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantId: string
  dateRange?: { from: string; to: string }
}

const TYPE_COLORS: Record<string, string> = {
  agendamento:  '#00D4AA',
  reagendamento: '#22b8cf',
  takeaway:     '#845ef7',
  ultima_hora:  '#f59f00',
  cancelamento: '#ff6b6b',
  apoio:        '#74c0fc',
  transferencia:'#ffa94d',
  spam_hangup:  '#ced4da',
}

const TYPE_LABELS: Record<string, string> = {
  agendamento:   'Agendamento',
  reagendamento: 'Reagendamento',
  takeaway:      'Takeaway',
  ultima_hora:   'Última Hora',
  cancelamento:  'Cancelamento',
  apoio:         'Apoio',
  transferencia: 'Transferência',
  spam_hangup:   'Spam/Hangup',
}

export function CallTypeDistribution({ restaurantId, dateRange }: Props) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let query = supabase
        .from('calls')
        .select('tipo_chamada')
        .eq('restaurant_id', restaurantId)
        .not('tipo_chamada', 'is', null)

      if (dateRange) query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to)

      const { data: calls } = await query
      if (!calls) { setLoading(false); return }

      const counts: Record<string, number> = {}
      for (const c of calls) {
        if (c.tipo_chamada) counts[c.tipo_chamada] = (counts[c.tipo_chamada] ?? 0) + 1
      }

      setData(
        Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .map(([key, value]) => ({
            name: TYPE_LABELS[key] ?? key,
            value,
            color: TYPE_COLORS[key] ?? '#888',
          }))
      )
      setLoading(false)
    }
    load()
  }, [restaurantId, dateRange])

  if (loading) return <div className="h-64 bg-slate-100 rounded-lg animate-pulse" />

  if (data.length === 0) return (
    <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sem dados de chamadas</div>
  )

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, data.length * 36)}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 30, left: 90, bottom: 0 }}>
        <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: '#475569' }} tickLine={false} axisLine={false} width={88} />
        <Tooltip formatter={(value) => [`${value} chamadas`, '']} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
