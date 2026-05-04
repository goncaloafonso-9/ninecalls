'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn, formatEuro } from '@/lib/utils'
import { Plus, Trash2, ChevronRight, ChevronLeft, Check } from 'lucide-react'

// ─── Types ────────────────────────────────────────────────────────────────────

interface AgenteDraft {
  nome: string
  telnyx_agent_id: string
}

interface RestauranteDraft {
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

interface ClienteDraft {
  nome_empresa: string
  nif: string
  morada: string
  email_contacto: string
  email_faturacao: string
  telefone: string
  password: string
  google_drive_folder_id: string
  docusign_envelope_id: string
  notas_internas: string
}

function defaultRestaurante(): RestauranteDraft {
  return {
    nome: '', morada: '', telnyx_phone: '', transfer_phone: '',
    software_reservas: 'nenhum', tem_takeaway: false, aceita_ultima_hora: false,
    taxa_ativacao: 300, comissao_por_pessoa: 2, taxa_takeaway: 3,
    pessoas_por_takeaway: 2, valor_estimado_por_pessoa: 35, valor_medio_takeaway: 25,
    objetivo_garantia: 100, periodo_compromisso_dias: 90, valor_rescisao_antecipada: 0,
    google_drive_folder_id: '', agentes: [{ nome: '', telnyx_agent_id: '' }],
  }
}

// ─── Helper components ────────────────────────────────────────────────────────

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
    <button
      type="button"
      onClick={() => onChange(!value)}
      className="flex items-center gap-2"
    >
      <div className={cn('relative inline-flex h-5 w-9 items-center rounded-full transition-colors', value ? 'bg-slate-900' : 'bg-slate-200')}>
        <span className={cn('inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform', value ? 'translate-x-4' : 'translate-x-0.5')} />
      </div>
      <span className="text-sm text-slate-700">{label}</span>
    </button>
  )
}

// ─── Steps ────────────────────────────────────────────────────────────────────

