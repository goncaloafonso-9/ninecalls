'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props {
  restaurantId: string
  dateRange?: { from: string; to: string }
}

export function TransferReasons({ restaurantId, dateRange }: Props) {
  const [data, setData] = useState<{ motivo: string; count: number; pct: number }[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()
    async function load() {
      setLoading(true)
      let query = supabase
        .from('calls')
        .select('motivo_transferencia')
        .eq('restaurant_id', restaurantId)
        .eq('tipo_chamada', 'transferencia')
        .not('motivo_transferencia', 'is', null)

      if (dateRange) query = query.gte('created_at', dateRange.from).lte('created_at', dateRange.to)

      const { data: calls } = await query
      if (!calls || calls.length === 0) { setLoading(false); return }

      const counts: Record<string, number> = {}
      for (const c of calls) {
        if (c.motivo_transferencia) counts[c.motivo_transferencia] = (counts[c.motivo_transferencia] ?? 0) + 1
      }

      const total = calls.length
      setData(
        Object.entries(counts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 5)
          .map(([motivo, count]) => ({ motivo, count, pct: Math.round((count / total) * 100) }))
      )
      setLoading(false)
    }
    load()
  }, [restaurantId, dateRange])

  if (loading) return <div className="h-32 bg-slate-100 rounded-lg animate-pulse" />
  if (data.length === 0) return null

  return (
    <div className="space-y-2">
      {data.map(({ motivo, count, pct }) => (
        <div key={motivo} className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-700 truncate">{motivo}</p>
            <div className="mt-1 h-1 bg-slate-100 rounded-full overflow-hidden">
              <div className="h-full bg-orange-400 rounded-full" style={{ width: `${pct}%` }} />
            </div>
          </div>
          <span className="text-xs font-medium text-slate-500 shrink-0 w-12 text-right">{count}× ({pct}%)</span>
        </div>
      ))}
    </div>
  )
}
