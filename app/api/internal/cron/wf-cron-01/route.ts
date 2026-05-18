import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'

export const runtime = 'nodejs'

// WF-CRON-01 — Expire Pending Orders + Monitor Guarantees (07:00)
// 1. Expires takeaway_orders and ultima_hora_requests past expira_em
// 2. Monitors guarantee progress and alerts on days 20/25 or when < 80% with time remaining
// 3. Marks cycles for closure (fecho_pendente=true)
// 4. Updates em_compromisso for restaurants past commitment period
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const actions: string[] = []

  try {
    // --- 1. Expire pending orders ---

    const { data: expiredTakeaways, error: errT } = await db
      .from('takeaway_orders')
      .update({ estado: 'rejeitado' })
      .lt('expira_em', new Date().toISOString())
      .eq('estado', 'pendente_restaurante')
      .select('id, restaurants(nome)')

    if (errT) {
      console.error('[wf-cron-01] takeaway_orders error:', errT)
      await sendSlackAlert('sistema', 'Erro ao expirar takeaways', errT.message, 'error')
    }

    const { data: expiredUltimaHora, error: errU } = await db
      .from('ultima_hora_requests')
      .update({ estado: 'rejeitado' })
      .lt('expira_em', new Date().toISOString())
      .eq('estado', 'pendente_restaurante')
      .select('id, restaurants(nome)')

    if (errU) {
      console.error('[wf-cron-01] ultima_hora_requests error:', errU)
      await sendSlackAlert('sistema', 'Erro ao expirar última hora', errU.message, 'error')
    }

    const totalExpired = (expiredTakeaways?.length ?? 0) + (expiredUltimaHora?.length ?? 0)
    if (totalExpired > 5) {
      await sendSlackMessage({
        channel: 'sistema',
        text: `⚠️ ${totalExpired} pedidos expirados hoje (${expiredTakeaways?.length ?? 0} takeaways + ${expiredUltimaHora?.length ?? 0} última hora)`,
      })
    }
    actions.push(`expirados: ${totalExpired} pedidos`)

    // --- 2. Guarantee monitoring + fecho_pendente ---

    const { data: guarantees } = await db
      .from('guarantee_tracking')
      .select(`
        id, estado, contagem_actual, objetivo, data_inicio,
        billing_cycles (id, data_fim_prevista, fecho_pendente),
        restaurants (id, nome, slug)
      `)
      .eq('estado', 'em_curso')

    for (const gt of guarantees ?? []) {
      const restaurant = Array.isArray(gt.restaurants) ? gt.restaurants[0] : gt.restaurants
      const cycle = Array.isArray(gt.billing_cycles) ? gt.billing_cycles[0] : gt.billing_cycles

      if (!restaurant || !cycle) continue

      const inicio = new Date(gt.data_inicio ?? '')
      const diaEfectivo = Math.floor((Date.now() - inicio.getTime()) / 86400000) + 1
      const diasRestantes = Math.max(0, 30 - diaEfectivo)
      const pct = Math.round(((gt.contagem_actual ?? 0) / (gt.objetivo ?? 1)) * 100)
      const gap = (gt.objetivo ?? 0) - (gt.contagem_actual ?? 0)

      // Alert at day 20
      if (diaEfectivo === 20) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `⚠️ Dia 20/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} pessoas (${pct}%)`,
        })
        actions.push(`alertado dia 20: ${restaurant.nome}`)
      }

      // Alert at day 25
      if (diaEfectivo === 25) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `🔴 URGENTE Dia 25/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} — apenas ${diasRestantes} dias restantes`,
        })
        actions.push(`alertado dia 25: ${restaurant.nome}`)
      }

      // Alert when < 80% of objective and time remains (only on even days to avoid spam)
      if (pct < 80 && diasRestantes > 0 && diaEfectivo % 2 === 0 && diaEfectivo > 10) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `⚠️ *Garantia em risco — ${restaurant.nome}*\nCiclo: ${diaEfectivo} de 30 dias\nGarantia contratual: ${gt.objetivo} pessoas/ciclo\nActual: ${gt.contagem_actual} pessoas confirmadas\nGap: ${gap} pessoas em falta\nDias restantes: ${diasRestantes}`,
        })
        actions.push(`garantia em risco: ${restaurant.nome}`)
      }

      // Mark for closure if cumprido
      if (gt.estado === 'cumprido' && !cycle.fecho_pendente) {
        await db.from('billing_cycles').update({ fecho_pendente: true }).eq('id', cycle.id)
        actions.push(`fecho_pendente=true (cumprido): ${restaurant.nome}`)
      }

      // Mark for closure by expiration (30 days)
      if (cycle.data_fim_prevista && cycle.data_fim_prevista <= today) {
        await db.from('guarantee_tracking').update({ estado: 'nao_cumprido_30_dias' }).eq('id', gt.id)
        await db.from('billing_cycles').update({ fecho_pendente: true }).eq('id', cycle.id)
        await sendSlackMessage({
          channel: 'garantias',
          text: `❌ 30 dias sem objectivo — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} pessoas — ⚠️ VERIFICAR REEMBOLSO`,
        })
        actions.push(`nao_cumprido_30_dias: ${restaurant.nome}`)
      }
    }

    // --- 3. Mark normal cycles for closure ---

    const { data: normalCycles } = await db
      .from('billing_cycles')
      .select(`id, numero_ciclo, data_fim_prevista, restaurants (id, nome, estado)`)
      .eq('estado', 'ativo')
      .eq('fecho_pendente', false)
      .gt('numero_ciclo', 0)
      .lte('data_fim_prevista', today)

    for (const cycle of normalCycles ?? []) {
      const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
      if (!restaurant || restaurant.estado === 'pausado') continue
      await db.from('billing_cycles').update({ fecho_pendente: true }).eq('id', cycle.id)
      actions.push(`fecho_pendente=true (ciclo ${cycle.numero_ciclo}): ${restaurant.nome}`)
    }

    // --- 4. Update em_compromisso ---

    const { data: committed } = await db
      .from('restaurants')
      .select('id, nome, slug, data_inicio_compromisso, periodo_compromisso_dias')
      .eq('em_compromisso', true)
      .neq('estado', 'rescindido')

    for (const r of committed ?? []) {
      if (!r.data_inicio_compromisso || !r.periodo_compromisso_dias) continue
      const endDate = new Date(r.data_inicio_compromisso)
      endDate.setDate(endDate.getDate() + r.periodo_compromisso_dias)
      if (endDate <= new Date()) {
        await db.from('restaurants').update({ em_compromisso: false }).eq('id', r.id)
        await sendSlackMessage({ channel: 'sistema', text: `📅 ${r.nome} saiu do período de compromisso` })
        actions.push(`em_compromisso=false: ${r.nome}`)
      }
    }

    console.log(JSON.stringify({ event: 'wf-cron-01', actions, timestamp: new Date().toISOString() }))

    return NextResponse.json({
      ok: true,
      takeaways_expirados: expiredTakeaways?.length ?? 0,
      ultima_hora_expirados: expiredUltimaHora?.length ?? 0,
      actions,
    })
  } catch (err) {
    console.error('[wf-cron-01] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no WF-CRON-01', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
