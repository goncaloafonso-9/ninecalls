'use client'

import { useState } from 'react'

interface ReenviarPortalButtonProps {
  clientId: string
}

export function ReenviarPortalButton({ clientId }: ReenviarPortalButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reenviar-portal-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao gerar portal')
      window.open(json.url, '_blank')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          fontSize: '12px',
          background: loading ? 'var(--red-400, #f87171)' : 'var(--red-600)',
          color: '#ffffff',
          padding: '6px 12px',
          borderRadius: '8px',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'var(--font-geist), sans-serif',
          fontWeight: 500,
          transition: 'background 150ms ease',
          opacity: loading ? 0.7 : 1,
        }}
      >
        {loading ? 'A gerar...' : 'Reenviar Portal Stripe'}
      </button>
      {error && (
        <span style={{ fontSize: '11px', color: 'var(--red-600)', maxWidth: '200px', textAlign: 'right' }}>
          {error}
        </span>
      )}
    </div>
  )
}
