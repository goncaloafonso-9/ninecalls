import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'

export const runtime = 'nodejs'

// Called by WF-CRON-01 at 07:00 daily (after expirar-pendentes).
// Monitors guarantee progress, marks cycles for closure, updates em_compromisso.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const actions: string[] = []

  // 1. Guarantee progress alerts
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
    const pct = Math.round(((gt.contagem_actual ?? 0) / (gt.objetivo ?? 1)) * 100)

    if (diaEfectivo === 20) {
      await notifySlack(
        process.env.SLACK_CHANNEL_GARANTIAS ?? '',
        `⚠️ Dia 20/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} pessoas (${pct}%)`
      )
      actions.push(`alertado dia 20: ${restaurant.nome}`)
    } else if (diaEfectivo === 25) {
      await notifySlack(
        process.env.SLACK_CHANNEL_GARANTIAS ?? '',
        `🔴 URGENTE Dia 25/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} — apenas ${30 - diaEfectivo} dias restantes`
      )
      actions.push(`alertado dia 25: ${restaurant.nome}`)
    }

    // 2. Mark for closure if cumprido and cycle hasn't been flagged yet
    if (gt.estado === 'cumprido' && !cycle.fecho_pendente) {
      await db
        .from('billing_cycles')
        .update({ fecho_pendente: true })
        .eq('id', cycle.id)
      actions.push(`fecho_pendente=true (cumprido): ${restaurant.nome}`)
    }

    // 3. Mark for closure by expiration (30 days, not cumprido)
    if (cycle.data_fim_prevista && cycle.data_fim_prevista <= today) {
      await db
        .from('guarantee_tracking')
        .update({ estado: 'nao_cumprido_30_dias' })
        .eq('id', gt.id)

      await db
        .from('billing_cycles')
        .update({ fecho_pendente: true })
        .eq('id', cycle.id)

      await notifySlack(
        process.env.SLACK_CHANNEL_GARANTIAS ?? '',
        `❌ 30 dias sem objectivo — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} pessoas — ⚠️ VERIFICAR REEMBOLSO`
      )
      actions.push(`nao_cumprido_30_dias: ${restaurant.nome}`)
    }
  }

  // 4. Mark normal cycles (numero_ciclo > 0) for closure when data_fim_prevista reached
  const { data: normalCycles } = await db
    .from('billing_cycles')
    .select(`
      id, numero_ciclo, data_fim_prevista,
      restaurants (id, nome, estado)
    `)
    .eq('estado', 'ativo')
    .eq('fecho_pendente', false)
    .gt('numero_ciclo', 0)
    .lte('data_fim_prevista', today)

  for (const cycle of normalCycles ?? []) {
    const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
    if (!restaurant || restaurant.estado === 'pausado') continue

    await db
      .from('billing_cycles')
      .update({ fecho_pendente: true })
      .eq('id', cycle.id)

    actions.push(`fecho_pendente=true (ciclo ${cycle.numero_ciclo}): ${restaurant.nome}`)
  }

  // 5. Update em_compromisso for restaurants past their commitment period
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
      await db
        .from('restaurants')
        .update({ em_compromisso: false })
        .eq('id', r.id)

      await notifySlack(
        process.env.SLACK_CHANNEL_SISTEMA ?? '',
        `📅 ${r.nome} saiu do período de compromisso`
      )
      actions.push(`em_compromisso=false: ${r.nome}`)
    }
  }

  return NextResponse.json({ ok: true, actions })
}
