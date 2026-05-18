'use client'

import { useEffect, useCallback } from 'react'

interface Field {
  label: string
  value: React.ReactNode
}

interface Props {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  fields: Field[]
}

export function RowDetailModal({ open, onClose, title, subtitle, fields }: Props) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') onClose()
  }, [onClose])

  useEffect(() => {
    if (!open) return
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [open, handleKey])

  if (!open) return null

  return (
    <div
      className="nc-sheet-overlay"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.45)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 150ms ease',
      }}
      onClick={onClose}
    >
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
      <div
        className="nc-sheet-panel"
        style={{
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: '480px',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 150ms ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Drag handle — visível apenas em mobile */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0', flexShrink: 0 }}>
          <div style={{ width: '36px', height: '4px', borderRadius: '2px', background: 'var(--bg-overlay)' }} className="nc-drag-handle" />
        </div>

        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            padding: '16px 24px',
            borderBottom: '1px solid var(--surface-border)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>
              {title}
            </h2>
            {subtitle && (
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
                {subtitle}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              lineHeight: 1,
              flexShrink: 0,
              transition: 'background 120ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Fields */}
        <div style={{ padding: '20px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {fields.map((f, i) => (
            f.value !== null && f.value !== undefined && f.value !== '' ? (
              <div key={i}>
                <p style={{
                  fontSize: '10px',
                  fontWeight: 600,
                  textTransform: 'uppercase',
                  letterSpacing: '0.07em',
                  color: 'var(--text-muted)',
                  margin: '0 0 4px',
                }}>
                  {f.label}
                </p>
                <div style={{ fontSize: '13px', color: 'var(--text-primary)', lineHeight: 1.5 }}>
                  {f.value}
                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    </div>
  )
}
