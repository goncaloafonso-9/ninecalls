import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'

export const runtime = 'nodejs'

// POST /api/internal/monitorizar-garantias
// Checks active guarantee_tracking records and sends Slack alerts based on progress.
// Standalone version of the guarantee monitoring step in WF-CRON-01.
// Auth: CRON_SECRET.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const actions: string[] = []

  try {
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

      if (diaEfectivo === 20) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `⚠️ Dia 20/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} pessoas (${pct}%)`,
        })
        actions.push(`alertado dia 20: ${restaurant.nome}`)
      }

      if (diaEfectivo === 25) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `🔴 URGENTE Dia 25/30 — ${restaurant.nome} — ${gt.contagem_actual}/${gt.objetivo} — apenas ${diasRestantes} dias restantes`,
        })
        actions.push(`alertado dia 25: ${restaurant.nome}`)
      }

      if (pct < 80 && diasRestantes > 0 && diaEfectivo % 2 === 0 && diaEfectivo > 10) {
        await sendSlackMessage({
          channel: 'garantias',
          text: `⚠️ *Garantia em risco — ${restaurant.nome}*\nCiclo: ${diaEfectivo} de 30 dias\nGarantia contratual: ${gt.objetivo} pessoas/ciclo\nActual: ${gt.contagem_actual} pessoas confirmadas\nGap: ${gap} pessoas em falta\nDias restantes: ${diasRestantes}`,
        })
        actions.push(`garantia em risco: ${restaurant.nome}`)
      }
    }

    console.log(JSON.stringify({ event: 'monitorizar-garantias', actions, timestamp: new Date().toISOString() }))

    return NextResponse.json({ ok: true, actions })
  } catch (err) {
    console.error('[monitorizar-garantias] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no monitorizar-garantias', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
