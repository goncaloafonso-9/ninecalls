'use client'

import { useState } from 'react'
import { CreditCard } from 'lucide-react'

interface StripeActionsPanelProps {
  clientId: string
  stripeCustomerId: string | null
}

export function StripeActionsPanel({ clientId, stripeCustomerId }: StripeActionsPanelProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleStripeAction() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/reenviar-portal-stripe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')
      window.open(json.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center gap-2 mb-4">
        <CreditCard className="w-4 h-4 text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-900">Stripe</h3>
      </div>

      {stripeCustomerId ? (
        <div className="space-y-2">
          <p className="text-xs text-slate-400">Customer ID</p>
          <p className="text-xs font-mono text-slate-700 break-all">{stripeCustomerId}</p>
          <div className="flex items-center gap-1.5 mt-2">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="text-xs text-green-700">Stripe configurado</span>
          </div>
          <button
            onClick={handleStripeAction}
            disabled={loading}
            className="w-full mt-2 text-xs bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'A gerar...' : 'Gerar Link Portal Stripe'}
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-slate-300" />
            <span className="text-xs text-slate-500">Sem customer Stripe</span>
          </div>
          <button
            onClick={handleStripeAction}
            disabled={loading}
            className="w-full text-xs border border-slate-200 text-slate-700 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'A criar...' : 'Criar Customer Stripe'}
          </button>
        </div>
      )}

      {error && (
        <p className="mt-2 text-xs text-red-600 bg-red-50 border border-red-200 rounded px-2 py-1.5">
          {error}
        </p>
      )}
    </div>
  )
}
