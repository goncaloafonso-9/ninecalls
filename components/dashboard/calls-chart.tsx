'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Area,
  AreaChart,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DailyStat {
  stat_date: string
  total_chamadas: number
}

interface CallsChartProps {
  data: DailyStat[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ value: number; payload: { date: string } }>
  label?: string
}

function CustomTooltip({ active, payload }: TooltipProps) {
  if (!active || !payload?.length) return null
  const rawDate = payload[0]?.payload?.date
  const parsedDate = rawDate ? parseISO(rawDate) : null
  const isValid = parsedDate && !isNaN(parsedDate.getTime())
  return (
    <div style={{ background: 'var(--surface-1)', border: '1px solid var(--surface-border)', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)', padding: '6px 12px' }}>
      <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: 0 }}>
        {isValid ? format(parsedDate!, 'd MMM', { locale: pt }) : ''}
      </p>
      <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text-primary)', margin: '2px 0 0' }}>
        {payload[0].value} chamada{payload[0].value !== 1 ? 's' : ''}
      </p>
    </div>
  )
}

export function CallsChart({ data }: CallsChartProps) {
  if (!data.length) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Sem dados no período seleccionado
      </div>
    )
  }

  const chartData = data
    .filter(d => d.stat_date && !isNaN(parseISO(d.stat_date).getTime()))
    .map(d => ({
      date: d.stat_date,
      chamadas: d.total_chamadas,
      label: format(parseISO(d.stat_date), 'd/MM', { locale: pt }),
    }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="emeraldGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.15} />
            <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#94a3b8' }}
          axisLine={false}
          tickLine={false}
          allowDecimals={false}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#e2e8f0', strokeWidth: 1 }} />
        <Area
          type="monotone"
          dataKey="chamadas"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#emeraldGrad)"
          dot={false}
          activeDot={{ r: 4, fill: '#10b981', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}
