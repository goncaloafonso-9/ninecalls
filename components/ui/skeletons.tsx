import React from 'react'

function Skeleton({ width = '100%', height = '16px', borderRadius = '6px', style = {} }: {
  width?: string
  height?: string
  borderRadius?: string
  style?: React.CSSProperties
}) {
  return (
    <div
      style={{
        width,
        height,
        borderRadius,
        background: 'var(--bg-muted)',
        animation: 'skeleton-pulse 1.5s ease-in-out infinite',
        ...style,
      }}
    />
  )
}

export function KpiCardSkeleton() {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        padding: '20px 24px',
      }}
    >
      <Skeleton width="50%" height="12px" style={{ marginBottom: '12px' }} />
      <Skeleton width="70%" height="28px" />
    </div>
  )
}

export function TableSkeleton({ rows = 6, cols = 5 }: { rows?: number; cols?: number }) {
  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {/* Header row */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--bg-subtle)',
        }}
      >
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} width={`${80 + (i % 3) * 30}px`} height="10px" />
        ))}
      </div>
      {/* Body rows */}
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          style={{
            display: 'flex',
            gap: '16px',
            padding: '14px 16px',
            borderBottom: i < rows - 1 ? '1px solid var(--surface-border)' : 'none',
            alignItems: 'center',
          }}
        >
          {Array.from({ length: cols }).map((_, j) => (
            <Skeleton key={j} width={j === 0 ? '140px' : `${60 + (j * 20) % 80}px`} height="13px" />
          ))}
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton({ kpiCount = 4 }: { kpiCount?: number }) {
  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '28px',
        minHeight: '100%',
        background: 'var(--bg-base)',
      }}
    >
      <style>{`
        @keyframes skeleton-pulse {
          0%, 100% { opacity: 1 }
          50% { opacity: 0.5 }
        }
      `}</style>
      {/* Header */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <Skeleton width="180px" height="24px" />
        <Skeleton width="240px" height="14px" />
      </div>
      {/* KPI grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--card-gap)' }}>
        {Array.from({ length: kpiCount }).map((_, i) => (
          <KpiCardSkeleton key={i} />
        ))}
      </div>
      {/* Table */}
      <TableSkeleton rows={8} cols={5} />
    </div>
  )
}
