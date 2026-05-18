'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'
import { format, parseISO } from 'date-fns'
import { pt } from 'date-fns/locale'

interface DailyStat {
  stat_date: string
  total_chamadas: number | null
  reservas_criadas: number | null
}

interface Props {
  data: DailyStat[]
}

interface TooltipProps {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}

function makeTooltip(label: string) {
  return function CustomTooltip({ active, payload }: TooltipProps) {
    if (!active || !payload?.length) return null
    return (
      <div style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        padding: '8px 12px',
      }}>
        <p style={{ fontSize: '13px', fontWeight: 600, color: payload[0].color, margin: 0 }}>
          {label}: {payload[0].value}
        </p>
      </div>
    )
  }
}

export function CallsVsReservasChart({ data }: Props) {
  if (!data.length) {
    return (
      <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
        Sem dados nos últimos 7 dias
      </div>
    )
  }

  const chartData = data
    .filter(d => d.stat_date && !isNaN(parseISO(d.stat_date).getTime()))
    .map(d => ({
      label: format(parseISO(d.stat_date), 'd/MM', { locale: pt }),
      chamadas: d.total_chamadas ?? 0,
      reservas: d.reservas_criadas ?? 0,
    }))

  const maxChamadas = Math.max(...chartData.map(d => d.chamadas), 1)
  const maxReservas = Math.max(...chartData.map(d => d.reservas), 1)

  // Nice ceiling: round up to next multiple of a sensible step
  function niceCeil(max: number): number {
    if (max <= 5) return 5
    const step = Math.pow(10, Math.floor(Math.log10(max)))
    return Math.ceil(max / step) * step
  }

  const ChamadasTooltip = makeTooltip('Chamadas')
  const ReservasTooltip = makeTooltip('Reservas')

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
      {/* ── Chamadas ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#10b981', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Chamadas</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="32%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, niceCeil(maxChamadas)]}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<ChamadasTooltip />} cursor={{ fill: 'var(--surface-border)', opacity: 0.5 }} />
            <Bar dataKey="chamadas" fill="#10b981" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* ── Reservas ── */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <span style={{ width: '10px', height: '10px', borderRadius: '2px', background: '#3b82f6', flexShrink: 0 }} />
          <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>Reservas</span>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={chartData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }} barCategoryGap="32%">
            <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-border)" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              domain={[0, niceCeil(maxReservas)]}
              tick={{ fontSize: 10, fill: 'var(--text-muted)' }}
              axisLine={false}
              tickLine={false}
              allowDecimals={false}
              width={28}
            />
            <Tooltip content={<ReservasTooltip />} cursor={{ fill: 'var(--surface-border)', opacity: 0.5 }} />
            <Bar dataKey="reservas" fill="#3b82f6" radius={[3, 3, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
