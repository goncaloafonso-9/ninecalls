'use client'

import { useEffect, useState } from 'react'
import { X, CreditCard } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { toast } from 'sonner'
import { GoogleDriveButton } from '@/components/dashboard/google-drive-button'

const LS_KEY = 'nc-display-name'

export function DashboardSettingsModal({ driveLink }: { driveLink?: string | null }) {
  const [open, setOpen] = useState(false)
  const [nome, setNome] = useState('')
  const [portalLoading, setPortalLoading] = useState(false)
  const pathname = usePathname()

  // Extract slug from /dashboard/[slug]/...
  const slug = pathname.split('/')[2] ?? ''

  useEffect(() => {
    function handleOpen() {
      const stored = localStorage.getItem(LS_KEY)
      if (stored) setNome(stored)
      setOpen(true)
    }
    window.addEventListener('nc:open-settings', handleOpen)
    return () => window.removeEventListener('nc:open-settings', handleOpen)
  }, [])

  function handleSave() {
    const trimmed = nome.trim()
    if (!trimmed) return
    localStorage.setItem(LS_KEY, trimmed)
    window.dispatchEvent(new CustomEvent('nc:name-updated', { detail: trimmed }))
    toast.success('Nome actualizado')
    setOpen(false)
  }

  async function handleStripePortal() {
    if (!slug) {
      toast.error('Restaurante não encontrado')
      return
    }
    setPortalLoading(true)
    try {
      const res = await fetch('/api/client/portal-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug }),
      })
      const data = await res.json()
      if (data.url) {
        window.location.href = data.url
      } else {
        toast.error('Não foi possível abrir o portal de pagamentos')
      }
    } catch {
      toast.error('Erro ao aceder ao portal de pagamentos')
    } finally {
      setPortalLoading(false)
    }
  }

  if (!open) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        zIndex: 100,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
      }}
      onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}
    >
      <div
        style={{
          background: 'var(--bg-base, #fff)',
          borderRadius: '16px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.18)',
          width: '100%',
          maxWidth: '440px',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '20px 24px 16px',
            borderBottom: '1px solid var(--surface-border)',
          }}
        >
          <h2
            style={{
              fontSize: '16px',
              fontWeight: 600,
              color: 'var(--text-primary)',
              margin: 0,
              letterSpacing: '-0.01em',
            }}
          >
            Configurações
          </h2>
          <button
            onClick={() => setOpen(false)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              border: 'none',
              background: 'transparent',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              transition: 'background 150ms ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <X style={{ width: '15px', height: '15px' }} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

          {/* Nome */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-secondary)',
              }}
            >
              Nome de utilizador
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={nome}
                onChange={e => setNome(e.target.value)}
                placeholder="O teu nome"
                style={{
                  flex: 1,
                  height: '40px',
                  padding: '0 12px',
                  borderRadius: '8px',
                  border: '1px solid var(--surface-border)',
                  background: 'var(--surface-1)',
                  fontSize: '14px',
                  color: 'var(--text-primary)',
                  outline: 'none',
                  fontFamily: 'inherit',
                  transition: 'border-color 150ms, box-shadow 150ms',
                }}
                onFocus={e => {
                  e.currentTarget.style.borderColor = 'var(--blue-500)'
                  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(59,130,246,0.12)'
                }}
                onBlur={e => {
                  e.currentTarget.style.borderColor = 'var(--surface-border)'
                  e.currentTarget.style.boxShadow = 'none'
                }}
                onKeyDown={e => { if (e.key === 'Enter') handleSave() }}
              />
              <button
                onClick={handleSave}
                disabled={!nome.trim()}
                style={{
                  height: '40px',
                  padding: '0 16px',
                  borderRadius: '8px',
                  border: 'none',
                  background: 'var(--blue-600, #2563eb)',
                  color: '#fff',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: !nome.trim() ? 'not-allowed' : 'pointer',
                  opacity: !nome.trim() ? 0.6 : 1,
                  fontFamily: 'inherit',
                  transition: 'background 150ms, opacity 150ms',
                  whiteSpace: 'nowrap',
                }}
              >
                Guardar
              </button>
            </div>
          </div>

          {/* Stripe Portal */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
              Pagamentos
            </label>
            <button
              onClick={handleStripePortal}
              disabled={portalLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                height: '40px',
                padding: '0 16px',
                borderRadius: '8px',
                border: '1px solid var(--surface-border)',
                background: 'var(--surface-1)',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: portalLoading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                transition: 'background 150ms ease',
                opacity: portalLoading ? 0.6 : 1,
              }}
              onMouseEnter={e => { if (!portalLoading) e.currentTarget.style.background = 'var(--bg-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-1)' }}
            >
              <CreditCard style={{ width: '15px', height: '15px', color: 'var(--text-muted)' }} />
              {portalLoading ? 'A redirecionar...' : 'Gerir métodos de pagamento'}
            </button>
          </div>

          {/* Google Drive */}
          {driveLink && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 500, color: 'var(--text-secondary)' }}>
                Documentos
              </label>
              <GoogleDriveButton driveLink={driveLink} fullWidth />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
