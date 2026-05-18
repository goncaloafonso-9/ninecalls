import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret } from '@/lib/internal-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({
  tipo: z.enum(['takeaway', 'ultima_hora']),
  id: z.string().uuid(),
})

// POST /api/internal/send-confirmation-sms
// Called by n8n (WF-DC-01) after a new takeaway/ultima_hora is created.
// Sends an SMS to the restaurant phone with a confirmation link.
// Auth: N8N_INGEST_WEBHOOK_SECRET via x-internal-secret header.
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
    return NextResponse.json({ error: 'Parâmetros inválidos', details: parsed.error.flatten() }, { status: 400 })
  }

  const { tipo, id } = parsed.data
  const db = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ninecalls.io'

  const telnyxApiKey = process.env.TELNYX_API_KEY
  const telnyxFrom = process.env.TELNYX_SMS_FROM

  if (!telnyxApiKey || !telnyxFrom) {
    console.error('[send-confirmation-sms] TELNYX_API_KEY ou TELNYX_SMS_FROM não configurados')
    return NextResponse.json({ error: 'SMS não configurado' }, { status: 500 })
  }

  try {
    if (tipo === 'takeaway') {
      const { data: order } = await db
        .from('takeaway_orders')
        .select(`
          id, estado, expira_em, cliente_nome, cliente_phone, pickup_time, items,
          restaurants ( nome, transfer_phone )
        `)
        .eq('id', id)
        .single()

      if (!order) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
      if (order.estado !== 'pendente_restaurante') return NextResponse.json({ error: 'Pedido já processado' }, { status: 409 })

      const restaurant = Array.isArray(order.restaurants) ? order.restaurants[0] : order.restaurants
      if (!restaurant?.transfer_phone) {
        return NextResponse.json({ error: 'Número de telefone do restaurante não configurado' }, { status: 422 })
      }

      const confirmUrl = `${appUrl}/confirm/takeaway/${id}`
      const itensTxt = Array.isArray(order.items) ? (order.items as string[]).join(', ') : String(order.items ?? '')
      const smsText = [
        `Nine Calls | ${restaurant.nome}`,
        `Novo pedido takeaway:`,
        `Cliente: ${order.cliente_nome ?? '—'} (${order.cliente_phone ?? '—'})`,
        `Levantamento: ${order.pickup_time ?? '—'}`,
        `Itens: ${itensTxt}`,
        `→ Confirmar/Rejeitar: ${confirmUrl}`,
        `(Expira em 4 horas)`,
      ].join('\n')

      await sendSms(telnyxApiKey, telnyxFrom, restaurant.transfer_phone, smsText)

      await db
        .from('takeaway_orders')
        .update({ sms_enviado_restaurante: true })
        .eq('id', id)

      console.log(`[send-confirmation-sms] SMS takeaway enviado → ${restaurant.nome} (${id})`)
      return NextResponse.json({ ok: true, tipo, id })
    }

    // ultima_hora
    const { data: request } = await db
      .from('ultima_hora_requests')
      .select(`
        id, estado, expira_em, cliente_nome, cliente_phone, datetime_solicitado, pessoas, espaco_preferido,
        restaurants ( nome, transfer_phone )
      `)
      .eq('id', id)
      .single()

    if (!request) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    if (request.estado !== 'pendente_restaurante') return NextResponse.json({ error: 'Pedido já processado' }, { status: 409 })

    const restaurant = Array.isArray(request.restaurants) ? request.restaurants[0] : request.restaurants
    if (!restaurant?.transfer_phone) {
      return NextResponse.json({ error: 'Número de telefone do restaurante não configurado' }, { status: 422 })
    }

    const confirmUrl = `${appUrl}/confirm/ultima-hora/${id}`
    const dt = request.datetime_solicitado ? new Date(request.datetime_solicitado).toLocaleString('pt-PT') : '—'
    const smsText = [
      `Nine Calls | ${restaurant.nome}`,
      `Mesa de última hora:`,
      `Cliente: ${request.cliente_nome ?? '—'} (${request.cliente_phone ?? '—'})`,
      `Data/Hora: ${dt}`,
      `Pessoas: ${request.pessoas ?? '—'} | Espaço: ${request.espaco_preferido ?? '—'}`,
      `→ Confirmar/Rejeitar: ${confirmUrl}`,
      `(Expira em 4 horas)`,
    ].join('\n')

    await sendSms(telnyxApiKey, telnyxFrom, restaurant.transfer_phone, smsText)

    await db
      .from('ultima_hora_requests')
      .update({ sms_enviado_restaurante: true })
      .eq('id', id)

    console.log(`[send-confirmation-sms] SMS ultima_hora enviado → ${restaurant.nome} (${id})`)
    return NextResponse.json({ ok: true, tipo, id })
  } catch (err) {
    console.error('[send-confirmation-sms] erro:', err)

    // SMS failed — alert Slack #sistema
    const slackToken = process.env.SLACK_BOT_TOKEN
    const slackChannel = process.env.SLACK_CHANNEL_SISTEMA
    if (slackToken && slackChannel) {
      await fetch('https://slack.com/api/chat.postMessage', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${slackToken}` },
        body: JSON.stringify({
          channel: slackChannel,
          text: `🔴 SMS não enviado — tipo: ${tipo} — ID: ${id} — reenvio manual necessário\n\`${String(err)}\``,
        }),
      }).catch(() => {})
    }

    return NextResponse.json({ error: 'Falha ao enviar SMS' }, { status: 500 })
  }
}

async function sendSms(apiKey: string, from: string, to: string, text: string) {
  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, text }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Telnyx SMS error ${res.status}: ${errText}`)
  }

  return res.json()
}
