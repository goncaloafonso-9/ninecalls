'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle } from 'lucide-react'

interface NoShowButtonProps {
  bookingId: string
  horasRestantes: number
}

export function NoShowButton({ bookingId, horasRestantes }: NoShowButtonProps) {
  const [loading, setLoading] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const router = useRouter()

  async function handleNoShow() {
    if (!confirmed) {
      setConfirmed(true)
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/client/mark-no-show', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ booking_id: bookingId }),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error ?? 'Erro ao marcar no-show')
      }

      toast.success('No-show registado')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Erro inesperado')
      setLoading(false)
      setConfirmed(false)
    }
  }

  if (confirmed) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-xs text-amber-600 font-medium">Tem a certeza?</span>
        <button
          onClick={handleNoShow}
          disabled={loading}
          className="px-2.5 py-1 rounded text-xs font-medium bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 transition-colors"
        >
          {loading ? 'A registar...' : 'Confirmar'}
        </button>
        <button
          onClick={() => setConfirmed(false)}
          className="px-2.5 py-1 rounded text-xs font-medium text-slate-500 hover:text-slate-700"
        >
          Cancelar
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleNoShow}
      title={`Janela activa: ${horasRestantes}h restantes`}
      className="flex items-center gap-1.5 px-2.5 py-1 rounded text-xs font-medium text-amber-600 hover:bg-amber-50 border border-amber-200 transition-colors"
    >
      <AlertTriangle className="w-3 h-3" />
      No-Show
    </button>
  )
}
