'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle, XCircle } from 'lucide-react'

interface ConfirmActionsProps {
  uuid: string
  type: 'takeaway' | 'ultima-hora'
}

export function ConfirmActions({ uuid, type }: ConfirmActionsProps) {
  const [loading, setLoading] = useState<'confirm' | 'reject' | null>(null)
  const router = useRouter()

  async function handleAction(action: 'confirmar' | 'rejeitar') {
    setLoading(action === 'confirmar' ? 'confirm' : 'reject')
    try {
      const res = await fetch(`/api/confirm/${type}/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      })

      if (!res.ok) throw new Error('Erro ao processar')

      router.push(`/confirm/resultado?type=${type}&action=${action}`)
    } catch {
      setLoading(null)
      alert('Erro ao processar. Tente novamente.')
    }
  }

  const confirmLabel = type === 'ultima-hora' ? 'Aceitar' : 'Confirmar'
  const rejectLabel  = 'Rejeitar'

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => handleAction('rejeitar')}
        disabled={!!loading}
        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
      >
        <XCircle className="w-5 h-5" />
        {loading === 'reject' ? 'A rejeitar...' : rejectLabel}
      </button>
      <button
        onClick={() => handleAction('confirmar')}
        disabled={!!loading}
        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
      >
        <CheckCircle className="w-5 h-5" />
        {loading === 'confirm' ? 'A confirmar...' : confirmLabel}
      </button>
    </div>
  )
}
