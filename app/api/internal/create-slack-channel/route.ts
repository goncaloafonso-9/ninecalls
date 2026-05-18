import { NextRequest, NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createSlackChannelForRestaurant } from '@/lib/slack'
import { z } from 'zod'

export const runtime = 'nodejs'

const bodySchema = z.object({
  restaurant_id: z.string().uuid(),
  channel_name: z.string().min(1).max(80).regex(/^[a-z0-9_-]+$/, 'Nome deve ser lowercase sem espaços'),
})

// POST /api/internal/create-slack-channel
// Creates a Slack channel for a restaurant, invites the bot, saves IDs to DB.
export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  let body: z.infer<typeof bodySchema>
  try {
    body = bodySchema.parse(await req.json())
  } catch (err) {
    return NextResponse.json({ error: 'Dados inválidos', details: err }, { status: 400 })
  }

  const result = await createSlackChannelForRestaurant(body.restaurant_id, body.channel_name)

  if (!result.ok) {
    const status = result.error.includes('name_taken') ? 409 : 502
    return NextResponse.json({ error: result.error }, { status })
  }

  return NextResponse.json({ channel_id: result.channelId, channel_name: result.channelName })
}
