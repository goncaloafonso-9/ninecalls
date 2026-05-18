'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { OnboardingWizard } from '@/components/admin/onboarding-wizard'

export function AdminOnboardingSheet() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handler = () => setOpen(true)
    window.addEventListener('nc:open-onboarding', handler)
    return () => window.removeEventListener('nc:open-onboarding', handler)
  }, [])

  if (!open) return null

  return (
    <>
      {/* Overlay — flex centers the panel */}
      <div
        className="nc-sheet-overlay"
        onClick={() => setOpen(false)}
        aria-hidden="true"
      >
      {/* Panel */}
      <div className="nc-sheet-panel nc-sheet-panel-full-mobile" role="dialog" aria-modal="true" aria-label="Novo Cliente" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '24px 32px',
            borderBottom: '1px solid var(--surface-border)',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                fontSize: '18px',
                fontWeight: 600,
                color: 'var(--text-primary)',
                margin: 0,
                letterSpacing: '-0.025em',
              }}
            >
              Novo Cliente
            </h2>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', margin: '4px 0 0' }}>
              Cria um novo cliente e os seus restaurantes
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            aria-label="Fechar"
          >
            <X style={{ width: '16px', height: '16px' }} />
          </button>
        </div>

        {/* Content — wizard */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 32px 32px' }}>
          <OnboardingWizard />
        </div>
      </div>
      </div>
    </>
  )
}
