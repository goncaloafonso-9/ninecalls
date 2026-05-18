'use client'

import { useEffect, useState } from 'react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { subDays, startOfDay, format } from 'date-fns'

interface Props {
  restaurantId: string
}

export function AgentSuccessRate({ restaurantId }: Props) {
  const [rate, setRate] = useState<number | null>(null)
  const [delta, setDelta] = useState<number | null>(null)
  const [sparkData, setSparkData] = useState<number[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      const now = new Date()

      // Last 7 days daily success rate
      const dailyRates: number[] = []
      for (let d = 6; d >= 0; d--) {
        const day = startOfDay(subDays(now, d))
        const nextDay = startOfDay(subDays(now, d - 1))
        const { data: calls } = await supabase
          .from('calls')
          .select('call_successful')
          .eq('restaurant_id', restaurantId)
          .gte('created_at', day.toISOString())
          .lt('created_at', nextDay.toISOString())

        const total = calls?.length ?? 0
        const success = calls?.filter(c => c.call_successful === true).length ?? 0
        dailyRates.push(total > 0 ? Math.round((success / total) * 100) : 0)
      }

      const currentWeekRate = dailyRates.reduce((a, b) => a + b, 0) / dailyRates.filter(r => r > 0).length || 0

      // Previous 7 days for delta
      const prev7Start = startOfDay(subDays(now, 14))
      const prev7End = startOfDay(subDays(now, 7))
      const { data: prevCalls } = await supabase
        .from('calls')
        .select('call_successful')
        .eq('restaurant_id', restaurantId)
        .gte('created_at', prev7Start.toISOString())
        .lt('created_at', prev7End.toISOString())

      const prevTotal = prevCalls?.length ?? 0
      const prevSuccess = prevCalls?.filter(c => c.call_successful === true).length ?? 0
      const prevRate = prevTotal > 0 ? Math.round((prevSuccess / prevTotal) * 100) : 0

      setRate(Math.round(currentWeekRate))
      setDelta(prevRate > 0 ? Math.round(currentWeekRate) - prevRate : null)
      setSparkData(dailyRates)
      setLoading(false)
    }
    load()
  }, [restaurantId])

  if (loading) return <div className="h-24 bg-slate-100 rounded-lg animate-pulse" />

  const deltaPositive = (delta ?? 0) > 0
  const deltaNeutral = delta === 0 || delta === null

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-4">
      <div className="flex-1">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Taxa de Sucesso</p>
        <div className="flex items-end gap-2 mt-1">
          <span className="text-3xl font-bold text-slate-900">{rate ?? '–'}%</span>
          {delta !== null && (
            <div className={`flex items-center gap-0.5 text-sm pb-0.5 ${deltaPositive ? 'text-emerald-600' : deltaNeutral ? 'text-slate-400' : 'text-red-500'}`}>
              {deltaNeutral ? <Minus className="w-3.5 h-3.5" /> : deltaPositive ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
              {delta > 0 ? '+' : ''}{delta}pp
            </div>
          )}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">vs semana anterior</p>
      </div>
      <div className="w-28 h-14">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={sparkData.map((v, i) => ({ i, v }))} margin={{ top: 2, right: 2, left: 2, bottom: 2 }}>
            <Line type="monotone" dataKey="v" stroke="#00D4AA" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
