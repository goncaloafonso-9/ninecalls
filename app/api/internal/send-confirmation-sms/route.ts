import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

const schema = z.object({
  tipo: z.enum(['takeaway', 'ultima-hora']),
  id: z.string().uuid(),
})

async function sendSMS(to: string, text: string) {
  const apiKey = process.env.TELNYX_API_KEY
  const from = process.env.TELNYX_SMS_FROM
  if (!apiKey || !from) throw new Error('Telnyx não configurado')

  const res = await fetch('https://api.telnyx.com/v2/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ from, to, text }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Telnyx error: ${err}`)
  }
}

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
    return NextResponse.json({ error: 'Parâmetros inválidos', issues: parsed.error.issues }, { status: 400 })
  }

  const { tipo, id } = parsed.data
  const db = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''

  if (tipo === 'takeaway') {
    const { data: order, error } = await db
      .from('takeaway_orders')
      .select(`
        id, items_texto, hora_levantamento, expira_em,
        customer_name, customer_phone,
        restaurants (nome, telefone_restaurante, slug)
      `)
      .eq('id', id)
      .single()

    if (error || !order) {
      return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
    }

    const restaurant = Array.isArray(order.restaurants) ? order.restaurants[0] : order.restaurants
    if (!restaurant?.telefone_restaurante) {
      return NextResponse.json({ error: 'Restaurante sem telefone' }, { status: 422 })
    }

    const confirmUrl = `${appUrl}/confirm/takeaway/${id}`
    const hora = order.hora_levantamento
      ? new Date(order.hora_levantamento).toLocaleTimeString('pt-PT', { hour: '2-digit', minute: '2-digit' })
      : 'N/D'

    const smsText = [
      `Nine Calls | ${restaurant.nome}`,
      `Novo pedido takeaway:`,
      `Cliente: ${order.customer_name} (${order.customer_phone})`,
      `Levantamento: ${hora}`,
      `Itens: ${order.items_texto ?? 'Ver link'}`,
      `→ Confirmar/Rejeitar: ${confirmUrl}`,
      `(Expira em 4 horas)`,
    ].join('\n')

    try {
      await sendSMS(restaurant.telefone_restaurante, smsText)
      await db
        .from('takeaway_orders')
        .update({ sms_enviado_restaurante: true })
        .eq('id', id)
      return NextResponse.json({ ok: true })
    } catch (err) {
      await db
        .from('takeaway_orders')
        .update({ sms_enviado_restaurante: false })
        .eq('id', id)
      await notifySlack(
        process.env.SLACK_CHANNEL_SISTEMA ?? '',
        `🔴 SMS não enviado — ${restaurant.nome} — takeaway — ID: ${id} — reenvio manual necessário`
      )
      console.error('[send-confirmation-sms] Telnyx error:', err)
      return NextResponse.json({ error: 'Falha no envio SMS' }, { status: 500 })
    }
  }

  // ultima-hora
  const { data: request, error } = await db
    .from('ultima_hora_requests')
    .select(`
      id, num_pessoas, espaco, booking_datetime, expira_em,
      customer_name, customer_phone,
      restaurants (nome, telefone_restaurante, slug)
    `)
    .eq('id', id)
    .single()

  if (error || !request) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  const restaurant = Array.isArray(request.restaurants) ? request.restaurants[0] : request.restaurants
  if (!restaurant?.telefone_restaurante) {
    return NextResponse.json({ error: 'Restaurante sem telefone' }, { status: 422 })
  }

  const confirmUrl = `${appUrl}/confirm/ultima-hora/${id}`
  const dt = request.booking_datetime
    ? new Date(request.booking_datetime).toLocaleString('pt-PT', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
      })
    : 'N/D'

  const smsText = [
    `Nine Calls | ${restaurant.nome}`,
    `Mesa de última hora:`,
    `Cliente: ${request.customer_name} (${request.customer_phone})`,
    `Data/Hora: ${dt}`,
    `Pessoas: ${request.num_pessoas} | Espaço: ${request.espaco ?? 'N/D'}`,
    `→ Confirmar/Rejeitar: ${confirmUrl}`,
    `(Expira em 4 horas)`,
  ].join('\n')

  try {
    await sendSMS(restaurant.telefone_restaurante, smsText)
    await db
      .from('ultima_hora_requests')
      .update({ sms_enviado_restaurante: true })
      .eq('id', id)
    return NextResponse.json({ ok: true })
  } catch (err) {
    await db
      .from('ultima_hora_requests')
      .update({ sms_enviado_restaurante: false })
      .eq('id', id)
    await notifySlack(
      process.env.SLACK_CHANNEL_SISTEMA ?? '',
      `🔴 SMS não enviado — ${restaurant.nome} — última hora — ID: ${id} — reenvio manual necessário`
    )
    console.error('[send-confirmation-sms] Telnyx error:', err)
    return NextResponse.json({ error: 'Falha no envio SMS' }, { status: 500 })
  }
}
