'use client'

import { useState } from 'react'
import { CheckCircle, XCircle, AlertCircle, RotateCcw } from 'lucide-react'

interface ConfirmActionsProps {
  uuid: string
  type: 'takeaway' | 'ultima-hora'
}

type Status =
  | { kind: 'idle' }
  | { kind: 'loading'; action: 'confirmar' | 'rejeitar' }
  | { kind: 'success'; action: 'confirmar' | 'rejeitar' }
  | { kind: 'error'; reason: 'already_processed' | 'expired' | 'generic' }

export function ConfirmActions({ uuid, type }: ConfirmActionsProps) {
  const [status, setStatus] = useState<Status>({ kind: 'idle' })

  const confirmLabel = type === 'ultima-hora' ? 'Aceitar' : 'Confirmar'
  const successLabel = type === 'ultima-hora' ? 'aceite' : 'confirmado'

  async function handleAction(action: 'confirmar' | 'rejeitar') {
    setStatus({ kind: 'loading', action })

    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 10_000)

    try {
      const res = await fetch(`/api/confirm/${type}/${uuid}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
        signal: controller.signal,
      })

      clearTimeout(timeout)

      if (res.ok) {
        setStatus({ kind: 'success', action })
        return
      }

      if (res.status === 409) {
        setStatus({ kind: 'error', reason: 'already_processed' })
        return
      }

      if (res.status === 410) {
        setStatus({ kind: 'error', reason: 'expired' })
        return
      }

      setStatus({ kind: 'error', reason: 'generic' })
    } catch {
      clearTimeout(timeout)
      setStatus({ kind: 'error', reason: 'generic' })
    }
  }

  if (status.kind === 'success') {
    const accepted = status.action === 'confirmar'
    return (
      <div className="text-center py-2">
        <div className={`w-12 h-12 rounded-2xl ${accepted ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-3`}>
          {accepted
            ? <CheckCircle className="w-6 h-6 text-emerald-600" />
            : <XCircle className="w-6 h-6 text-slate-400" />
          }
        </div>
        <p className="text-sm font-semibold text-slate-900">
          {accepted ? `Pedido ${successLabel} com sucesso` : 'Pedido rejeitado'}
        </p>
        {accepted && (
          <p className="text-xs text-slate-400 mt-1">O cliente será notificado.</p>
        )}
      </div>
    )
  }

  if (status.kind === 'error' && status.reason === 'already_processed') {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-slate-400" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Pedido já processado</p>
        <p className="text-xs text-slate-400 mt-1">Este pedido já tinha sido respondido.</p>
      </div>
    )
  }

  if (status.kind === 'error' && status.reason === 'expired') {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-amber-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Link expirado</p>
        <p className="text-xs text-slate-400 mt-1">O tempo para responder a este pedido expirou.</p>
      </div>
    )
  }

  if (status.kind === 'error' && status.reason === 'generic') {
    return (
      <div className="text-center py-2">
        <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-3">
          <AlertCircle className="w-6 h-6 text-red-500" />
        </div>
        <p className="text-sm font-semibold text-slate-900">Ocorreu um erro</p>
        <p className="text-xs text-slate-400 mt-1 mb-3">Verifique a ligação e tente novamente.</p>
        <button
          onClick={() => setStatus({ kind: 'idle' })}
          className="flex items-center gap-1.5 mx-auto text-sm text-slate-600 hover:text-slate-900 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          Tentar novamente
        </button>
      </div>
    )
  }

  const isLoading = status.kind === 'loading'

  return (
    <div className="grid grid-cols-2 gap-3">
      <button
        onClick={() => handleAction('rejeitar')}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl border-2 border-slate-200 text-slate-700 font-semibold text-sm hover:border-red-300 hover:text-red-600 hover:bg-red-50 disabled:opacity-50 transition-all"
      >
        <XCircle className="w-5 h-5" />
        {isLoading && (status as { action: string }).action === 'rejeitar' ? 'A rejeitar...' : 'Rejeitar'}
      </button>
      <button
        onClick={() => handleAction('confirmar')}
        disabled={isLoading}
        className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-2xl bg-emerald-500 text-white font-semibold text-sm hover:bg-emerald-600 disabled:opacity-50 transition-all"
      >
        <CheckCircle className="w-5 h-5" />
        {isLoading && (status as { action: string }).action === 'confirmar' ? 'A processar...' : confirmLabel}
      </button>
    </div>
  )
}
