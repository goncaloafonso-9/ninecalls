import { NextRequest, NextResponse } from 'next/server'

/**
 * Validates the N8N_INGEST_WEBHOOK_SECRET header on internal API routes.
 * Returns null if valid, or a 401 NextResponse if invalid.
 */
export function validateInternalSecret(req: NextRequest): NextResponse | null {
  const secret = process.env.N8N_INGEST_WEBHOOK_SECRET
  const provided = req.headers.get('x-internal-secret')

  if (!secret) {
    console.error('[internal-auth] N8N_INGEST_WEBHOOK_SECRET not configured')
    return NextResponse.json({ error: 'Not configured' }, { status: 500 })
  }

  if (!provided || provided !== secret) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  return null
}

export async function notifySlack(channel: string, text: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token || !channel) return
  try {
    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text }),
    })
  } catch {
    console.error('[slack] Falha ao enviar notificação:', channel)
  }
}
