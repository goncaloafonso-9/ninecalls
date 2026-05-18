import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { archiveSlackChannel } from '@/lib/slack'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  restaurantId: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { restaurantId } = parsed.data
  const db = createAdminClient()

  const { data: restaurant, error: fetchErr } = await db
    .from('restaurants')
    .select('id, estado, client_id, slack_channel_id')
    .eq('id', restaurantId)
    .single()

  if (fetchErr || !restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })
  if (restaurant.estado !== 'rescindido') return NextResponse.json({ error: 'O restaurante tem de estar rescindido para ser apagado' }, { status: 400 })

  // Archive Slack channel before deleting (non-blocking — log but don't fail)
  if (restaurant.slack_channel_id) {
    const slackResult = await archiveSlackChannel(restaurant.slack_channel_id)
    if (!slackResult.ok) {
      console.error('[apagar-restaurante] Falha ao arquivar canal Slack:', slackResult.error)
    }
  }

  // Void open Stripe invoices (pendente = finalized/open, em_atraso = payment failed/open)
  const { data: openCycles } = await db
    .from('billing_cycles')
    .select('stripe_invoice_id')
    .eq('restaurant_id', restaurantId)
    .in('estado_pagamento', ['pendente', 'em_atraso'])
    .not('stripe_invoice_id', 'is', null)

  if (openCycles && openCycles.length > 0) {
    for (const cycle of openCycles) {
      if (!cycle.stripe_invoice_id) continue
      try {
        await stripe.invoices.voidInvoice(cycle.stripe_invoice_id)
      } catch (err) {
        console.error(`[apagar-restaurante] Falha ao anular invoice Stripe ${cycle.stripe_invoice_id}:`, err)
        // Non-blocking — log and continue; invoice can be voided manually in Stripe dashboard
      }
    }
  }

  // Delete in dependency order
  const tables = [
    'calls',
    'bookings',
    'takeaway_requests',
    'ultima_hora_requests',
    'guarantee_tracking',
    'conversoes_manuais',
    'billing_cycles',
    'agents',
  ]

  for (const table of tables) {
    const { error } = await db.from(table as never).delete().eq('restaurant_id', restaurantId)
    if (error) {
      console.error(`Erro ao apagar ${table}:`, error.message)
      // Continue — some tables may not exist or have no rows
    }
  }

  const { error: deleteErr } = await db.from('restaurants').delete().eq('id', restaurantId)
  if (deleteErr) return NextResponse.json({ error: deleteErr.message }, { status: 500 })

  return NextResponse.json({ success: true, clientId: restaurant.client_id })
}
