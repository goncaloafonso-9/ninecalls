import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'

export const runtime = 'nodejs'

// POST /api/internal/fechar-ciclos
// Marks eligible active billing cycles as fecho_pendente = true.
// These cycles are then closed by WF-CRON-02 (which handles invoicing).
// This endpoint handles the "mark for closure" step only — no Stripe invoice creation.
// Auth: CRON_SECRET.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]
  const marked: string[] = []

  try {
    // Mark guarantee cycles (ciclo 0) as fecho_pendente when cumprido or expired
    const { data: guarantees } = await db
      .from('guarantee_tracking')
      .select(`id, estado, data_inicio, billing_cycles (id, data_fim_prevista, fecho_pendente), restaurants (id, nome)`)
      .eq('estado', 'em_curso')

    for (const gt of guarantees ?? []) {
      const restaurant = Array.isArray(gt.restaurants) ? gt.restaurants[0] : gt.restaurants
      const cycle = Array.isArray(gt.billing_cycles) ? gt.billing_cycles[0] : gt.billing_cycles
      if (!restaurant || !cycle || cycle.fecho_pendente) continue

      // Expired: 30 days passed
      if (cycle.data_fim_prevista && cycle.data_fim_prevista <= today) {
        await db.from('guarantee_tracking').update({ estado: 'nao_cumprido_30_dias' }).eq('id', gt.id)
        await db.from('billing_cycles').update({ fecho_pendente: true }).eq('id', cycle.id)
        await sendSlackMessage({
          channel: 'garantias',
          text: `❌ 30 dias sem objectivo — ${restaurant.nome} — ⚠️ VERIFICAR REEMBOLSO`,
        })
        marked.push(`garantia expirada: ${restaurant.nome}`)
      }
    }

    // Mark normal cycles (> ciclo 0) as fecho_pendente when past data_fim_prevista
    const { data: normalCycles } = await db
      .from('billing_cycles')
      .select('id, numero_ciclo, data_fim_prevista, restaurants (id, nome, estado)')
      .eq('estado', 'ativo')
      .eq('fecho_pendente', false)
      .gt('numero_ciclo', 0)
      .lte('data_fim_prevista', today)

    for (const cycle of normalCycles ?? []) {
      const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
      if (!restaurant || restaurant.estado === 'pausado') continue
      await db.from('billing_cycles').update({ fecho_pendente: true }).eq('id', cycle.id)
      marked.push(`ciclo ${cycle.numero_ciclo}: ${restaurant.nome}`)
    }

    console.log(JSON.stringify({ event: 'fechar-ciclos', marked, timestamp: new Date().toISOString() }))

    return NextResponse.json({ ok: true, marked_count: marked.length, marked })
  } catch (err) {
    console.error('[fechar-ciclos] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no fechar-ciclos', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