function Step1Cliente({ data, onChange }: { data: ClienteDraft; onChange: (d: ClienteDraft) => void }) {
  function set(k: keyof ClienteDraft, v: string) { onChange({ ...data, [k]: v }) }
  const [showPw, setShowPw] = useState(false)

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-slate-900">Dados do Cliente</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <Label>Nome da Empresa *</Label>
          <Input value={data.nome_empresa} onChange={e => set('nome_empresa', e.target.value)} placeholder="Restaurante Exemplo Lda." />
        </div>
        <div>
          <Label>NIF *</Label>
          <Input value={data.nif} onChange={e => set('nif', e.target.value)} placeholder="123456789" />
        </div>
        <div className="sm:col-span-2">
          <Label>Morada *</Label>
          <Input value={data.morada} onChange={e => set('morada', e.target.value)} placeholder="Rua Exemplo, 1 · 1000-001 Lisboa" />
        </div>
        <div>
          <Label>Email de Login *</Label>
          <Input type="email" value={data.email_contacto} onChange={e => set('email_contacto', e.target.value)} placeholder="cliente@exemplo.com" />
        </div>
        <div>
          <Label>Email de Faturação *</Label>
          <Input type="email" value={data.email_faturacao} onChange={e => set('email_faturacao', e.target.value)} placeholder="financeiro@exemplo.com" />
        </div>
        <div>
          <Label>Telefone</Label>
          <Input value={data.telefone} onChange={e => set('telefone', e.target.value)} placeholder="+351 9XX XXX XXX" />
        </div>
        <div>
          <Label>Password Inicial *</Label>
          <div className="relative">
            <Input
              type={showPw ? 'text' : 'password'}
              value={data.password}
              onChange={e => set('password', e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPw(v => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              {showPw ? 'ocultar' : 'ver'}
            </button>
          </div>
        </div>
        <div>
          <Label>Google Drive Folder ID</Label>
          <Input value={data.google_drive_folder_id} onChange={e => set('google_drive_folder_id', e.target.value)} />
        </div>
        <div>
          <Label>DocuSign Envelope ID</Label>
          <Input value={data.docusign_envelope_id} onChange={e => set('docusign_envelope_id', e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Notas Internas</Label>
          <textarea
            value={data.notas_internas}
            onChange={e => set('notas_internas', e.target.value)}
            rows={2}
            className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 resize-none"
          />
        </div>
      </div>
    </div>
  )
}

function Step2Restaurantes({
  restaurantes,
  onChange,
}: {
  restaurantes: RestauranteDraft[]
  onChange: (r: RestauranteDraft[]) => void
}) {
  function updateR(i: number, partial: Partial<RestauranteDraft>) {
    const next = [...restaurantes]
    next[i] = { ...next[i], ...partial }
    onChange(next)
  }

  function slugPreview(nome: string) {
    return nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-slate-900">Restaurantes</h2>
        <button
          type="button"
          onClick={() => onChange([...restaurantes, defaultRestaurante()])}
          className="flex items-center gap-1.5 text-sm border border-slate-200 text-slate-600 px-3 py-2 rounded-lg hover:bg-slate-50"
        >
          <Plus className="w-3.5 h-3.5" /> Adicionar
        </button>
      </div>

      {restaurantes.map((r, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-5 space-y-4">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold text-slate-900">
              Restaurante {i + 1}
              {r.nome && <span className="text-slate-400 font-normal ml-2">· /{slugPreview(r.nome)}</span>}
            </h3>
            {restaurantes.length > 1 && (
              <button
                type="button"
                onClick={() => onChange(restaurantes.filter((_, j) => j !== i))}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>Nome *</Label>
              <Input value={r.nome} onChange={e => updateR(i, { nome: e.target.value })} placeholder="Restaurante Exemplo" />
            </div>
            <div>
              <Label>Morada</Label>
              <Input value={r.morada} onChange={e => updateR(i, { morada: e.target.value })} />
            </div>
            <div>
              <Label>Número Dedicado (Telnyx)</Label>
              <Input value={r.telnyx_phone} onChange={e => updateR(i, { telnyx_phone: e.target.value })} placeholder="+351..." />
            </div>
            <div>
              <Label>Número de Transferência *</Label>
              <Input value={r.transfer_phone} onChange={e => updateR(i, { transfer_phone: e.target.value })} placeholder="+351..." />
            </div>
            <div>
              <Label>Software de Reservas</Label>
              <select
                value={r.software_reservas}
                onChange={e => updateR(i, { software_reservas: e.target.value as RestauranteDraft['software_reservas'] })}
                className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
              >
                <option value="zenchef">Zenchef</option>
                <option value="thefork">The Fork</option>
                <option value="outro">Outro</option>
                <option value="nenhum">Nenhum</option>
              </select>
            </div>
            <div>
              <Label>Google Drive Folder ID *</Label>
              <Input value={r.google_drive_folder_id} onChange={e => updateR(i, { google_drive_folder_id: e.target.value })} />
            </div>
            <div className="flex items-center gap-6 sm:col-span-2">
              <Toggle value={r.tem_takeaway} onChange={v => updateR(i, { tem_takeaway: v })} label="Tem Takeaway" />
              <Toggle value={r.aceita_ultima_hora} onChange={v => updateR(i, { aceita_ultima_hora: v })} label="Aceita Última Hora" />
            </div>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Valores Comerciais</p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <Label>Investimento Inicial (€) *</Label>
                <Input type="number" step="10" min="0" value={r.taxa_ativacao} onChange={e => updateR(i, { taxa_ativacao: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Comissão/Pessoa (€) *</Label>
                <Input type="number" step="0.5" min="0" value={r.comissao_por_pessoa} onChange={e => updateR(i, { comissao_por_pessoa: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Taxa Takeaway (€)</Label>
                <Input type="number" step="0.5" min="0" value={r.taxa_takeaway} onChange={e => updateR(i, { taxa_takeaway: parseFloat(e.target.value) })} disabled={!r.tem_takeaway} />
              </div>
              <div>
                <Label>Pessoas/Takeaway</Label>
                <Input type="number" step="1" min="1" value={r.pessoas_por_takeaway} onChange={e => updateR(i, { pessoas_por_takeaway: parseInt(e.target.value) })} disabled={!r.tem_takeaway} />
              </div>
              <div>
                <Label>Objectivo Garantia (px) *</Label>
                <Input type="number" step="10" min="0" value={r.objetivo_garantia} onChange={e => updateR(i, { objetivo_garantia: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Compromisso (dias)</Label>
                <Input type="number" step="30" min="0" value={r.periodo_compromisso_dias} onChange={e => updateR(i, { periodo_compromisso_dias: parseInt(e.target.value) })} />
              </div>
              <div>
                <Label>Valor Rescisão (€)</Label>
                <Input type="number" step="50" min="0" value={r.valor_rescisao_antecipada} onChange={e => updateR(i, { valor_rescisao_antecipada: parseFloat(e.target.value) })} />
              </div>
              <div>
                <Label>Ticket Médio/Pessoa (€)</Label>
                <Input type="number" step="5" min="0" value={r.valor_estimado_por_pessoa} onChange={e => updateR(i, { valor_estimado_por_pessoa: parseFloat(e.target.value) })} />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function Step3Agentes({
  restaurantes,
  onChange,
}: {
  restaurantes: RestauranteDraft[]
  onChange: (r: RestauranteDraft[]) => void
}) {
  function updateAgentes(ri: number, agentes: AgenteDraft[]) {
    const next = [...restaurantes]
    next[ri] = { ...next[ri], agentes }
    onChange(next)
  }

  function updateAgente(ri: number, ai: number, partial: Partial<AgenteDraft>) {
    const agentes = [...restaurantes[ri].agentes]
    agentes[ai] = { ...agentes[ai], ...partial }
    updateAgentes(ri, agentes)
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-900">Agentes Telnyx</h2>
      {restaurantes.map((r, ri) => (
        <div key={ri} className="border border-slate-200 rounded-lg p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">{r.nome || `Restaurante ${ri + 1}`}</h3>
          <div className="space-y-3">
            {r.agentes.map((a, ai) => (
              <div key={ai} className="flex items-center gap-3">
                <div className="flex-1">
                  <Input
                    value={a.nome}
                    onChange={e => updateAgente(ri, ai, { nome: e.target.value })}
                    placeholder="Ex: Agent PT"
                  />
                </div>
                <div className="flex-1">
                  <Input
                    value={a.telnyx_agent_id}
                    onChange={e => updateAgente(ri, ai, { telnyx_agent_id: e.target.value })}
                    placeholder="ast_XXXXXXXXX"
                    className="font-mono"
                  />
                </div>
                {r.agentes.length > 1 && (
                  <button
                    type="button"
                    onClick={() => updateAgentes(ri, r.agentes.filter((_, j) => j !== ai))}
                    className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => updateAgentes(ri, [...r.agentes, { nome: '', telnyx_agent_id: '' }])}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
            >
              <Plus className="w-3 h-3" /> Adicionar outro agente
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}

function Step4Revisao({ cliente, restaurantes }: { cliente: ClienteDraft; restaurantes: RestauranteDraft[] }) {
  return (
    <div className="space-y-6">
      <h2 className="text-base font-semibold text-slate-900">Revisão</h2>

      {/* Client summary */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Cliente</p>
        <p className="font-semibold text-slate-900">{cliente.nome_empresa}</p>
        <p className="text-sm text-slate-500">NIF {cliente.nif} · {cliente.email_contacto}</p>
        <p className="text-sm text-slate-500">{cliente.morada}</p>
      </div>

      {/* Restaurants summary */}
      {restaurantes.map((r, i) => (
        <div key={i} className="border border-slate-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="font-semibold text-slate-900">{r.nome || `Restaurante ${i + 1}`}</p>
            <div className="flex gap-2">
              {r.tem_takeaway && <span className="text-xs bg-purple-50 text-purple-700 border border-purple-200 px-2 py-0.5 rounded-full">Takeaway</span>}
              {r.aceita_ultima_hora && <span className="text-xs bg-orange-50 text-orange-700 border border-orange-200 px-2 py-0.5 rounded-full">Última Hora</span>}
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <div>
              <p className="text-xs text-slate-400">Investimento Inicial</p>
              <p className="font-medium text-slate-900">{formatEuro(r.taxa_ativacao)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Comissão/Pessoa</p>
              <p className="font-medium text-slate-900">{formatEuro(r.comissao_por_pessoa)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Objectivo Garantia</p>
              <p className="font-medium text-slate-900">{r.objetivo_garantia} pessoas</p>
            </div>
            <div>
              <p className="text-xs text-slate-400">Compromisso</p>
              <p className="font-medium text-slate-900">{r.periodo_compromisso_dias} dias</p>
            </div>
          </div>
          {r.agentes.some(a => a.nome) && (
            <div className="mt-3 pt-3 border-t border-slate-100">
              <p className="text-xs text-slate-400 mb-1">Agentes</p>
              {r.agentes.filter(a => a.nome).map((a, ai) => (
                <p key={ai} className="text-xs text-slate-600">{a.nome} · <span className="font-mono">{a.telnyx_agent_id}</span></p>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

// ─── Main Wizard ──────────────────────────────────────────────────────────────

const STEPS = ['Cliente', 'Restaurantes', 'Agentes', 'Revisão']

export function OnboardingWizard() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [cliente, setCliente] = useState<ClienteDraft>({
    nome_empresa: '', nif: '', morada: '', email_contacto: '', email_faturacao: '',
    telefone: '', password: '', google_drive_folder_id: '', docusign_envelope_id: '', notas_internas: '',
  })
  const [restaurantes, setRestaurantes] = useState<RestauranteDraft[]>([defaultRestaurante()])

  async function handleSubmit() {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/criar-cliente', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...cliente,
          restaurantes: restaurantes.map(r => ({
            ...r,
            agentes: r.agentes.filter(a => a.nome && a.telnyx_agent_id),
          })),
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Erro ao criar cliente')
      router.push(`/admin/clientes/${json.clientId}`)
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl">
      {/* Stepper */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <div key={s} className="flex items-center">
            <div className={cn(
              'flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors',
              i < step ? 'bg-slate-900 text-white' :
              i === step ? 'bg-slate-900 text-white' :
              'bg-slate-100 text-slate-400'
            )}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={cn('ml-2 text-sm font-medium', i <= step ? 'text-slate-900' : 'text-slate-400')}>
              {s}
            </span>
            {i < STEPS.length - 1 && (
              <div className={cn('h-px w-12 mx-4', i < step ? 'bg-slate-900' : 'bg-slate-200')} />
            )}
          </div>
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white border border-slate-200 rounded-xl p-6">
        {step === 0 && <Step1Cliente data={cliente} onChange={setCliente} />}
        {step === 1 && <Step2Restaurantes restaurantes={restaurantes} onChange={setRestaurantes} />}
        {step === 2 && <Step3Agentes restaurantes={restaurantes} onChange={setRestaurantes} />}
        {step === 3 && <Step4Revisao cliente={cliente} restaurantes={restaurantes} />}
      </div>

      {/* Navigation */}
      <div className="flex justify-between mt-6">
        <button
          type="button"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 0}
          className="flex items-center gap-2 text-sm px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 disabled:opacity-30 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Anterior
        </button>

        {step < STEPS.length - 1 ? (
          <button
            type="button"
            onClick={() => setStep(s => s + 1)}
            className="flex items-center gap-2 text-sm px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            Próximo <ChevronRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loading}
            className="flex items-center gap-2 text-sm px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:opacity-50 transition-colors"
          >
            {loading ? 'A criar...' : 'Confirmar e Criar'}
            {!loading && <Check className="w-4 h-4" />}
          </button>
        )}
      </div>
    </div>
  )
}
