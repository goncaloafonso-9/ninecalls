'use client'

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'

interface CallTypeData {
  tipo: string
  count: number
}

const COLORS: Record<string, string> = {
  agendamento:   '#10b981',
  takeaway:      '#3b82f6',
  ultima_hora:   '#f59e0b',
  apoio:         '#64748b',
  transferencia: '#8b5cf6',
  spam_hangup:   '#cbd5e1',
}

const LABELS: Record<string, string> = {
  agendamento:   'Agendamento',
  takeaway:      'Takeaway',
  ultima_hora:   'Última Hora',
  apoio:         'Apoio / Info',
  transferencia: 'Transferência',
  spam_hangup:   'Spam / Abandono',
}

interface CallTypeChartProps {
  data: CallTypeData[]
  total: number
}

export function CallTypeChart({ data, total }: CallTypeChartProps) {
  if (!data.length || total === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-slate-400 text-sm">
        Sem dados no período
      </div>
    )
  }

  const chartData = data.map(d => ({
    name: LABELS[d.tipo] ?? d.tipo,
    value: d.count,
    color: COLORS[d.tipo] ?? '#94a3b8',
    pct: Math.round((d.count / total) * 100),
  }))

  return (
    <div className="flex items-start gap-4">
      {/* Donut */}
      <div className="relative shrink-0" style={{ width: 120, height: 120 }}>
        <ResponsiveContainer width={120} height={120}>
          <PieChart>
            <Pie
              data={chartData}
              cx={55}
              cy={55}
              innerRadius={38}
              outerRadius={55}
              paddingAngle={2}
              dataKey="value"
              strokeWidth={0}
            >
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{ fontSize: 12, border: '1px solid #e2e8f0', borderRadius: 8 }}
            />
          </PieChart>
        </ResponsiveContainer>
        {/* Center label */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-slate-900">{total}</span>
          <span className="text-[10px] text-slate-400">chamadas</span>
        </div>
      </div>

      {/* Legend */}
      <div className="flex-1 space-y-1.5 py-1">
        {chartData.map((d, i) => (
          <div key={i} className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5 min-w-0">
              <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
              <span className="text-xs text-slate-600 truncate">{d.name}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-medium text-slate-900">{d.value}</span>
              <span className="text-xs text-slate-400 w-8 text-right">{d.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
