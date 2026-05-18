/**
 * Typed Slack notification utility.
 * Resolves named channels to env vars; also accepts raw channel IDs for per-restaurant channels.
 */

import { createAdminClient } from '@/lib/supabase/admin'

/**
 * Creates a Slack channel for a restaurant, invites the bot, and saves the
 * channel ID + name to the restaurants table.
 *
 * Non-throwing: returns { ok: true } or { ok: false, error: string }.
 * Callers should handle failure gracefully (non-blocking).
 */
export async function createSlackChannelForRestaurant(
  restaurantId: string,
  channelName: string
): Promise<{ ok: true; channelId: string; channelName: string } | { ok: false; error: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN não configurado' }

  const createRes = await fetch('https://slack.com/api/conversations.create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: channelName, is_private: false }),
  })

  const createData = (await createRes.json()) as {
    ok: boolean; channel?: { id: string; name: string }; error?: string
  }

  if (!createData.ok) return { ok: false, error: `Slack API error: ${createData.error}` }

  const channelId = createData.channel!.id
  const channelNameConfirmed = createData.channel!.name

  // Invite bot user + admin human user
  const authTestRes = await fetch('https://slack.com/api/auth.test', {
    headers: { Authorization: `Bearer ${token}` },
  })
  const authTestData = (await authTestRes.json()) as { ok: boolean; user_id?: string }

  const usersToInvite: string[] = []
  if (authTestData.ok && authTestData.user_id) usersToInvite.push(authTestData.user_id)

  // Look up admin user by email so they appear in the channel immediately
  const adminEmail = process.env.ADMIN_EMAIL
  if (adminEmail) {
    const lookupRes = await fetch(
      `https://slack.com/api/users.lookupByEmail?email=${encodeURIComponent(adminEmail)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
    const lookupData = (await lookupRes.json()) as { ok: boolean; user?: { id: string } }
    if (lookupData.ok && lookupData.user?.id && lookupData.user.id !== authTestData.user_id) {
      usersToInvite.push(lookupData.user.id)
    }
  }

  if (usersToInvite.length > 0) {
    await fetch('https://slack.com/api/conversations.invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ channel: channelId, users: usersToInvite.join(',') }),
    })
  }

  // Save to DB
  const db = createAdminClient()
  const { error: dbError } = await db
    .from('restaurants')
    .update({ slack_channel_id: channelId, slack_channel_name: channelNameConfirmed })
    .eq('id', restaurantId)

  if (dbError) return { ok: false, error: `DB error: ${dbError.message}` }

  // Welcome message
  const { data: restaurant } = await db.from('restaurants').select('nome').eq('id', restaurantId).single()
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      channel: channelId,
      text: `👋 Canal criado para *${restaurant?.nome ?? channelName}*. As notificações de chamadas, reservas e alertas aparecerão aqui.`,
    }),
  })

  return { ok: true, channelId, channelName: channelNameConfirmed }
}

/**
 * Archives a Slack channel by ID.
 * Non-throwing: returns { ok: true } or { ok: false, error: string }.
 */
export async function archiveSlackChannel(
  channelId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token) return { ok: false, error: 'SLACK_BOT_TOKEN não configurado' }

  const res = await fetch('https://slack.com/api/conversations.archive', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel: channelId }),
  })
  const data = (await res.json()) as { ok: boolean; error?: string }

  // already_archived is not a real error
  if (!data.ok && data.error !== 'already_archived') {
    return { ok: false, error: `Slack API error: ${data.error}` }
  }
  return { ok: true }
}

type NamedChannel = 'sistema' | 'admin' | 'faturacao' | 'clientes' | 'garantias' | 'novos_clientes' | 'pagamentos'
type SlackChannel = NamedChannel | { restaurantChannelId: string }

interface SlackMessage {
  channel: SlackChannel
  text: string
  blocks?: object[]
}

function resolveChannelId(channel: SlackChannel): string {
  if (typeof channel === 'object') return channel.restaurantChannelId

  const map: Record<NamedChannel, string | undefined> = {
    sistema:        process.env.SLACK_CHANNEL_SISTEMA,
    admin:          process.env.SLACK_CHANNEL_ADMIN,
    faturacao:      process.env.SLACK_CHANNEL_FATURACAO,
    clientes:       process.env.SLACK_CHANNEL_CLIENTES,
    garantias:      process.env.SLACK_CHANNEL_GARANTIAS,
    novos_clientes: process.env.SLACK_CHANNEL_NOVOS_CLIENTES,
    pagamentos:     process.env.SLACK_CHANNEL_PAGAMENTOS,
  }
  return map[channel] ?? ''
}

export async function sendSlackMessage(msg: SlackMessage): Promise<void> {
  const token = process.env.SLACK_BOT_TOKEN
  const channelId = resolveChannelId(msg.channel)
  if (!token || !channelId) return

  try {
    const body: Record<string, unknown> = { channel: channelId, text: msg.text }
    if (msg.blocks) body.blocks = msg.blocks

    await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    })
  } catch {
    console.error('[slack] Falha ao enviar mensagem para:', channelId)
  }
}

export async function sendSlackAlert(
  channel: SlackChannel,
  title: string,
  body: string,
  severity: 'info' | 'warning' | 'error'
): Promise<void> {
  const emoji = { info: 'ℹ️', warning: '⚠️', error: '🔴' }[severity]
  await sendSlackMessage({
    channel,
    text: `${emoji} *${title}*\n${body}`,
  })
}
