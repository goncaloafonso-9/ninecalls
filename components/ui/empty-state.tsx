'use client'

import type { ReactNode } from 'react'

interface EmptyStateProps {
  icon?: ReactNode
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div
      className="nc-empty-state"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 32px',
        textAlign: 'center',
        gap: '12px',
      }}
    >
      {icon && (
        <div style={{ color: 'var(--text-muted)', marginBottom: '4px' }}>
          {icon}
        </div>
      )}
      <h3
        style={{
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--text-primary)',
          margin: 0,
        }}
      >
        {title}
      </h3>
      {description && (
        <p
          style={{
            fontSize: '13px',
            color: 'var(--text-muted)',
            margin: 0,
            maxWidth: '320px',
            lineHeight: 1.5,
          }}
        >
          {description}
        </p>
      )}
      {action && (
        <button
          onClick={action.onClick}
          style={{
            marginTop: '8px',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid var(--surface-border)',
            background: 'transparent',
            color: 'var(--text-primary)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'background 150ms ease',
            fontFamily: 'var(--font-geist), sans-serif',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
