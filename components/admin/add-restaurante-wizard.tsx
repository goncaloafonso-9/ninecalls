'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatEuro } from '@/lib/utils'
import { Plus, Trash2, Check } from 'lucide-react'

interface AgenteDraft { nome: string; telnyx_agent_id: string }

interface FormData {
  clientId: string
  nome: string
  morada: string
  telnyx_phone: string
  transfer_phone: string
  software_reservas: 'zenchef' | 'thefork' | 'outro' | 'nenhum'
  tem_takeaway: boolean
  aceita_ultima_hora: boolean
  taxa_ativacao: number
  comissao_por_pessoa: number
  taxa_takeaway: number
  pessoas_por_takeaway: number
  valor_estimado_por_pessoa: number
  valor_medio_takeaway: number
  objetivo_garantia: number
  periodo_compromisso_dias: number
  valor_rescisao_antecipada: number
  google_drive_folder_id: string
  agentes: AgenteDraft[]
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="block text-xs font-medium text-slate-600 mb-1">{children}</label>
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn('w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent', className)}
      {...props}
    />
  )
}

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button type="button" onClick={() => onChange(!value)} className="flex items-center gap-2">
      <div className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', value ? 'bg-slate-900' : 'bg-slate-200')}>
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', value ? 'translate-x-4' : 'translate-x-0.5')} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </button>
  )
}

