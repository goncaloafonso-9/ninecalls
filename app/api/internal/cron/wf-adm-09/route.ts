import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'
import { format, subDays, startOfDay, endOfDay, startOfMonth } from 'date-fns'
import { pt } from 'date-fns/locale'

export const runtime = 'nodejs'

// WF-ADM-09 — Daily Admin Snapshot (06:00)
// Calculates and upserts admin_daily_snapshot + sends morning Slack summary.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  const yesterday = subDays(today, 1)
  const yesterdayStart = startOfDay(yesterday).toISOString()
  const yesterdayEnd = endOfDay(yesterday).toISOString()
  const startOfCurrentMonth = startOfMonth(today)

  try {
    // --- Global snapshot metrics ---

    const { data: restaurants } = await db
      .from('restaurants')
      .select('id, nome, estado, em_compromisso, slack_channel_id')

    const total_restaurantes_ativos = restaurants?.filter(r => r.estado === 'ativo').length ?? 0
    const total_em_garantia = restaurants?.filter(r => r.estado === 'em_garantia').length ?? 0
    const total_em_construcao = restaurants?.filter(r => r.estado === 'em_construcao').length ?? 0
    const total_pausados = restaurants?.filter(r => r.estado === 'pausado').length ?? 0

    const { count: total_rescindidos_mes } = await db
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'rescindido')
      .gte('updated_at', startOfCurrentMonth.toISOString())

    const { data: activeCycles } = await db
      .from('billing_cycles')
      .select(`
        id, restaurant_id, numero_ciclo, data_inicio, data_fim_prevista,
        valor_total, total_pessoas_reservas, total_pessoas_ultima_hora,
        total_takeaways_confirmados,
        snapshot_comissao_por_pessoa, snapshot_taxa_takeaway,
        restaurants (nome, isento_faturacao, estado)
      `)
      .eq('estado', 'ativo')

    const { data: paidCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfCurrentMonth.toISOString())

    const receita_mes_corrente = paidCycles?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    const startOfLastMonth = new Date(startOfCurrentMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)
    const { data: lastMonthCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfLastMonth.toISOString())
      .lt('data_fim_real', startOfCurrentMonth.toISOString())

    const receita_mes_anterior = lastMonthCycles?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    const receita_prevista_proximo_mes = activeCycles
      ?.filter(c => {
        const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
        return r && !r.isento_faturacao
      })
      .reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    const { data: callsThisMonth } = await db
      .from('calls')
      .select('duration_seconds')
      .gte('created_at', startOfCurrentMonth.toISOString())

    const total_minutos_mes = Math.round(
      (callsThisMonth?.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) ?? 0) / 60
    )

    const total_conversoes_mes = activeCycles?.reduce((sum, c) => {
      return sum + (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0) + (c.total_takeaways_confirmados ?? 0)
    }, 0) ?? 0

    const { data: arrearsCycles } = await db
      .from('billing_cycles')
      .select(`restaurant_id, valor_total, data_fim_real, restaurants (nome, clients (nome_empresa))`)
      .eq('estado_pagamento', 'em_atraso')

    const clientes_em_atraso = arrearsCycles?.map(c => {
      const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
      const cl = r && (Array.isArray(r.clients) ? r.clients[0] : r.clients)
      const dias = c.data_fim_real
        ? Math.floor((Date.now() - new Date(c.data_fim_real).getTime()) / 86400000)
        : 0
      return { restaurant_id: c.restaurant_id, nome: r?.nome ?? '', cliente: cl?.nome_empresa ?? '', dias_atraso: dias, valor: Number(c.valor_total) || 0 }
    }) ?? []

    // Upsert global snapshot (idempotent)
    const { error: upsertError } = await db
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

    if (upsertError) {
      console.error('[wf-adm-09] upsert error:', upsertError)
      await sendSlackAlert('sistema', 'Erro no snapshot diário', upsertError.message, 'error')
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    // --- Per-restaurant yesterday metrics for Slack morning summary ---

    const activeRestaurants = restaurants?.filter(r => r.estado === 'ativo' || r.estado === 'em_garantia') ?? []

    type RestaurantSummary = {
      nome: string
      chamadas: number
      sucesso_pct: number
      positivo_pct: number
      reservas: number
      takeaways: number
      ultima_hora: number
    }

    const summaries: RestaurantSummary[] = []

    let totalChamadasGlobal = 0

    for (const restaurant of activeRestaurants) {
      const { data: calls } = await db
        .from('calls')
        .select('call_successful, user_sentiment')
        .eq('restaurant_id', restaurant.id)
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const { data: reservas } = await db
        .from('bookings')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'confirmada')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const { data: takeaways } = await db
        .from('takeaway_orders')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'confirmado')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const { data: ultimaHora } = await db
        .from('ultima_hora_requests')
        .select('id')
        .eq('restaurant_id', restaurant.id)
        .eq('estado', 'confirmado')
        .gte('created_at', yesterdayStart)
        .lte('created_at', yesterdayEnd)

      const chamadas = calls?.length ?? 0
      const bem_sucedidas = calls?.filter(c => c.call_successful === true).length ?? 0
      const positivas = calls?.filter(c => c.user_sentiment === 'positive').length ?? 0
      const sucesso_pct = chamadas > 0 ? Math.round((bem_sucedidas / chamadas) * 100) : 0
      const positivo_pct = chamadas > 0 ? Math.round((positivas / chamadas) * 100) : 0

      totalChamadasGlobal += chamadas

      summaries.push({
        nome: restaurant.nome,
        chamadas,
        sucesso_pct,
        positivo_pct,
        reservas: reservas?.length ?? 0,
        takeaways: takeaways?.length ?? 0,
        ultima_hora: ultimaHora?.length ?? 0,
      })
    }

    // Build Slack morning summary
    const dataStr = format(yesterday, "d 'de' MMMM", { locale: pt })
    const lines: string[] = [`🌅 *Resumo de ontem — ${dataStr}*`]

    for (const s of summaries) {
      lines.push(
        `\n*${s.nome}*\n📞 ${s.chamadas} chamadas · ✅ ${s.sucesso_pct}% sucesso · 😊 ${s.positivo_pct}% positivo\n🍽️ ${s.reservas} reservas · 🥡 ${s.takeaways} takeaway · ⚡ ${s.ultima_hora} última hora`
      )
    }

    lines.push(`\nTotal global: ${totalChamadasGlobal} chamadas em ${activeRestaurants.length} restaurantes activos`)

    await sendSlackMessage({ channel: 'admin', text: lines.join('\n') })

    console.log(JSON.stringify({ event: 'wf-adm-09', snapshot_date: todayStr, total_restaurantes_ativos, timestamp: new Date().toISOString() }))

    return NextResponse.json({ ok: true, snapshot_date: todayStr, total_restaurantes_ativos, total_em_garantia })
  } catch (err) {
    console.error('[wf-adm-09] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no WF-ADM-09', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
