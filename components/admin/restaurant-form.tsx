'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Restaurant, SoftwareReservasTipo } from '@/types'
import { AlertTriangle } from 'lucide-react'

const safeFloat = (v: string, fb = 0) => v === '' ? fb : parseFloat(v)
const safeInt   = (v: string, fb = 0) => v === '' ? fb : parseInt(v)

interface RestaurantFormProps {
  restaurant: Restaurant
  rescindido?: boolean
}

const softwareOptions: { value: SoftwareReservasTipo; label: string }[] = [
  { value: 'zenchef', label: 'Zenchef' },
  { value: 'thefork', label: 'The Fork' },
  { value: 'outro',   label: 'Outro' },
  { value: 'nenhum',  label: 'Nenhum' },
]

function Field({
  label, children, hint,
}: {
  label: string
  children: React.ReactNode
  hint?: string
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-600 mb-1">{label}</label>
      {children}
      {hint && <p className="text-xs text-slate-400 mt-1">{hint}</p>}
    </div>
  )
}

function Input({ disabled, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { disabled?: boolean }) {
  return (
    <input
      disabled={disabled}
      className={cn(
        'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent',
        disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed'
      )}
      {...props}
    />
  )
}

export function RestaurantForm({ restaurant: r, rescindido }: RestaurantFormProps) {
  const router = useRouter()
  const [form, setForm] = useState({
    nome: r.nome,
    morada: r.morada ?? '',
    telnyx_phone: r.telnyx_phone ?? '',
    transfer_phone: r.transfer_phone ?? '',
    software_reservas: r.software_reservas,
    tem_takeaway: r.tem_takeaway,
    aceita_ultima_hora: r.aceita_ultima_hora,
    comissao_por_pessoa: r.comissao_por_pessoa,
    taxa_takeaway: r.taxa_takeaway,
    taxa_mensal_fixa: r.taxa_mensal_fixa,
    valor_medio_takeaway: r.valor_medio_takeaway,
    periodo_compromisso_dias: r.periodo_compromisso_dias,
    valor_rescisao_antecipada: r.valor_rescisao_antecipada,
    google_drive_folder_link: r.google_drive_folder_link ?? '',
    notas_internas: r.notas_internas ?? '',
    tem_garantia: r.tem_garantia,
  })
  const [loading, setLoading] = useState(false)
  const [saved, setSaved] = useState(false)

  function set(key: string, value: unknown) {
    setForm(f => ({ ...f, [key]: value }))
    setSaved(false)
  }

  async function handleSave() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/actualizar-restaurante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ restaurantId: r.id, ...form }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      setSaved(true)
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  const disabled = !!rescindido

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-5">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-sm font-semibold text-slate-900">Dados do Restaurante</h3>
        {!disabled && (
          <button
            onClick={handleSave}
            disabled={loading}
            className="text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'A guardar...' : saved ? '✓ Guardado' : 'Guardar'}
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Field label="Nome *">
          <Input value={form.nome} onChange={e => set('nome', e.target.value)} disabled={disabled} />
        </Field>

        <Field label="Morada">
          <Input value={form.morada} onChange={e => set('morada', e.target.value)} disabled={disabled} />
        </Field>

        <Field label="Número Dedicado (Telnyx)">
          <Input value={form.telnyx_phone} onChange={e => set('telnyx_phone', e.target.value)} disabled={disabled} placeholder="+351..." />
        </Field>

        <Field label="Número de Transferência">
          <Input value={form.transfer_phone} onChange={e => set('transfer_phone', e.target.value)} disabled={disabled} placeholder="+351..." />
        </Field>

        <Field label="Software de Reservas">
          <select
            disabled={disabled}
            value={form.software_reservas}
            onChange={e => set('software_reservas', e.target.value)}
            className={cn(
              'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900',
              disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed'
            )}
          >
            {softwareOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </Field>

        <Field label="Link Pasta Google Drive">
          <Input value={form.google_drive_folder_link} onChange={e => set('google_drive_folder_link', e.target.value)} disabled={disabled} placeholder="https://drive.google.com/drive/folders/..." />
        </Field>

        {/* Toggles */}
        <div className="flex items-center gap-6 sm:col-span-2">
          <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
            <div
              onClick={() => !disabled && set('tem_takeaway', !form.tem_takeaway)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                form.tem_takeaway ? 'bg-slate-900' : 'bg-slate-200'
              )}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', form.tem_takeaway ? 'translate-x-4' : 'translate-x-0.5')} />
            </div>
            <span className="text-sm text-slate-700">Tem Takeaway</span>
          </label>
          <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
            <div
              onClick={() => !disabled && set('aceita_ultima_hora', !form.aceita_ultima_hora)}
              className={cn(
                'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                form.aceita_ultima_hora ? 'bg-slate-900' : 'bg-slate-200'
              )}
            >
              <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', form.aceita_ultima_hora ? 'translate-x-4' : 'translate-x-0.5')} />
            </div>
            <span className="text-sm text-slate-700">Aceita Última Hora</span>
          </label>
          {!r.data_live && (
            <label className={cn('flex items-center gap-2 cursor-pointer', disabled && 'opacity-50 cursor-not-allowed')}>
              <div
                onClick={() => !disabled && set('tem_garantia', !form.tem_garantia)}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors',
                  form.tem_garantia ? 'bg-slate-900' : 'bg-slate-200'
                )}
              >
                <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', form.tem_garantia ? 'translate-x-4' : 'translate-x-0.5')} />
              </div>
              <span className="text-sm text-slate-700">Tem Período de Garantia</span>
            </label>
          )}
        </div>
      </div>

      {/* Financial fields */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <div className="flex items-center gap-2 mb-4">
          <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Valores Comerciais</h4>
          <div className="flex items-center gap-1.5 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-1">
            <AlertTriangle className="w-3 h-3" />
            Alterações só afectam ciclos futuros
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <Field label="Comissão/Pessoa (€)" hint="Por pessoa em reservas e última hora">
            <Input type="number" step="0.01" min="0" value={form.comissao_por_pessoa} onChange={e => set('comissao_por_pessoa', safeFloat(e.target.value))} disabled={disabled} />
          </Field>
          <Field label="Taxa Takeaway (€)" hint="Valor fixo por takeaway confirmado">
            <Input type="number" step="0.01" min="0" value={form.taxa_takeaway} onChange={e => set('taxa_takeaway', safeFloat(e.target.value))} disabled={disabled || !form.tem_takeaway} />
          </Field>
          <Field label="Mensalidade Fixa (€)" hint="Taxa mensal fixa por ciclo. 0 = sem mensalidade">
            <Input type="number" step="0.01" min="0" value={form.taxa_mensal_fixa} onChange={e => set('taxa_mensal_fixa', safeFloat(e.target.value))} disabled={disabled} />
          </Field>
          <Field label="Ticket Médio Takeaway (€)">
            <Input type="number" step="0.01" min="0" value={form.valor_medio_takeaway} onChange={e => set('valor_medio_takeaway', safeFloat(e.target.value))} disabled={disabled || !form.tem_takeaway} />
          </Field>
          <Field label="Período Compromisso (dias)">
            <Input type="number" step="1" min="0" value={form.periodo_compromisso_dias} onChange={e => set('periodo_compromisso_dias', safeInt(e.target.value))} disabled={disabled} />
          </Field>
          <Field label="Valor Rescisão Antecipada (€)">
            <Input type="number" step="0.01" min="0" value={form.valor_rescisao_antecipada} onChange={e => set('valor_rescisao_antecipada', safeFloat(e.target.value))} disabled={disabled} />
          </Field>
        </div>
      </div>

      {/* Notas */}
      <div className="mt-5 pt-5 border-t border-slate-100">
        <Field label="Notas Internas">
          <textarea
            disabled={disabled}
            value={form.notas_internas}
            onChange={e => set('notas_internas', e.target.value)}
            rows={3}
            className={cn(
              'w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none',
              disabled && 'bg-slate-50 text-slate-400 cursor-not-allowed'
            )}
            placeholder="Notas internas sobre este restaurante..."
          />
        </Field>
      </div>
    </div>
  )
}
