import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'
import { startOfMonth } from 'date-fns'

export const runtime = 'nodejs'

// POST /api/internal/criar-snapshot
// Creates (upserts) the admin_daily_snapshot for today.
// Standalone version of the snapshot step in WF-ADM-09 — no Slack summary.
// Auth: CRON_SECRET (same as Vercel cron routes).
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const startOfCurrentMonth = startOfMonth(today)

  try {
    const { data: restaurants } = await db
      .from('restaurants')
      .select('id, estado')

    const total_restaurantes_ativos = restaurants?.filter(r => r.estado === 'ativo').length ?? 0
    const total_em_garantia = restaurants?.filter(r => r.estado === 'em_garantia').length ?? 0
    const total_em_construcao = restaurants?.filter(r => r.estado === 'em_construcao').length ?? 0
    const total_pausados = restaurants?.filter(r => r.estado === 'pausado').length ?? 0

    const { count: total_rescindidos_mes } = await db
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'rescindido')
      .gte('updated_at', startOfCurrentMonth.toISOString())

    const { data: paidCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfCurrentMonth.toISOString())

    const receita_mes_corrente = paidCycles?.reduce((s, c) => s + (Number(c.valor_total) || 0), 0) ?? 0

    const startOfLastMonth = new Date(startOfCurrentMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

    const { data: lastMonthCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfLastMonth.toISOString())
      .lt('data_fim_real', startOfCurrentMonth.toISOString())

    const receita_mes_anterior = lastMonthCycles?.reduce((s, c) => s + (Number(c.valor_total) || 0), 0) ?? 0

    const { data: activeCycles } = await db
      .from('billing_cycles')
      .select('valor_total, total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados, restaurants (isento_faturacao)')
      .eq('estado', 'ativo')

    const receita_prevista_proximo_mes = activeCycles
      ?.filter(c => {
        const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
        return r && !r.isento_faturacao
      })
      .reduce((s, c) => s + (Number(c.valor_total) || 0), 0) ?? 0

    const total_conversoes_mes = activeCycles?.reduce((s, c) =>
      s + (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0) + (c.total_takeaways_confirmados ?? 0), 0) ?? 0

    const { data: callsThisMonth } = await db
      .from('calls')
      .select('duration_seconds')
      .gte('created_at', startOfCurrentMonth.toISOString())

    const total_minutos_mes = Math.round(
      (callsThisMonth?.reduce((s, c) => s + (c.duration_seconds ?? 0), 0) ?? 0) / 60
    )

    const { data: arrearsCycles } = await db
      .from('billing_cycles')
      .select('restaurant_id, valor_total, data_fim_real, restaurants (nome, clients (nome_empresa))')
      .eq('estado_pagamento', 'em_atraso')

    const clientes_em_atraso = arrearsCycles?.map(c => {
      const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
      const cl = r && (Array.isArray(r.clients) ? r.clients[0] : r.clients)
      const dias = c.data_fim_real
        ? Math.floor((Date.now() - new Date(c.data_fim_real).getTime()) / 86400000)
        : 0
      return { restaurant_id: c.restaurant_id, nome: r?.nome ?? '', cliente: cl?.nome_empresa ?? '', dias_atraso: dias, valor: Number(c.valor_total) || 0 }
    }) ?? []

    const { error } = await db
      .from('admin_daily_snapshot')
      .upsert({
        snapshot_date: todayStr,
        receita_mes_corrente,
        receita_mes_anterior,
        receita_prevista_proximo_mes,
        total_restaurantes_ativos,
        total_em_garantia,
        total_em_construcao,
        total_pausados,
        total_rescindidos_mes: total_rescindidos_mes ?? 0,
        total_minutos_mes,
        total_conversoes_mes,
        clientes_em_atraso,
      }, { onConflict: 'snapshot_date' })

    if (error) {
      console.error('[criar-snapshot] upsert error:', error)
      await sendSlackAlert('sistema', 'Erro no criar-snapshot', error.message, 'error')
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    console.log(JSON.stringify({ event: 'criar-snapshot', snapshot_date: todayStr, timestamp: new Date().toISOString() }))

    return NextResponse.json({ ok: true, snapshot_date: todayStr, total_restaurantes_ativos })
  } catch (err) {
    console.error('[criar-snapshot] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no criar-snapshot', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
