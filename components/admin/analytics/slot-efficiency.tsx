'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

interface Props {
  restaurantId: string
  cycleId?: string
}

export function SlotEfficiency({ restaurantId, cycleId }: Props) {
  const [avg, setAvg] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let query = supabase
        .from('calls')
        .select('numero_slots_tentados')
        .eq('restaurant_id', restaurantId)
        .eq('call_successful', true)
        .gt('numero_slots_tentados', 0)

      if (cycleId) query = query.eq('billing_cycle_id', cycleId)

      const { data: calls } = await query
      if (!calls || calls.length === 0) { setLoading(false); return }

      const total = calls.reduce((sum, c) => sum + (c.numero_slots_tentados ?? 0), 0)
      setAvg(Math.round((total / calls.length) * 10) / 10)
      setLoading(false)
    }
    load()
  }, [restaurantId, cycleId])

  if (loading) return <div className="h-20 bg-slate-100 rounded-lg animate-pulse" />
  if (avg === null) return (
    <div className="h-20 flex items-center justify-center text-sm text-slate-400">Sem dados de eficiência</div>
  )

  const level = avg < 2 ? 'excelente' : avg <= 4 ? 'normal' : 'atencao'
  const color = { excelente: 'text-emerald-600', normal: 'text-amber-600', atencao: 'text-red-600' }[level]
  const label = { excelente: 'Excelente', normal: 'Normal', atencao: 'Necessita atenção' }[level]
  const bg = { excelente: 'bg-emerald-50 border-emerald-200', normal: 'bg-amber-50 border-amber-200', atencao: 'bg-red-50 border-red-200' }[level]

  return (
    <div className={cn('border rounded-xl p-4', bg)}>
      <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Eficiência de Slots</p>
      <div className="flex items-end gap-2 mt-1">
        <span className={cn('text-3xl font-bold', color)}>{avg}</span>
        <span className="text-sm text-slate-400 pb-0.5">slots/reserva</span>
      </div>
      <p className={cn('text-xs font-medium mt-1', color)}>{label}</p>
      <p className="text-xs text-slate-400 mt-0.5">&lt;2 = excelente · 2–4 = normal · &gt;4 = atenção</p>
    </div>
  )
}
