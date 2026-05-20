import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'
import { stripe } from '@/lib/stripe'
import type { PdfCicloPayload } from '@/types/pdf-ciclo'
import type { ActivacaoRestaurantePayload } from '@/types/activacao-restaurante'

export const runtime = 'nodejs'

function formatEuro(value: number) {
  return `€${value.toFixed(2)}`
}

// WF-CRON-02 — Close Billing Cycles + Create Invoices (09:00)
// Closes cycles with fecho_pendente=true, creates Stripe invoices (unless is_founder or skip_stripe_invoice),
// opens next 30-day cycle, and triggers PDF generation via n8n.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const results: { cycle_id: string; restaurant: string; action: string }[] = []

  const { data: cycles, error: fetchError } = await db
    .from('billing_cycles')
    .select(`
      id, numero_ciclo, restaurant_id, data_inicio, data_fim_prevista, estado,
      stripe_invoice_id,
      total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados,
      valor_comissoes_reservas, valor_comissoes_ultima_hora, valor_takeaways, valor_total,
      snapshot_comissao_por_pessoa, snapshot_taxa_takeaway,
      snapshot_taxa_mensal_fixa, valor_mensalidade,
      is_founder, skip_stripe_invoice,
      restaurants (
        id, nome, slug, estado, morada, isento_faturacao,
        tem_garantia, objetivo_garantia, slack_channel_id,
        valor_estimado_por_pessoa, google_drive_folder_link,
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
    console.error('[wf-cron-02] fetch error:', fetchError)
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
    const isFounder = cycle.is_founder ?? false
    const skipStripe = cycle.skip_stripe_invoice ?? false

    try {
      // 1. Fetch calls for this cycle
      const { data: calls } = await db
        .from('calls')
        .select('duration_seconds, call_successful, user_sentiment, tipo_chamada, motivo_transferencia, espaco_preferido')
        .eq('billing_cycle_id', cycleId)

      const minutos_usados = Math.round(
        (calls?.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) ?? 0) / 60
      )

      // 2. Fetch bookings stats
      const { data: reservas } = await db
        .from('bookings')
        .select('estado, number_of_people')
        .eq('billing_cycle_id', cycleId)

      const reservas_confirmadas = reservas?.filter(r => r.estado === 'confirmada').length ?? 0
      const reservas_canceladas = reservas?.filter(r => r.estado === 'cancelado').length ?? 0
      const reservas_no_show = reservas?.filter(r => r.estado === 'no_show').length ?? 0
      const total_pessoas_confirmadas = (cycle.total_pessoas_reservas ?? 0) + (cycle.total_pessoas_ultima_hora ?? 0)

      // 3. Fetch count of accepted ultima_hora requests (pedidos, not pessoas)
      const { count: totalUltimaHoraPedidos } = await db
        .from('ultima_hora_requests')
        .select('id', { count: 'exact', head: true })
        .eq('billing_cycle_id', cycleId)
        .eq('estado', 'aceite')

      // 4. Stripe decision — FIX 1.4: also skip if valor_total <= 0 (zero-value cycle)
      let stripeInvoiceId: string | null = cycle.stripe_invoice_id ?? null
      const shouldSkipStripe = isFounder || skipStripe || restaurant.isento_faturacao || (Number(cycle.valor_total) <= 0)

      // 5. STRIPE DECISION (runs BEFORE closing the cycle — FIX 1.2)
      if (!shouldSkipStripe && client?.stripe_customer_id) {
        if (stripeInvoiceId) {
          // FIX 1.3: duplicate guard — set estado_pagamento and continue (don't skip remaining flow)
          console.log(`[wf-cron-02] stripe_invoice_id already set for cycle ${cycleId} — ensuring estado_pagamento`)
          await db.from('billing_cycles').update({ estado_pagamento: 'pendente' }).eq('id', cycleId)
        } else {
          const stripeCustomerId = client.stripe_customer_id

          const invoice = await stripe.invoices.create({
            customer: stripeCustomerId,
            collection_method: 'charge_automatically',
            currency: 'eur',
            description: `Nine Calls — ${restaurantNome} — Ciclo ${numeroCiclo}`,
            payment_settings: { payment_method_types: ['sepa_debit'] },
            metadata: {
              billing_cycle_id: cycleId,
              restaurant_id: cycle.restaurant_id,
              numero_ciclo: String(numeroCiclo),
            },
          })

          // Save stripe_invoice_id immediately after creation (before items)
          await db
            .from('billing_cycles')
            .update({ stripe_invoice_id: invoice.id })
            .eq('id', cycleId)
          stripeInvoiceId = invoice.id

          // Create invoice items — delete draft on failure to avoid orphans
          try {
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

            if ((cycle.snapshot_taxa_mensal_fixa ?? 0) > 0) {
              await stripe.invoiceItems.create({
                customer: stripeCustomerId,
                invoice: invoice.id,
                amount: Math.round((cycle.snapshot_taxa_mensal_fixa ?? 0) * 100),
                currency: 'eur',
                description: `Mensalidade Nine Calls — €${cycle.snapshot_taxa_mensal_fixa}/mês`,
              })
            }
          } catch (itemErr) {
            try {
              await stripe.invoices.del(invoice.id)
            } catch (delErr) {
              console.error(`[wf-cron-02] failed to delete draft invoice ${invoice.id}:`, delErr)
            }
            throw new Error(`Falha ao criar invoice items: ${String(itemErr)}`)
          }

          await stripe.invoices.finalizeInvoice(invoice.id)

          await db
            .from('billing_cycles')
            .update({ estado_pagamento: 'pendente' })
            .eq('id', cycleId)

          await sendSlackMessage({
            channel: 'faturacao',
            text: `💳 Ciclo ${numeroCiclo} fechado — ${restaurantNome} — ${formatEuro(Number(cycle.valor_total) || 0)} — Invoice Stripe \`${stripeInvoiceId}\` criada${isFounder ? ' 🏆 Fundador' : ''}`,
          })
        }
      } else if (shouldSkipStripe) {
        const razao = isFounder ? 'fundador' : skipStripe ? 'skip_stripe_invoice' : Number(cycle.valor_total) <= 0 ? 'valor_zero' : 'isento_faturacao'
        await db.from('billing_cycles').update({ estado_pagamento: 'isento' }).eq('id', cycleId)
        await db.from('audit_log').insert({
          acao: 'close_cycle_no_invoice',
          entidade_tipo: 'billing_cycle',
          entidade_id: cycleId,
          detalhes: { restaurant_id: cycle.restaurant_id, numero_ciclo: numeroCiclo, razao },
        })
        await sendSlackMessage({
          channel: 'faturacao',
          text: `💳 Ciclo ${numeroCiclo} fechado — ${restaurantNome} — ${formatEuro(Number(cycle.valor_total) || 0)} — sem Invoice Stripe (${razao})${isFounder ? ' 🏆' : ''}`,
        })
      } else {
        // FIX 1.5: missing stripe_customer_id — set estado_pagamento='pendente' for manual review
        await db.from('billing_cycles').update({ estado_pagamento: 'pendente' }).eq('id', cycleId)
        await sendSlackAlert(
          'sistema',
          `⚠️ Ciclo ${numeroCiclo} fechado sem invoice — ${restaurantNome} sem stripe_customer_id`,
          `cycle_id: ${cycleId}\nrestaurant_id: ${cycle.restaurant_id}\nManual review required.`,
          'warning'
        )
        await db.from('audit_log').insert({
          acao: 'close_cycle_no_stripe_customer',
          entidade_tipo: 'billing_cycle',
          entidade_id: cycleId,
          detalhes: { restaurant_id: cycle.restaurant_id, numero_ciclo: numeroCiclo, razao: 'sem_stripe_customer_id' },
        })
      }

      // FIX 1.2: Close the cycle AFTER the Stripe decision is complete
      await db
        .from('billing_cycles')
        .update({ estado: 'concluido', data_fim_real: today, minutos_usados })
        .eq('id', cycleId)

      // FIX 1.1: Ciclo 0 — only transition to ativo if NOT rescindido
      if (numeroCiclo === 0) {
        if (restaurant.estado !== 'rescindido') {
          await db.from('restaurants').update({ estado: 'ativo' }).eq('id', cycle.restaurant_id)
        }

        const { data: gt } = await db
          .from('guarantee_tracking')
          .select('estado')
          .eq('restaurant_id', cycle.restaurant_id)
          .single()

        if (gt?.estado === 'cumprido') {
          await sendSlackMessage({ channel: 'garantias', text: `🎉 Garantia cumprida — ${restaurantNome} → ATIVO` })
        } else if (gt?.estado === 'nao_cumprido_30_dias') {
          await sendSlackMessage({ channel: 'garantias', text: `❌ 30 dias sem objectivo — ${restaurantNome} — ⚠️ VERIFICAR REEMBOLSO` })
        }

        const { error: cleanupErr } = await db.rpc('fn_activar_restaurante_limpar_dados', {
          p_restaurant_id: cycle.restaurant_id,
        })
        if (cleanupErr) {
          console.error(`[wf-cron-02] cleanup error for ${restaurantNome}:`, cleanupErr)
          await sendSlackAlert('sistema', `Falha na limpeza de dados — ${restaurantNome}`, String(cleanupErr), 'warning')
        }

        // Disparar webhook n8n de activação (fire-and-forget)
        if (restaurant.estado !== 'rescindido' && process.env.N8N_ACTIVACAO_WEBHOOK_URL) {
          const { data: fullRestaurant } = await db
            .from('restaurants')
            .select('*, clients(nome_empresa, email_contacto, email_faturacao, telefone)')
            .eq('id', cycle.restaurant_id)
            .single()

          const { data: agentData } = await db
            .from('agents')
            .select('telnyx_phone')
            .eq('restaurant_id', cycle.restaurant_id)
            .eq('activo', true)
            .limit(1)
            .maybeSingle()

          if (fullRestaurant) {
            const fullClient = Array.isArray(fullRestaurant.clients)
              ? fullRestaurant.clients[0]
              : fullRestaurant.clients

            const activacaoPayload: ActivacaoRestaurantePayload = {
              restaurant_id: cycle.restaurant_id,
              restaurant_nome: fullRestaurant.nome,
              restaurant_slug: fullRestaurant.slug,
              restaurant_morada: fullRestaurant.morada ?? null,
              restaurant_telnyx_phone: (agentData as { telnyx_phone?: string } | null)?.telnyx_phone ?? fullRestaurant.telnyx_phone ?? null,
              restaurant_transfer_phone: fullRestaurant.transfer_phone ?? null,
              restaurant_google_drive_folder_link: fullRestaurant.google_drive_folder_link ?? null,
              client_nome: fullClient?.nome_empresa ?? '',
              client_email: fullClient?.email_contacto ?? fullClient?.email_faturacao ?? '',
              client_telefone: fullClient?.telefone ?? null,
              comissao_por_pessoa: fullRestaurant.comissao_por_pessoa ?? 0,
              taxa_takeaway: fullRestaurant.taxa_takeaway ?? 0,
              taxa_mensal_fixa: fullRestaurant.taxa_mensal_fixa ?? 0,
              snapshot_pessoas_por_takeaway: fullRestaurant.snapshot_pessoas_por_takeaway ?? 0,
              valor_estimado_por_pessoa: fullRestaurant.valor_estimado_por_pessoa ?? 0,
              objetivo_garantia: fullRestaurant.objetivo_garantia ?? 0,
              periodo_compromisso_dias: fullRestaurant.periodo_compromisso_dias ?? 0,
              tem_garantia: true,
              numero_ciclo_inicial: 0,
              data_live: fullRestaurant.data_live ?? today,
              activado_em: new Date().toISOString(),
            }

            fetch(process.env.N8N_ACTIVACAO_WEBHOOK_URL, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(activacaoPayload),
            }).catch(err => console.error('[activacao-webhook] erro ao enviar:', err))
          }
        }
      }

      // Create next billing cycle (always runs — FIX 1.3: not blocked by duplicate guard)
      const { data: newRestaurant } = await db
        .from('restaurants')
        .select('comissao_por_pessoa, taxa_takeaway, taxa_mensal_fixa')
        .eq('id', cycle.restaurant_id)
        .single()

      if (newRestaurant) {
        const nextDataInicio = new Date(today)
        const nextDataFim = new Date(nextDataInicio)
        nextDataFim.setDate(nextDataFim.getDate() + 30)

        const { data: newCycleInserted } = await db.from('billing_cycles').insert({
          restaurant_id: cycle.restaurant_id,
          numero_ciclo: numeroCiclo + 1,
          data_inicio: today,
          data_fim_prevista: nextDataFim.toISOString().split('T')[0],
          estado: 'ativo',
          is_founder: isFounder,
          snapshot_comissao_por_pessoa: newRestaurant.comissao_por_pessoa,
          snapshot_taxa_takeaway: newRestaurant.taxa_takeaway,
          snapshot_taxa_mensal_fixa: newRestaurant.taxa_mensal_fixa,
          valor_mensalidade: newRestaurant.taxa_mensal_fixa,
        }).select('id').single()

        // Recalcular valor_total inicial — garante que inclui valor_mensalidade
        // mesmo em ciclos sem actividade (triggers não disparam sem bookings/takeaways)
        if (newCycleInserted?.id) {
          await db.rpc('fn_recalc_billing_cycle_total', { p_cycle_id: newCycleInserted.id })
        }
      }

      await db.from('audit_log').insert({
        acao: 'close_cycle',
        entidade_tipo: 'billing_cycle',
        entidade_id: cycleId,
        detalhes: { restaurant_id: cycle.restaurant_id, numero_ciclo: numeroCiclo, stripe_invoice_id: stripeInvoiceId, is_founder: isFounder },
      })

      // Build and send PDF payload to n8n
      const totalChamadas = calls?.length ?? 0
      const chamadasSucesso = calls?.filter(c => c.call_successful === true).length ?? 0
      const sentimentoPos = calls?.filter(c => c.user_sentiment === 'positive').length ?? 0
      const sentimentoNeu = calls?.filter(c => c.user_sentiment === 'neutral').length ?? 0
      const sentimentoNeg = calls?.filter(c => c.user_sentiment === 'negative').length ?? 0
      const duracaoMedia = totalChamadas > 0
        ? Math.round((calls?.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) ?? 0) / totalChamadas)
        : 0

      const countByTipo = (tipo: string) => calls?.filter(c => c.tipo_chamada === tipo).length ?? 0

      const transferencias = calls?.filter(c => c.tipo_chamada === 'transferencia')
      const motivoCount: Record<string, number> = {}
      for (const t of transferencias ?? []) {
        if (t.motivo_transferencia) {
          motivoCount[t.motivo_transferencia] = (motivoCount[t.motivo_transferencia] ?? 0) + 1
        }
      }
      const top_motivos_transferencia = Object.entries(motivoCount)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 3)
        .map(([motivo]) => motivo)

      const countByEspaco = (espaco: string) => calls?.filter(c => c.espaco_preferido === espaco).length ?? 0

      const totalFinal = Number(cycle.valor_total) || 0
      const taxaNoShowPct = total_pessoas_confirmadas > 0
        ? Math.round((reservas_no_show / total_pessoas_confirmadas) * 100)
        : 0

      const receitaEstimadaRecuperada =
        total_pessoas_confirmadas * 20
        + (cycle.total_takeaways_confirmados ?? 0) * 35
      const roiPercent = totalFinal > 0
        ? Math.round(((receitaEstimadaRecuperada - totalFinal) / totalFinal) * 100)
        : 0

      const pdfPayload: PdfCicloPayload = {
        ciclo_id: cycleId,
        restaurant_id: cycle.restaurant_id,
        restaurant_name: restaurantNome,
        restaurant_slug: restaurant.slug ?? '',
        restaurant_address: restaurant.morada ?? '',
        client_name: client?.nome_empresa ?? '',
        client_email: client?.email_faturacao ?? '',
        data_inicio: cycle.data_inicio ?? '',
        data_fim: today,
        duracao_dias: 30,
        numero_ciclo: numeroCiclo,
        comissao_por_pessoa: Number(cycle.snapshot_comissao_por_pessoa) || 0,
        taxa_takeaway: Number(cycle.snapshot_taxa_takeaway) || 0,
        valor_estimado_por_pessoa: 20,
        is_founder: isFounder,
        total_chamadas: totalChamadas,
        chamadas_sucesso: chamadasSucesso,
        taxa_sucesso_percent: totalChamadas > 0 ? Math.round((chamadasSucesso / totalChamadas) * 100) : 0,
        sentimento_positivo_percent: totalChamadas > 0 ? Math.round((sentimentoPos / totalChamadas) * 100) : 0,
        sentimento_neutro_percent: totalChamadas > 0 ? Math.round((sentimentoNeu / totalChamadas) * 100) : 0,
        sentimento_negativo_percent: totalChamadas > 0 ? Math.round((sentimentoNeg / totalChamadas) * 100) : 0,
        duracao_media_chamada_segundos: duracaoMedia,
        reservas_confirmadas,
        reservas_canceladas,
        reservas_no_show,
        total_pessoas_confirmadas,
        taxa_no_show_percent: taxaNoShowPct,
        pedidos_takeaway: cycle.total_takeaways_confirmados ?? 0,
        pedidos_ultima_hora: totalUltimaHoraPedidos ?? 0,
        subtotal_reservas: Number(cycle.valor_comissoes_reservas) || 0,
        subtotal_takeaway: Number(cycle.valor_takeaways) || 0,
        subtotal_mensalidade: Number(cycle.valor_mensalidade) || 0,
        taxa_mensal_fixa: Number(cycle.snapshot_taxa_mensal_fixa) || 0,
        desconto_no_show: 0,
        total_final: totalFinal,
        receita_estimada_recuperada: receitaEstimadaRecuperada,
        roi_percent: roiPercent,
        stripe_invoice_id: stripeInvoiceId,
        skip_stripe_invoice: skipStripe,
        distribuicao_tipos: {
          agendamento: countByTipo('agendamento'),
          reagendamento: countByTipo('reagendamento'),
          cancelamento: countByTipo('cancelamento'),
          takeaway: countByTipo('takeaway'),
          ultima_hora: countByTipo('ultima_hora'),
          apoio: countByTipo('apoio'),
          transferencia: countByTipo('transferencia'),
          spam_hangup: countByTipo('spam_hangup'),
        },
        top_motivos_transferencia,
        distribuicao_espacos: {
          sala: countByEspaco('sala'),
          terraco: countByEspaco('terraco'),
          esplanada: countByEspaco('esplanada'),
          sem_preferencia: countByEspaco('sem_preferencia'),
        },
        gerado_em: new Date().toISOString(),
        google_drive_folder_link: restaurant?.google_drive_folder_link ?? '',
      }

      // Trigger PDF generation via internal endpoint
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? ''
      if (appUrl && process.env.CRON_JOBS) {
        try {
          await fetch(`${appUrl}/api/internal/trigger-pdf-ciclo`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${process.env.CRON_JOBS}`,
            },
            body: JSON.stringify(pdfPayload),
            signal: AbortSignal.timeout(30000),
          })
        } catch (pdfErr) {
          console.error(`[wf-cron-02] PDF trigger failed for ${restaurantNome}:`, pdfErr)
          await sendSlackAlert('sistema', `Falha ao disparar PDF para ${restaurantNome}`, String(pdfErr), 'warning')
        }
      }

      results.push({ cycle_id: cycleId, restaurant: restaurantNome, action: 'closed' })
    } catch (err) {
      console.error(`[wf-cron-02] error for cycle ${cycleId}:`, err)
      await sendSlackAlert('sistema', `Erro ao fechar ciclo ${numeroCiclo} — ${restaurantNome}`, String(err), 'error')
      results.push({ cycle_id: cycleId, restaurant: restaurantNome, action: 'error' })
    }
  }

  console.log(JSON.stringify({ event: 'wf-cron-02', ciclos_fechados: results.filter(r => r.action === 'closed').length, timestamp: new Date().toISOString() }))

  return NextResponse.json({ ok: true, ciclos_fechados: results.filter(r => r.action === 'closed').length, results })
}
