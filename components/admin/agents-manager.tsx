'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import type { Agent } from '@/types'
import { Bot, Plus, Trash2 } from 'lucide-react'

interface AgentsManagerProps {
  restaurantId: string
  agents: Agent[]
}

export function AgentsManager({ restaurantId, agents }: AgentsManagerProps) {
  const router = useRouter()
  const [loading, setLoading] = useState<string | null>(null)
  const [showAdd, setShowAdd] = useState(false)
  const [nome, setNome] = useState('')
  const [telnyxAgentId, setTelnyxAgentId] = useState('')

  async function callAPI(endpoint: string, body: Record<string, unknown>) {
    const res = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const json = await res.json()
    if (!res.ok) throw new Error(json.error ?? 'Erro')
    return json
  }

  async function handleToggle(agent: Agent) {
    setLoading(agent.id)
    try {
      await callAPI('/api/admin/agentes', {
        action: 'toggle',
        agentId: agent.id,
        activo: !agent.activo,
      })
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function handleDelete(agent: Agent) {
    if (!confirm(`Remover o agente "${agent.nome}"?`)) return
    setLoading(agent.id + '_del')
    try {
      await callAPI('/api/admin/agentes', { action: 'delete', agentId: agent.id })
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  async function handleAdd() {
    if (!nome || !telnyxAgentId) return
    setLoading('add')
    try {
      await callAPI('/api/admin/agentes', {
        action: 'create',
        restaurantId,
        nome,
        telnyxAgentId,
      })
      setNome('')
      setTelnyxAgentId('')
      setShowAdd(false)
      router.refresh()
    } catch (err) {
      alert((err as Error).message)
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Agentes Telnyx</h3>
          {agents.length > 0 && (
            <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">
              {agents.length}
            </span>
          )}
        </div>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 text-xs bg-slate-900 text-white px-3 py-1.5 rounded-md hover:bg-slate-800 transition-colors"
        >
          <Plus className="w-3 h-3" />
          Adicionar
        </button>
      </div>

      {/* Agent list */}
      <div className="divide-y divide-slate-50">
        {agents.length === 0 && !showAdd && (
          <div className="py-8 text-center text-slate-400 text-sm">
            Nenhum agente configurado
          </div>
        )}
        {agents.map(agent => (
          <div key={agent.id} className="flex items-center justify-between px-5 py-3.5">
            <div>
              <p className="text-sm font-medium text-slate-900">{agent.nome}</p>
              <p className="text-xs text-slate-400 font-mono mt-0.5">{agent.telnyx_agent_id}</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Toggle */}
              <button
                onClick={() => handleToggle(agent)}
                disabled={loading === agent.id}
                className={cn(
                  'relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none',
                  agent.activo ? 'bg-green-500' : 'bg-slate-200'
                )}
              >
                <span
                  className={cn(
                    'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
                    agent.activo ? 'translate-x-4' : 'translate-x-0.5'
                  )}
                />
              </button>
              <span className="text-xs text-slate-400 w-12">{agent.activo ? 'Activo' : 'Inactivo'}</span>
              <button
                onClick={() => handleDelete(agent)}
                disabled={loading === agent.id + '_del'}
                className="text-slate-300 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}

        {/* Add form */}
        {showAdd && (
          <div className="px-5 py-4 bg-slate-50/50 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Nome do Agente *</label>
                <input
                  value={nome}
                  onChange={e => setNome(e.target.value)}
                  placeholder="Ex: Agent PT"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Telnyx Agent ID *</label>
                <input
                  value={telnyxAgentId}
                  onChange={e => setTelnyxAgentId(e.target.value)}
                  placeholder="ast_XXXXXXXXX"
                  className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-slate-900"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => { setShowAdd(false); setNome(''); setTelnyxAgentId('') }}
                className="text-sm px-3 py-1.5 border border-slate-200 rounded-md text-slate-600 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={handleAdd}
                disabled={!nome || !telnyxAgentId || loading === 'add'}
                className="text-sm px-3 py-1.5 bg-slate-900 text-white rounded-md hover:bg-slate-800 disabled:opacity-50"
              >
                {loading === 'add' ? 'A adicionar...' : 'Adicionar'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
