'use client'

import { useState } from 'react'
import { CreditCard, ExternalLink } from 'lucide-react'

interface StripePortalButtonProps {
  slug: string
}

export function StripePortalButton({ slug }: StripePortalButtonProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/client/portal-stripe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Ocorreu um erro')
      return
    }

    window.location.href = json.url
  }

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: '6px', flexShrink: 0 }}>
      <button
        onClick={handleClick}
        disabled={loading}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          height: '40px',
          padding: '0 16px',
          borderRadius: '8px',
          border: '1px solid var(--surface-border)',
          background: 'var(--surface-1)',
          color: 'var(--text-primary)',
          fontSize: '13px',
          fontWeight: 500,
          cursor: loading ? 'not-allowed' : 'pointer',
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          transition: 'background 150ms ease',
          opacity: loading ? 0.6 : 1,
        }}
        onMouseEnter={e => { if (!loading) (e.currentTarget as HTMLButtonElement).style.background = 'var(--bg-muted)' }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'var(--surface-1)' }}
      >
        {loading ? (
          <span style={{ width: '15px', height: '15px', border: '2px solid var(--text-muted)', borderTopColor: 'transparent', borderRadius: '50%', display: 'inline-block', animation: 'spin 0.8s linear infinite' }} />
        ) : (
          <CreditCard style={{ width: '15px', height: '15px', color: 'var(--text-muted)' }} />
        )}
        {loading ? 'A redirecionar...' : 'Gerir Métodos de Pagamento'}
        {!loading && <ExternalLink style={{ width: '13px', height: '13px', color: 'var(--text-muted)' }} />}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </button>
      {error && (
        <p className="text-xs text-red-600">{error}</p>
      )}
    </div>
  )
}
