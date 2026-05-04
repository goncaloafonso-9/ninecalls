import { NextRequest, NextResponse } from 'next/server'
import { stripe } from '@/lib/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import Stripe from 'stripe'

// Required for raw body access in Next.js
export const runtime = 'nodejs'

async function notifySlack(channel: string, text: string) {
  const token = process.env.SLACK_BOT_TOKEN
  if (!token || !channel) return
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ channel, text }),
  })
}

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!webhookSecret) {
    return NextResponse.json({ error: 'Webhook secret não configurado' }, { status: 500 })
  }

  const body = await req.text()
  const sig = req.headers.get('stripe-signature')

  if (!sig) {
    return NextResponse.json({ error: 'Sem assinatura Stripe' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret)
  } catch {
    return NextResponse.json({ error: 'Assinatura inválida' }, { status: 400 })
  }

  const db = createAdminClient()

  switch (event.type) {
    case 'invoice.payment_succeeded': {
      const invoice = event.data.object as Stripe.Invoice
      const stripeInvoiceId = invoice.id
      const customerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

      if (!customerId) break

      // Find billing cycle by stripe_invoice_id
      const { data: cycle } = await db
        .from('billing_cycles')
        .select('id, restaurant_id')
        .eq('stripe_invoice_id', stripeInvoiceId)
        .single()

      if (cycle) {
        await db
          .from('billing_cycles')
          .update({ estado_pagamento: 'pago', pago_em: new Date().toISOString() })
          .eq('id', cycle.id)
      }

      await notifySlack(
        process.env.SLACK_CHANNEL_PAGAMENTOS ?? '',
        `✅ Pagamento recebido: Invoice \`${stripeInvoiceId}\` — €${((invoice.amount_paid ?? 0) / 100).toFixed(2)}`
      )
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      const stripeInvoiceId = invoice.id

      const { data: cycle } = await db
        .from('billing_cycles')
        .select('id, restaurant_id')
        .eq('stripe_invoice_id', stripeInvoiceId)
        .single()

      if (cycle) {
        await db
          .from('billing_cycles')
          .update({ estado_pagamento: 'em_atraso' })
          .eq('id', cycle.id)
      }

      await notifySlack(
        process.env.SLACK_CHANNEL_PAGAMENTOS ?? '',
        `⚠️ Falha no pagamento: Invoice \`${stripeInvoiceId}\` — €${((invoice.amount_due ?? 0) / 100).toFixed(2)}`
      )
      break
    }

    case 'setup_intent.succeeded': {
      const si = event.data.object as Stripe.SetupIntent
      const customerId = typeof si.customer === 'string' ? si.customer : si.customer?.id
      const pmId = typeof si.payment_method === 'string' ? si.payment_method : si.payment_method?.id

      if (customerId && pmId) {
        await db
          .from('clients')
          .update({ stripe_payment_method_id: pmId })
          .eq('stripe_customer_id', customerId)
      }
      break
    }

    default:
      // Ignore unknown events
      break
  }

  return NextResponse.json({ received: true })
}
