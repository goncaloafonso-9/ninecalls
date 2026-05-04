'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

interface Props {
  cycleId: string
  restauranteNome: string
}

export function RegistarFaturaButton({ cycleId, restauranteNome }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [numero, setNumero] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!numero.trim()) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/registar-fatura-at', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycleId, numeroFaturaAt: numero.trim() }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setOpen(false)
      setNumero('')
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
      >
        Registar Fatura AT
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-sm p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-1">Registar Fatura AT</h3>
            <p className="text-sm text-slate-500 mb-4">{restauranteNome}</p>
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-1">Número da Fatura AT *</label>
              <input
                autoFocus
                value={numero}
                onChange={e => setNumero(e.target.value)}
                placeholder="Ex: 2026/001"
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setOpen(false); setNumero('') }}
                className="text-sm px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!numero.trim() || loading}
                className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50"
              >
                {loading ? 'A registar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
