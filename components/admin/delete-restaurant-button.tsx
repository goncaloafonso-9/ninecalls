'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, AlertTriangle } from 'lucide-react'

interface DeleteRestaurantButtonProps {
  restaurantId: string
  restaurantName: string
  clientId: string
}

export function DeleteRestaurantButton({ restaurantId, restaurantName, clientId }: DeleteRestaurantButtonProps) {
  const router = useRouter()
  const [expanded, setExpanded] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isMatch = confirm === restaurantName

  async function handleDelete() {
    if (!isMatch) return
    setLoading(true)
    setError(null)

    const res = await fetch('/api/admin/apagar-restaurante', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurantId }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Ocorreu um erro')
      return
    }

    router.push(`/admin/clientes/${clientId}`)
    router.refresh()
  }

  if (!expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="flex items-center gap-2 text-sm text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 bg-red-50 hover:bg-red-100 px-4 py-2 rounded-lg transition-colors"
      >
        <Trash2 className="w-4 h-4" />
        Apagar Restaurante
      </button>
    )
  }

  return (
    <div className="border border-red-200 bg-red-50 rounded-lg p-4 space-y-3">
      <div className="flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-semibold text-red-900">Apagar restaurante permanentemente</p>
          <p className="text-xs text-red-700 mt-0.5">
            Esta acção é irreversível. Todos os dados serão eliminados: chamadas, reservas, takeaways, ciclos de faturação e agentes.
          </p>
        </div>
      </div>

      <div className="space-y-1.5">
        <label className="text-xs font-medium text-red-800">
          Escreve o nome do restaurante para confirmar: <span className="font-mono">{restaurantName}</span>
        </label>
        <input
          type="text"
          value={confirm}
          onChange={e => setConfirm(e.target.value)}
          placeholder={restaurantName}
          className="w-full border border-red-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-red-400"
          autoFocus
        />
      </div>

      {error && (
        <p className="text-xs text-red-700 bg-red-100 border border-red-200 rounded-md px-2 py-1.5">{error}</p>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={handleDelete}
          disabled={!isMatch || loading}
          className="text-sm px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'A apagar...' : 'Apagar definitivamente'}
        </button>
        <button
          onClick={() => { setExpanded(false); setConfirm(''); setError(null) }}
          className="text-sm px-4 py-2 text-slate-600 hover:text-slate-800 transition-colors"
        >
          Cancelar
        </button>
      </div>
    </div>
  )
}
