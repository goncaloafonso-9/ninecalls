'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, Hash, CheckCircle } from 'lucide-react'

interface SlackChannelCardProps {
  restaurantId: string
  restaurantSlug: string
  slackChannelId: string | null
  slackChannelName: string | null
}

export function SlackChannelCard({
  restaurantId,
  restaurantSlug,
  slackChannelId,
  slackChannelName,
}: SlackChannelCardProps) {
  const router = useRouter()
  const [channelName, setChannelName] = useState(restaurantSlug)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleCreate() {
    setLoading(true)
    setError(null)

    const res = await fetch('/api/internal/create-slack-channel', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_id: restaurantId, channel_name: channelName }),
    })

    const json = await res.json()
    setLoading(false)

    if (!res.ok) {
      setError(json.error ?? 'Ocorreu um erro')
      return
    }

    router.refresh()
  }

  if (slackChannelId) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <Hash className="w-4 h-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900">Slack</h3>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
          <span className="text-sm text-slate-700 font-mono">#{slackChannelName}</span>
        </div>
        <p className="text-xs text-slate-400 mt-1.5">{slackChannelId}</p>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-5">
      <div className="flex items-start gap-2 mb-4">
        <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div>
          <h3 className="text-sm font-semibold text-amber-900">Canal Slack por criar</h3>
          <p className="text-xs text-amber-700 mt-0.5">
            O canal Slack deste restaurante ainda não foi criado.
          </p>
        </div>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-amber-800">Nome do canal</label>
        <input
          type="text"
          value={channelName}
          onChange={e => setChannelName(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, '-').replace(/-+/g, '-'))}
          className="w-full border border-amber-300 rounded-md px-3 py-2 text-sm bg-white font-mono focus:outline-none focus:ring-2 focus:ring-amber-400"
          placeholder={restaurantSlug}
        />
        <p className="text-xs text-amber-600">Apenas letras minúsculas, números, hífens e underscores.</p>
      </div>

      {error && (
        <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-md px-2 py-1.5">{error}</p>
      )}

      <button
        onClick={handleCreate}
        disabled={loading || !channelName}
        className="mt-3 w-full text-sm bg-amber-600 text-white px-3 py-2 rounded-md hover:bg-amber-700 disabled:opacity-50 transition-colors"
      >
        {loading ? 'A criar...' : 'Criar Canal Slack'}
      </button>
    </div>
  )
}
