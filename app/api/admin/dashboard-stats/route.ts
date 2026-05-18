import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { startOfMonth, subDays } from 'date-fns'

export const runtime = 'nodejs'

type Mode = '7d' | 'month' | 'all'

function getPeriod(mode: Mode): { from: Date | null; to: Date } {
  const now = new Date()
  if (mode === '7d') return { from: subDays(now, 7), to: now }
  if (mode === 'month') return { from: startOfMonth(now), to: now }
  return { from: null, to: now }
}

// GET /api/admin/dashboard-stats?mode=7d|month|all
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const mode = (req.nextUrl.searchParams.get('mode') ?? 'month') as Mode
  if (!['7d', 'month', 'all'].includes(mode)) {
    return NextResponse.json({ error: 'mode inválido' }, { status: 400 })
  }

  const { from, to } = getPeriod(mode)
  const db = createAdminClient()

  // ── 1. Receita ──────────────────────────────────────────────────────────────
  // Ciclos fechados (pagos/em_atraso) com data_fim_real no período
  // + ciclos activos com data_inicio no período (receita acumulada ainda a faturar)
  let receitaQuery = db
    .from('billing_cycles')
    .select('valor_total')
    .not('isento_faturacao', 'eq', true)

  let activeQuery = db
    .from('billing_cycles')
    .select('valor_total')
    .eq('estado', 'ativo')
    .not('isento_faturacao', 'eq', true)

  if (from) {
    receitaQuery = receitaQuery
      .in('estado_pagamento', ['pago', 'em_atraso'])
      .gte('data_fim_real', from.toISOString())
      .lte('data_fim_real', to.toISOString())

    activeQuery = activeQuery
      .gte('data_inicio', from.toISOString())
      .lte('data_inicio', to.toISOString())
  } else {
    // all-time: todos os ciclos fechados + todos os activos actuais
    receitaQuery = receitaQuery.in('estado_pagamento', ['pago', 'em_atraso'])
  }

  const [closedRes, activeRes] = await Promise.all([receitaQuery, activeQuery])

  const receitaClosed = (closedRes.data ?? []).reduce((s, c) => s + (Number(c.valor_total) || 0), 0)
  const receitaActive = (activeRes.data ?? []).reduce((s, c) => s + (Number(c.valor_total) || 0), 0)
  const receita = receitaClosed + receitaActive

  // ── 2. Custos IA ─────────────────────────────────────────────────────────────
  let callsQuery = db.from('calls').select('duration_seconds')
  if (from) {
    callsQuery = callsQuery
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
  }
  const { data: callsData } = await callsQuery
  const totalSeconds = (callsData ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0)
  const custos_ia = Math.round((totalSeconds / 60) * 0.14 * 100) / 100

  // ── 3. Taxa de conversão ──────────────────────────────────────────────────────
  // Conversões = pessoas geradas (reservas + ultima_hora + takeaways) de ciclos no período
  // Chamadas = todas as chamadas no período
  let convCyclesQuery = db
    .from('billing_cycles')
    .select('total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados')

  if (from) {
    // Ciclos activos que iniciaram no período, ou fechados com data_fim_real no período
    convCyclesQuery = convCyclesQuery
      .or(`and(estado.eq.ativo,data_inicio.gte.${from.toISOString()}),and(estado.neq.ativo,data_fim_real.gte.${from.toISOString()},data_fim_real.lte.${to.toISOString()})`)
  }

  const [convRes, totalCallsRes] = await Promise.all([
    convCyclesQuery,
    (() => {
      let q = db.from('calls').select('id', { count: 'exact', head: true })
      if (from) q = q.gte('created_at', from.toISOString()).lte('created_at', to.toISOString())
      return q
    })(),
  ])

  const totalConversoes = (convRes.data ?? []).reduce((s, c) =>
    s + (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0) + (c.total_takeaways_confirmados ?? 0), 0)
  const totalChamadas = totalCallsRes.count ?? 0
  const taxa_conversao = totalChamadas > 0 ? Math.round((totalConversoes / totalChamadas) * 1000) / 10 : 0

  // ── 4. Minutos (só restaurantes activos/em_garantia) ─────────────────────────
  const { data: activeRestaurants } = await db
    .from('restaurants')
    .select('id')
    .in('estado', ['ativo', 'em_garantia'])

  const activeRestaurantIds = (activeRestaurants ?? []).map(r => r.id)

  let minutesQuery = db
    .from('calls')
    .select('duration_seconds')

  if (activeRestaurantIds.length > 0) {
    minutesQuery = minutesQuery.in('restaurant_id', activeRestaurantIds)
  }
  if (from) {
    minutesQuery = minutesQuery
      .gte('created_at', from.toISOString())
      .lte('created_at', to.toISOString())
  }

  const { data: minutesData } = await minutesQuery
  const minutos = Math.round(
    (minutesData ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0) / 60
  )

  return NextResponse.json({ receita, custos_ia, taxa_conversao, minutos, mode })
}
