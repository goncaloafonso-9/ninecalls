'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, clampPercent, formatDate, pluralPessoa } from '@/lib/utils'
import { ShieldCheck } from 'lucide-react'

interface ConversaoRow {
  id: string
  tipo: 'adicionar' | 'remover'
  pessoas: number
  motivo: string
  criado_em: string
}

interface GuaranteeWidgetProps {
  restaurantId: string
  contagem_actual: number
  objetivo: number
  dia_efectivo: number
  dias_restantes: number
  estado: string
  conversoes: ConversaoRow[]
}

export function GuaranteeWidget({
  restaurantId,
  contagem_actual,
  objetivo,
  dia_efectivo,
  dias_restantes,
  estado,
  conversoes,
}: GuaranteeWidgetProps) {
  const router = useRouter()
  const pct = clampPercent(objetivo > 0 ? (contagem_actual / objetivo) * 100 : 0)
  const urgente = dia_efectivo >= 25
  const alerta = dia_efectivo >= 20 && !urgente
  const pessoas_em_falta = Math.max(0, objetivo - contagem_actual)

  const [showModal, setShowModal] = useState<'adicionar' | 'remover' | null>(null)
  const [pessoas, setPessoas] = useState('')
  const [motivo, setMotivo] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit() {
    if (!pessoas || !motivo) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/conversao-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          restaurantId,
          tipo: showModal,
          pessoas: Number(pessoas),
          motivo,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setShowModal(null)
      setPessoas('')
      setMotivo('')
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const novaContagem = showModal
    ? showModal === 'adicionar'
      ? contagem_actual + (Number(pessoas) || 0)
      : contagem_actual - (Number(pessoas) || 0)
    : null

  return (
    <>
      <div className={cn(
        'border rounded-lg p-5',
        urgente ? 'border-red-200 bg-red-50/30' : alerta ? 'border-amber-200 bg-amber-50/20' : 'border-slate-200 bg-white'
      )}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className={cn('w-4 h-4', urgente ? 'text-red-500' : alerta ? 'text-amber-500' : 'text-blue-500')} />
            <h3 className="text-sm font-semibold text-slate-900">Garantia</h3>
            <span className={cn(
              'text-xs px-2 py-0.5 rounded-full border font-medium',
              estado === 'em_curso' ? 'bg-blue-50 text-blue-700 border-blue-200' :
              estado === 'cumprido' ? 'bg-green-50 text-green-700 border-green-200' :
              'bg-red-50 text-red-700 border-red-200'
            )}>
              {estado === 'em_curso' ? 'Em Curso' : estado === 'cumprido' ? 'Cumprida' : 'Não Cumprida'}
            </span>
          </div>
          {estado === 'em_curso' && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowModal('adicionar')}
                className="text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
              >
                + Conversão
              </button>
              <button
                onClick={() => setShowModal('remover')}
                className="text-xs border border-slate-200 text-slate-600 px-3 py-1.5 rounded-md hover:bg-slate-50 transition-colors"
              >
                − Conversão
              </button>
            </div>
          )}
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-sm text-slate-600">
              {contagem_actual} / {objetivo} pessoas
            </span>
            <span className={cn('text-sm font-bold tabular-nums', urgente ? 'text-red-500' : 'text-slate-700')}>
              {pct}%
            </span>
          </div>
          <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
            <div
              className={cn(
                'h-full rounded-full transition-all',
                pct >= 100 ? 'bg-green-500' : urgente ? 'bg-red-400' : alerta ? 'bg-amber-400' : 'bg-blue-500'
              )}
              style={{ width: `${pct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1.5">
            <span className="text-xs text-slate-400">
              Dia efectivo {dia_efectivo}/30 · {dias_restantes} dias restantes
            </span>
            {pessoas_em_falta > 0 && (
              <span className="text-xs text-slate-500">Faltam {pluralPessoa(pessoas_em_falta)}</span>
            )}
          </div>
        </div>

        {/* Histórico de conversões */}
        {conversoes.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Histórico</p>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {conversoes.map(c => (
                <div key={c.id} className="flex items-start gap-2 text-xs">
                  <span className={cn(
                    'shrink-0 font-semibold mt-0.5',
                    c.tipo === 'adicionar' ? 'text-green-600' : 'text-red-500'
                  )}>
                    {c.tipo === 'adicionar' ? `+${c.pessoas}` : `−${c.pessoas}`}
                  </span>
                  <span className="text-slate-400">{formatDate(c.criado_em)}</span>
                  <span className="text-slate-600 truncate">{c.motivo}</span>
                  <span className="shrink-0 text-xs bg-slate-100 text-slate-500 px-1.5 rounded">manual</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6">
            <h3 className="text-base font-semibold text-slate-900 mb-4">
              {showModal === 'adicionar' ? 'Adicionar Conversão Manual' : 'Remover Conversão Manual'}
            </h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Nº de pessoas *
                </label>
                <input
                  type="number"
                  min="1"
                  value={pessoas}
                  onChange={e => setPessoas(e.target.value)}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                  placeholder="Ex: 5"
                />
                {pessoas && novaContagem !== null && (
                  <p className="text-xs text-slate-500 mt-1">
                    Contagem: {contagem_actual} → <span className="font-semibold text-slate-900">{novaContagem}</span> pessoas
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  Motivo * <span className="font-normal text-slate-400">(ficará no histórico)</span>
                </label>
                <textarea
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  rows={3}
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-none"
                  placeholder="Ex: Confirmação directa via telefone..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => { setShowModal(null); setPessoas(''); setMotivo('') }}
                className="text-sm px-4 py-2 border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={!pessoas || !motivo || loading}
                className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'A guardar...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
