import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'
import { stripe } from '@/lib/stripe'

export const runtime = 'nodejs'

function formatEuro(value: number) {
  return `€${value.toFixed(2)}`
}

// Called by WF-CRON-02 at 09:00 daily.
// Closes billing cycles with fecho_pendente=true, creates Stripe invoices, opens next cycle.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const results: { cycle_id: string; restaurant: string; action: string }[] = []

  // Find cycles ready to close
  const { data: cycles, error: fetchError } = await db
    .from('billing_cycles')
    .select(`
      id, numero_ciclo, restaurant_id, data_inicio, data_fim_prevista, estado,
      total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados,
      valor_comissoes_reservas, valor_comissoes_ultima_hora, valor_takeaways, valor_total,
      snapshot_comissao_por_pessoa, snapshot_taxa_takeaway, snapshot_pessoas_por_takeaway,
      restaurants (
        id, nome, slug, estado, isento_faturacao,
        clients (
          id, nome_empresa, stripe_customer_id, email_faturacao
        )
      )
    `)
    .eq('fecho_pendente', true)
    .eq('estado', 'ativo')
    .lte('data_fim_prevista', today)
    .neq('restaurants.estado', 'pausado')

  if (fetchError) {
    console.error('[fechar-ciclos] fetch error:', fetchError)
    return NextResponse.json({ error: fetchError.message }, { status: 500 })
  }

  if (!cycles || cycles.length === 0) {
    return NextResponse.json({ ok: true, ciclos_fechados: 0, results })
  }

  for (const cycle of cycles) {
    const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
    if (!restaurant) continue

    const client = Array.isArray(restaurant.clients) ? restaurant.clients[0] : restaurant.clients
    const restaurantNome = restaurant.nome
    const numeroCiclo = cycle.numero_ciclo
    const cycleId = cycle.id

    try {
      // Calculate minutes used
      const { data: calls } = await db
        .from('calls')
        .select('duration_seconds')
        .eq('billing_cycle_id', cycleId)

      const minutos_usados = Math.round(
        (calls?.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) ?? 0) / 60
      )

      // Close the cycle
      await db
        .from('billing_cycles')
        .update({
          estado: 'concluido',
          data_fim_real: today,
          minutos_usados,
        })
        .eq('id', cycleId)

      let stripeInvoiceId: string | null = null

      // Create Stripe invoice if not exempt
      if (!restaurant.isento_faturacao && client?.stripe_customer_id) {
        const stripeCustomerId = client.stripe_customer_id

        const invoice = await stripe.invoices.create({
          customer: stripeCustomerId,
          collection_method: 'charge_automatically',
          currency: 'eur',
          description: `Nine Calls — ${restaurantNome} — Ciclo ${numeroCiclo}`,
          metadata: {
            billing_cycle_id: cycleId,
            restaurant_id: cycle.restaurant_id,
            numero_ciclo: String(numeroCiclo),
          },
        })

        // Add invoice items for non-zero values
        if ((cycle.total_pessoas_reservas ?? 0) > 0 && (cycle.valor_comissoes_reservas ?? 0) > 0) {
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round((cycle.valor_comissoes_reservas ?? 0) * 100),
            currency: 'eur',
            description: `Reservas — ${cycle.total_pessoas_reservas} pessoas × €${cycle.snapshot_comissao_por_pessoa}/pessoa`,
          })
        }

        if ((cycle.total_pessoas_ultima_hora ?? 0) > 0 && (cycle.valor_comissoes_ultima_hora ?? 0) > 0) {
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round((cycle.valor_comissoes_ultima_hora ?? 0) * 100),
            currency: 'eur',
            description: `Mesa de Última Hora — ${cycle.total_pessoas_ultima_hora} pessoas × €${cycle.snapshot_comissao_por_pessoa}/pessoa`,
          })
        }

        if ((cycle.total_takeaways_confirmados ?? 0) > 0 && (cycle.valor_takeaways ?? 0) > 0) {
          await stripe.invoiceItems.create({
            customer: stripeCustomerId,
            invoice: invoice.id,
            amount: Math.round((cycle.valor_takeaways ?? 0) * 100),
            currency: 'eur',
            description: `Takeaways — ${cycle.total_takeaways_confirmados} pedidos × €${cycle.snapshot_taxa_takeaway}/pedido`,
          })
        }

        await stripe.invoices.finalizeInvoice(invoice.id)
        stripeInvoiceId = invoice.id

        await db
          .from('billing_cycles')
          .update({ stripe_invoice_id: stripeInvoiceId, estado_pagamento: 'pendente' })
          .eq('id', cycleId)

        await notifySlack(
          process.env.SLACK_CHANNEL_FATURACAO ?? '',
          `💳 Ciclo ${numeroCiclo} fechado — ${restaurantNome} — ${formatEuro(Number(cycle.valor_total) || 0)} — Invoice Stripe \`${stripeInvoiceId}\` criada`
        )
      } else if (restaurant.isento_faturacao) {
        await db
          .from('billing_cycles')
          .update({ estado_pagamento: 'isento' })
          .eq('id', cycleId)

        await db.from('audit_log').insert({
          acao: 'close_cycle_zero_value',
          entidade_tipo: 'billing_cycle',
          entidade_id: cycleId,
          detalhes: { restaurant_id: cycle.restaurant_id, numero_ciclo: numeroCiclo },
        })

        await notifySlack(
          process.env.SLACK_CHANNEL_FATURACAO ?? '',
          `💳 Ciclo ${numeroCiclo} fechado — ${restaurantNome} — €0 — isento (sem Invoice Stripe)`
        )
      }

      // If ciclo 0: transition restaurant to ativo
      if (numeroCiclo === 0) {
        await db
          .from('restaurants')
          .update({ estado: 'ativo' })
          .eq('id', cycle.restaurant_id)

        // Check guarantee outcome
        const { data: gt } = await db
          .from('guarantee_tracking')
          .select('estado')
          .eq('restaurant_id', cycle.restaurant_id)
          .single()

        if (gt?.estado === 'cumprido') {
          await notifySlack(
            process.env.SLACK_CHANNEL_GARANTIAS ?? '',
            `🎉 Garantia cumprida — ${restaurantNome} → ATIVO`
          )
        } else if (gt?.estado === 'nao_cumprido_30_dias') {
          await notifySlack(
            process.env.SLACK_CHANNEL_GARANTIAS ?? '',
            `❌ 30 dias sem objectivo — ${restaurantNome} — ⚠️ VERIFICAR REEMBOLSO`
          )
        }
      }

      // Create next billing cycle
      const { data: newRestaurant } = await db
        .from('restaurants')
        .select('comissao_por_pessoa, taxa_takeaway, pessoas_por_takeaway')
        .eq('id', cycle.restaurant_id)
        .single()

      if (newRestaurant) {
        const nextDataInicio = new Date(today)
        const nextDataFim = new Date(nextDataInicio)
        nextDataFim.setDate(nextDataFim.getDate() + 30)

        await db.from('billing_cycles').insert({
          restaurant_id: cycle.restaurant_id,
          numero_ciclo: numeroCiclo + 1,
          data_inicio: today,
          data_fim_prevista: nextDataFim.toISOString().split('T')[0],
          estado: 'ativo',
          snapshot_comissao_por_pessoa: newRestaurant.comissao_por_pessoa,
          snapshot_taxa_takeaway: newRestaurant.taxa_takeaway,
          snapshot_pessoas_por_takeaway: newRestaurant.pessoas_por_takeaway,
        })
      }

      await db.from('audit_log').insert({
        acao: 'close_cycle',
        entidade_tipo: 'billing_cycle',
        entidade_id: cycleId,
        detalhes: { restaurant_id: cycle.restaurant_id, numero_ciclo: numeroCiclo, stripe_invoice_id: stripeInvoiceId },
      })

      results.push({ cycle_id: cycleId, restaurant: restaurantNome, action: 'closed' })
    } catch (err) {
      console.error(`[fechar-ciclos] error for cycle ${cycleId}:`, err)
      await notifySlack(
        process.env.SLACK_CHANNEL_SISTEMA ?? '',
        `🔴 Erro ao fechar ciclo ${numeroCiclo} — ${restaurantNome}: ${String(err)}`
      )
      results.push({ cycle_id: cycleId, restaurant: restaurantNome, action: 'error' })
    }
  }

  return NextResponse.json({ ok: true, ciclos_fechados: results.filter(r => r.action === 'closed').length, results })
}
