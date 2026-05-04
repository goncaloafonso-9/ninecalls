'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { RestaurantEstado } from '@/types'

interface RestaurantActionsProps {
  restaurantId: string
  slug: string
  estado: RestaurantEstado
  hasActiveAgent: boolean
  hasTransferPhone: boolean
  hasDriveFolder: boolean
  hasObjetivo: boolean
}

export function RestaurantActions({
  restaurantId,
  slug,
  estado,
  hasActiveAgent,
  hasTransferPhone,
  hasDriveFolder,
  hasObjetivo,
}: RestaurantActionsProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [confirmAction, setConfirmAction] = useState<string | null>(null)

  async function callAPI(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Erro desconhecido')
    return json
  }

  async function handleEstado(acao: 'pausar' | 'retomar' | 'rescindir') {
    setLoading(acao)
    try {
      await callAPI('/api/admin/estado-restaurante', { restaurantId, acao })
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(null)
      setConfirmAction(null)
    }
  }

  async function handleActivarGarantia() {
    setLoading('garantia')
    try {
      await callAPI('/api/admin/activar-garantia', { restaurantId })
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  const guarantiaPreconditionsMet = hasActiveAgent && hasTransferPhone && hasDriveFolder && hasObjetivo

  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* em_construcao */}
      {estado === 'em_construcao' && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleActivarGarantia}
            disabled={!guarantiaPreconditionsMet || loading === 'garantia'}
            className={cn(
              'text-sm px-4 py-2 rounded-lg font-medium transition-colors',
              guarantiaPreconditionsMet
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed'
            )}
          >
            {loading === 'garantia' ? 'A activar...' : 'Activar Garantia'}
          </button>
          {!guarantiaPreconditionsMet && (
            <p className="text-xs text-amber-600">
              {!hasActiveAgent && '⚠ Sem agente activo · '}
              {!hasTransferPhone && '⚠ Sem número de transferência · '}
              {!hasDriveFolder && '⚠ Sem pasta Google Drive · '}
              {!hasObjetivo && '⚠ Objectivo de garantia = 0'}
            </p>
          )}
        </div>
      )}

      {/* em_garantia */}
      {estado === 'em_garantia' && (
        <>
          {confirmAction === 'pausar' ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">Pausar durante garantia. Confirmar?</p>
              <button
                onClick={() => handleEstado('pausar')}
                disabled={loading === 'pausar'}
                className="text-xs bg-amber-600 text-white px-3 py-1 rounded-md hover:bg-amber-700"
              >
                {loading === 'pausar' ? '...' : 'Confirmar'}
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAction('pausar')}
              className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
            >
              Pausar
            </button>
          )}
        </>
      )}

      {/* ativo */}
      {estado === 'ativo' && (
        <>
          {confirmAction === 'pausar' ? (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">Pausar restaurante. Confirmar?</p>
              <button
                onClick={() => handleEstado('pausar')}
                disabled={loading === 'pausar'}
                className="text-xs bg-amber-600 text-white px-3 py-1 rounded-md hover:bg-amber-700"
              >
                {loading === 'pausar' ? '...' : 'Confirmar'}
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            </div>
          ) : confirmAction === 'rescindir' ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 font-medium">⚠ Esta acção é irreversível. Confirmar rescisão?</p>
              <button
                onClick={() => handleEstado('rescindir')}
                disabled={loading === 'rescindir'}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
              >
                {loading === 'rescindir' ? '...' : 'Rescindir'}
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            </div>
          ) : (
            <>
              <button
                onClick={() => setConfirmAction('pausar')}
                className="text-sm px-3 py-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Pausar
              </button>
              <button
                onClick={() => setConfirmAction('rescindir')}
                className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
              >
                Rescindir
              </button>
            </>
          )}
        </>
      )}

      {/* pausado */}
      {estado === 'pausado' && (
        <>
          <button
            onClick={() => handleEstado('retomar')}
            disabled={loading === 'retomar'}
            className="text-sm px-4 py-2 rounded-lg bg-green-600 text-white hover:bg-green-700 transition-colors"
          >
            {loading === 'retomar' ? 'A retomar...' : 'Retomar'}
          </button>
          {confirmAction === 'rescindir' ? (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-700 font-medium">⚠ Esta acção é irreversível. Confirmar?</p>
              <button
                onClick={() => handleEstado('rescindir')}
                disabled={loading === 'rescindir'}
                className="text-xs bg-red-600 text-white px-3 py-1 rounded-md hover:bg-red-700"
              >
                {loading === 'rescindir' ? '...' : 'Rescindir'}
              </button>
              <button onClick={() => setConfirmAction(null)} className="text-xs text-slate-500 hover:text-slate-700">Cancelar</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmAction('rescindir')}
              className="text-sm px-3 py-2 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
            >
              Rescindir
            </button>
          )}
        </>
      )}

      {/* rescindido — read only */}
      {estado === 'rescindido' && (
        <span className="text-xs text-slate-400 italic">Contrato rescindido — apenas leitura</span>
      )}
    </div>
  )
}
