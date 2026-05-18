'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantId: string
  cycleId?: string
}

const COLORS = { sala: '#00D4AA', terraco: '#74c0fc', esplanada: '#f59f00', sem_preferencia: '#ced4da' }
const LABELS = { sala: 'Sala', terraco: 'Terraço', esplanada: 'Esplanada', sem_preferencia: 'Sem preferência' }

export function SpacePreference({ restaurantId, cycleId }: Props) {
  const [data, setData] = useState<{ name: string; value: number; color: string }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let query = supabase
        .from('calls')
        .select('espaco_preferido')
        .eq('restaurant_id', restaurantId)
        .not('espaco_preferido', 'is', null)

      if (cycleId) query = query.eq('billing_cycle_id', cycleId)

      const { data: calls } = await query
      if (!calls) { setLoading(false); return }

      const counts = { sala: 0, terraco: 0, esplanada: 0, sem_preferencia: 0 }
      for (const c of calls) {
        const k = c.espaco_preferido as keyof typeof counts
        if (k in counts) counts[k]++
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
  }, [restaurantId, cycleId])

  if (loading) return <div className="h-48 bg-slate-100 rounded-lg animate-pulse" />
  if (data.length === 0) return (
    <div className="h-48 flex items-center justify-center text-sm text-slate-400">Sem dados de preferência</div>
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
