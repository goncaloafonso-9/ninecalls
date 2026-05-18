'use client'

'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer } from 'recharts'
import type { ReactNode } from 'react'

interface KpiCardProps {
  label: string
  value: string | number
  delta?: number
  deltaLabel?: string
  icon?: ReactNode
  sparklineData?: number[]
  hero?: boolean
  animationDelay?: number
  className?: string
}

export function KpiCard({
  label,
  value,
  delta,
  deltaLabel = 'vs período anterior',
  icon,
  sparklineData,
  hero = false,
  animationDelay = 0,
  className = '',
}: KpiCardProps) {
  const sparkData = sparklineData?.map((v, i) => ({ v, i }))

  const deltaPositive = delta !== undefined && delta > 0
  const deltaNegative = delta !== undefined && delta < 0

  return (
    <div
      className={`animate-in ${className}`}
      style={{
        animationDelay: `${animationDelay}ms`,
        background: hero ? 'var(--gray-950)' : 'var(--surface-1)',
        border: `1px solid ${hero ? 'transparent' : 'var(--surface-border)'}`,
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--card-padding)',
        minHeight: '120px',
        position: 'relative',
        overflow: 'hidden',
        transition: 'box-shadow 200ms ease, transform 200ms ease',
        cursor: 'default',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.boxShadow = 'var(--shadow-md)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.boxShadow = ''
        el.style.transform = ''
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '12px' }}>
        {icon && (
          <span style={{ color: hero ? 'rgba(255,255,255,0.5)' : 'var(--text-muted)', display: 'flex' }}>
            {icon}
          </span>
        )}
        <span
          style={{
            fontSize: '11px',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            color: hero ? 'rgba(255,255,255,0.55)' : 'var(--text-muted)',
          }}
        >
          {label}
        </span>
      </div>

      {/* Value */}
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: '2.25rem',
          fontWeight: 600,
          color: hero ? '#FFFFFF' : 'var(--text-primary)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontFeatureSettings: '"tnum"',
          marginBottom: '10px',
        }}
      >
        {value}
      </div>

      {/* Delta */}
      {delta !== undefined && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 500,
            color: hero
              ? 'rgba(255,255,255,0.6)'
              : deltaPositive
              ? 'var(--green-600)'
              : deltaNegative
              ? 'var(--red-600)'
              : 'var(--text-muted)',
          }}
        >
          {deltaPositive && <TrendingUp className="w-3.5 h-3.5" />}
          {deltaNegative && <TrendingDown className="w-3.5 h-3.5" />}
          {delta === 0 && <Minus className="w-3.5 h-3.5" />}
          <span>
            {delta > 0 ? '+' : ''}{delta}% {deltaLabel}
          </span>
        </div>
      )}

      {/* Sparkline */}
      {sparkData && sparkData.length > 0 && (
        <div
          style={{
            position: 'absolute',
            bottom: '16px',
            right: '16px',
            width: '80px',
            height: '36px',
            opacity: hero ? 0.4 : 1,
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={sparkData}>
              <defs>
                <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={hero ? '#ffffff' : '#3B82F6'} stopOpacity={0.15} />
                  <stop offset="95%" stopColor={hero ? '#ffffff' : '#3B82F6'} stopOpacity={0} />
                </linearGradient>
              </defs>
              <Line
                type="monotone"
                dataKey="v"
                stroke={hero ? '#ffffff' : '#3B82F6'}
                strokeWidth={1.5}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}
