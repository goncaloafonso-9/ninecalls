import { NextRequest, NextResponse } from 'next/server'
import { validateInternalSecret } from '@/lib/internal-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({
  channel: z.string().min(1),
  text: z.string().min(1),
})

// Generic Slack alert endpoint — called by n8n for #sistema alerts.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Parâmetros inválidos' }, { status: 400 })
  }

  const { channel, text } = parsed.data
  const token = process.env.SLACK_BOT_TOKEN

  if (!token) {
    return NextResponse.json({ error: 'SLACK_BOT_TOKEN não configurado' }, { status: 500 })
  }

  try {
    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel, text }),
    })

    const data = await res.json() as { ok: boolean; error?: string }

    if (!data.ok) {
      return NextResponse.json({ error: `Slack error: ${data.error}` }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[slack-alert] error:', err)
    return NextResponse.json({ error: 'Falha ao enviar alerta Slack' }, { status: 500 })
  }
}