export function AddRestauranteWizard({ clients }: { clients: { id: string; nome_empresa: string }[] }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [form, setForm] = useState<FormData>({
    clientId: clients[0]?.id ?? '',
    nome: '', morada: '', telnyx_phone: '', transfer_phone: '',
    software_reservas: 'nenhum', tem_takeaway: false, aceita_ultima_hora: false,
    taxa_ativacao: 300, comissao_por_pessoa: 2, taxa_takeaway: 3,
    pessoas_por_takeaway: 2, valor_estimado_por_pessoa: 35, valor_medio_takeaway: 25,
    objetivo_garantia: 100, periodo_compromisso_dias: 90, valor_rescisao_antecipada: 0,
    google_drive_folder_id: '',
    agentes: [{ nome: '', telnyx_agent_id: '' }],
  })

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm(f => ({ ...f, [k]: v }))
  }

  function updateAgente(i: number, partial: Partial<AgenteDraft>) {
    const next = [...form.agentes]
    next[i] = { ...next[i], ...partial }
    set('agentes', next)
  }

  async function handleSubmit() {
    if (!form.clientId || !form.nome) return
    setLoading(true)
    try {
      const res = await fetch('/api/admin/adicionar-restaurante', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          agentes: form.agentes.filter(a => a.nome && a.telnyx_agent_id),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro')
      router.push(`/admin/restaurantes/${json.slug}`)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Client selection */}
      <div className="bg-white border border-slate-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-slate-900 mb-4">Cliente</h2>
        <div>
          <Label>Seleccionar cliente *</Label>
          <select
            value={form.clientId}
            onChange={e => set('clientId', e.target.value)}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
          >
            {clients.map(c => (
              <option key={c.id} value={c.id}>{c.nome_empresa}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Restaurant data */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-4">
        <h2 className="text-sm font-semibold text-slate-900">Dados do Restaurante</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.nome} onChange={e => set('nome', e.target.value)} placeholder="Restaurante Exemplo" />
          </div>
          <div>
            <Label>Morada</Label>
            <Input value={form.morada} onChange={e => set('morada', e.target.value)} />
          </div>
          <div>
            <Label>Número Dedicado (Telnyx)</Label>
            <Input value={form.telnyx_phone} onChange={e => set('telnyx_phone', e.target.value)} placeholder="+351..." />
          </div>
          <div>
            <Label>Número de Transferência *</Label>
            <Input value={form.transfer_phone} onChange={e => set('transfer_phone', e.target.value)} placeholder="+351..." />
          </div>
          <div>
            <Label>Google Drive Folder ID</Label>
            <Input value={form.google_drive_folder_id} onChange={e => set('google_drive_folder_id', e.target.value)} />
          </div>
          <div>
            <Label>Software de Reservas</Label>
            <select
              value={form.software_reservas}
              onChange={e => set('software_reservas', e.target.value as FormData['software_reservas'])}
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="zenchef">Zenchef</option>
              <option value="thefork">The Fork</option>
              <option value="outro">Outro</option>
              <option value="nenhum">Nenhum</option>
            </select>
          </div>
          <div className="flex items-center gap-6 sm:col-span-2">
            <Toggle value={form.tem_takeaway} onChange={v => set('tem_takeaway', v)} label="Tem Takeaway" />
            <Toggle value={form.aceita_ultima_hora} onChange={v => set('aceita_ultima_hora', v)} label="Aceita Última Hora" />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Valores Comerciais</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div><Label>Investimento Inicial (€) *</Label><Input type="number" step="10" min="0" value={form.taxa_ativacao} onChange={e => set('taxa_ativacao', parseFloat(e.target.value))} /></div>
            <div><Label>Comissão/Pessoa (€) *</Label><Input type="number" step="0.5" min="0" value={form.comissao_por_pessoa} onChange={e => set('comissao_por_pessoa', parseFloat(e.target.value))} /></div>
            <div><Label>Taxa Takeaway (€)</Label><Input type="number" step="0.5" min="0" value={form.taxa_takeaway} onChange={e => set('taxa_takeaway', parseFloat(e.target.value))} disabled={!form.tem_takeaway} /></div>
            <div><Label>Pessoas/Takeaway</Label><Input type="number" step="1" min="1" value={form.pessoas_por_takeaway} onChange={e => set('pessoas_por_takeaway', parseInt(e.target.value))} disabled={!form.tem_takeaway} /></div>
            <div><Label>Objectivo Garantia (px) *</Label><Input type="number" step="10" min="0" value={form.objetivo_garantia} onChange={e => set('objetivo_garantia', parseInt(e.target.value))} /></div>
            <div><Label>Compromisso (dias)</Label><Input type="number" step="30" min="0" value={form.periodo_compromisso_dias} onChange={e => set('periodo_compromisso_dias', parseInt(e.target.value))} /></div>
            <div><Label>Valor Rescisão (€)</Label><Input type="number" step="50" min="0" value={form.valor_rescisao_antecipada} onChange={e => set('valor_rescisao_antecipada', parseFloat(e.target.value))} /></div>
            <div><Label>Ticket Médio/Pessoa (€)</Label><Input type="number" step="5" min="0" value={form.valor_estimado_por_pessoa} onChange={e => set('valor_estimado_por_pessoa', parseFloat(e.target.value))} /></div>
          </div>
        </div>
      </div>

      {/* Agents */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 space-y-3">
        <h2 className="text-sm font-semibold text-slate-900">Agentes Telnyx</h2>
        {form.agentes.map((a, i) => (
          <div key={i} className="flex items-center gap-3">
            <Input value={a.nome} onChange={e => updateAgente(i, { nome: e.target.value })} placeholder="Nome do agente" />
            <Input value={a.telnyx_agent_id} onChange={e => updateAgente(i, { telnyx_agent_id: e.target.value })} placeholder="ast_XXXXXXXXX" className="font-mono" />
            {form.agentes.length > 1 && (
              <button type="button" onClick={() => set('agentes', form.agentes.filter((_, j) => j !== i))} className="text-slate-300 hover:text-red-500 shrink-0">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => set('agentes', [...form.agentes, { nome: '', telnyx_agent_id: '' }])}
          className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
        >
          <Plus className="w-3 h-3" /> Adicionar agente
        </button>
      </div>

      {/* Submit */}
      <div className="flex justify-end">
        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading || !form.nome || !form.clientId}
          className="flex items-center gap-2 text-sm px-6 py-2.5 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
        >
          {loading ? 'A criar...' : 'Criar Restaurante'}
          {!loading && <Check className="w-4 h-4" />}
        </button>
      </div>
    </div>
  )
}
