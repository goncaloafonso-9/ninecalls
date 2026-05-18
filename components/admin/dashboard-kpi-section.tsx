'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatEuro } from '@/lib/utils'

type Mode = '7d' | 'month' | 'all'

interface DashboardStats {
  receita: number
  custos_ia: number
  taxa_conversao: number
  minutos: number
  mode: Mode
}

const MODES: { value: Mode; label: string }[] = [
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'month', label: 'Mês Corrente' },
  { value: 'all', label: 'Sempre' },
]

function SkeletonCard({ hero = false }: { hero?: boolean }) {
  return (
    <div
      style={{
        background: hero ? 'var(--gray-950)' : 'var(--surface-1)',
        border: `1px solid ${hero ? 'transparent' : 'var(--surface-border)'}`,
        borderRadius: 'var(--border-radius-lg)',
        padding: 'var(--card-padding)',
        minHeight: '120px',
      }}
    >
      <div
        style={{
          height: '10px',
          width: '100px',
          borderRadius: '4px',
          background: hero ? 'rgba(255,255,255,0.1)' : 'var(--surface-border)',
          marginBottom: '16px',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
      <div
        style={{
          height: '36px',
          width: '140px',
          borderRadius: '6px',
          background: hero ? 'rgba(255,255,255,0.12)' : 'var(--surface-border)',
          animation: 'pulse 1.5s ease-in-out infinite',
        }}
      />
    </div>
  )
}

interface KpiCardProps {
  label: string
  subLabel?: string
  value: string
  hero?: boolean
  delay?: number
}

function KpiCard({ label, subLabel, value, hero = false, delay = 0 }: KpiCardProps) {
  return (
    <div
      className="animate-in"
      style={{
        animationDelay: `${delay}ms`,
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
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = 'var(--shadow-md)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = ''
        el.style.transform = ''
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginBottom: '12px' }}>
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
        {subLabel && (
          <span
            style={{
              fontSize: '10px',
              color: hero ? 'rgba(255,255,255,0.35)' : 'var(--text-muted)',
              letterSpacing: '0.02em',
            }}
          >
            {subLabel}
          </span>
        )}
      </div>
      <div
        style={{
          fontFamily: 'var(--font-geist-mono), monospace',
          fontSize: '2.25rem',
          fontWeight: 600,
          color: hero ? '#FFFFFF' : 'var(--text-primary)',
          lineHeight: 1,
          letterSpacing: '-0.03em',
          fontFeatureSettings: '"tnum"',
        }}
      >
        {value}
      </div>
    </div>
  )
}

export function DashboardKpiSection() {
  const [mode, setMode] = useState<Mode>('month')
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchStats = useCallback(async (m: Mode) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/dashboard-stats?mode=${m}`)
      if (res.ok) {
        const data = await res.json() as DashboardStats
        setStats(data)
      }
    } catch {
      // silently fail — show stale data if any
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStats(mode)
  }, [mode, fetchStats])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
      {/* Mode toggle */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
        {MODES.map(m => (
          <button
            key={m.value}
            onClick={() => setMode(m.value)}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              padding: '4px 12px',
              borderRadius: '100px',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms ease, color 150ms ease',
              background: mode === m.value ? 'var(--gray-950)' : 'var(--surface-1)',
              color: mode === m.value ? '#fff' : 'var(--text-muted)',
              outline: mode === m.value ? 'none' : '1px solid var(--surface-border)',
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
          gap: 'var(--card-gap)',
        }}
      >
        {loading ? (
          <>
            <SkeletonCard hero />
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : (
          <>
            <KpiCard
              label="Receita Acumulada"
              subLabel={mode === 'month' ? 'pago + em curso' : undefined}
              value={stats ? formatEuro(stats.receita) : '—'}
              hero
              delay={0}
            />
            <KpiCard
              label="Custos IA"
              subLabel="chamadas × €0,14/min"
              value={stats ? formatEuro(stats.custos_ia) : '—'}
              delay={60}
            />
            <KpiCard
              label="Taxa de Conversão"
              subLabel="pessoas geradas ÷ chamadas"
              value={stats ? `${stats.taxa_conversao.toFixed(1)}%` : '—'}
              delay={120}
            />
            <KpiCard
              label="Minutos de Chamadas"
              subLabel="agentes activos"
              value={stats ? `${stats.minutos.toLocaleString('pt-PT')} min` : '—'}
              delay={180}
            />
          </>
        )}
      </div>
    </div>
  )
}
