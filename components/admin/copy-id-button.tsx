'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'

interface CopyIdButtonProps {
  id: string
}

export function CopyIdButton({ id }: CopyIdButtonProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(id)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback for older browsers
      const el = document.createElement('textarea')
      el.value = id
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
      <code
        style={{
          fontSize: '11px',
          fontFamily: 'var(--font-geist-mono), monospace',
          color: 'var(--text-muted)',
          background: 'var(--surface-2, var(--surface-1))',
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          padding: '2px 8px',
          letterSpacing: '0.02em',
        }}
      >
        {id}
      </code>
      <button
        onClick={handleCopy}
        title={copied ? 'Copiado!' : 'Copiar ID'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          fontSize: '11px',
          fontWeight: 500,
          color: copied ? 'var(--green-600, #16a34a)' : 'var(--text-muted)',
          background: 'var(--surface-1)',
          border: '1px solid var(--surface-border)',
          borderRadius: '6px',
          padding: '3px 8px',
          cursor: 'pointer',
          transition: 'color 150ms ease, background 150ms ease',
          whiteSpace: 'nowrap',
        }}
        onMouseEnter={e => {
          if (!copied) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-primary)'
        }}
        onMouseLeave={e => {
          if (!copied) (e.currentTarget as HTMLButtonElement).style.color = 'var(--text-muted)'
        }}
      >
        {copied ? (
          <Check style={{ width: '11px', height: '11px' }} />
        ) : (
          <Copy style={{ width: '11px', height: '11px' }} />
        )}
        {copied ? 'Copiado!' : 'Copiar ID'}
      </button>
    </div>
  )
}
