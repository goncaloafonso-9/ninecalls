import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'

export const runtime = 'nodejs'

// Called by WF-ADM-09 at 06:00 daily.
// Calculates and upserts admin_daily_snapshot with aggregated metrics.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  const db = createAdminClient()
  const today = new Date().toISOString().split('T')[0]

  try {
    // Get restaurant counts by estado
    const { data: restaurants } = await db
      .from('restaurants')
      .select('id, estado, em_compromisso')

    const total_restaurantes_ativos = restaurants?.filter(r => r.estado === 'ativo').length ?? 0
    const total_em_garantia = restaurants?.filter(r => r.estado === 'em_garantia').length ?? 0
    const total_em_construcao = restaurants?.filter(r => r.estado === 'em_construcao').length ?? 0
    const total_pausados = restaurants?.filter(r => r.estado === 'pausado').length ?? 0

    // Rescindidos this month
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const { count: total_rescindidos_mes } = await db
      .from('restaurants')
      .select('id', { count: 'exact', head: true })
      .eq('estado', 'rescindido')
      .gte('updated_at', startOfMonth.toISOString())

    // Active billing cycles for revenue calculations
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

    // Revenue current month (invoices paid this month)
    const { data: paidCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfMonth.toISOString())

    const receita_mes_corrente = paidCycles?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    // Last month revenue
    const startOfLastMonth = new Date(startOfMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)
    const { data: lastMonthCycles } = await db
      .from('billing_cycles')
      .select('valor_total')
      .eq('estado_pagamento', 'pago')
      .gte('data_fim_real', startOfLastMonth.toISOString())
      .lt('data_fim_real', startOfMonth.toISOString())

    const receita_mes_anterior = lastMonthCycles?.reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    // Projected next month (linear from active cycles valor_total)
    const receita_prevista_proximo_mes = activeCycles
      ?.filter(c => {
        const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
        return r && !r.isento_faturacao
      })
      .reduce((sum, c) => sum + (Number(c.valor_total) || 0), 0) ?? 0

    // Total minutes this month
    const { data: callsThisMonth } = await db
      .from('calls')
      .select('duration_seconds')
      .gte('created_at', startOfMonth.toISOString())

    const total_minutos_mes = Math.round(
      (callsThisMonth?.reduce((sum, c) => sum + (c.duration_seconds ?? 0), 0) ?? 0) / 60
    )

    // Total conversions this month (reservas + ultima_hora pessoas + takeaways × pessoas_por_takeaway)
    const total_conversoes_mes = activeCycles?.reduce((sum, c) => {
      return sum + (c.total_pessoas_reservas ?? 0) + (c.total_pessoas_ultima_hora ?? 0) + (c.total_takeaways_confirmados ?? 0)
    }, 0) ?? 0

    // Clients in arrears
    const { data: arrearsCycles } = await db
      .from('billing_cycles')
      .select(`
        restaurant_id, valor_total, data_fim_real,
        restaurants (nome, clients (nome_empresa))
      `)
      .eq('estado_pagamento', 'em_atraso')

    const clientes_em_atraso = arrearsCycles?.map(c => {
      const r = Array.isArray(c.restaurants) ? c.restaurants[0] : c.restaurants
      const cl = r && (Array.isArray(r.clients) ? r.clients[0] : r.clients)
      const dias = c.data_fim_real
        ? Math.floor((Date.now() - new Date(c.data_fim_real).getTime()) / 86400000)
        : 0
      return {
        restaurant_id: c.restaurant_id,
        nome: r?.nome ?? '',
        cliente: cl?.nome_empresa ?? '',
        dias_atraso: dias,
        valor: Number(c.valor_total) || 0,
      }
    }) ?? []

    // Upsert snapshot
    const { error: upsertError } = await db
      .from('admin_daily_snapshot')
      .upsert({
        snapshot_date: today,
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
      console.error('[criar-snapshot] upsert error:', upsertError)
      await notifySlack(
        process.env.SLACK_CHANNEL_SISTEMA ?? '',
        `🔴 Erro ao criar snapshot diário: ${upsertError.message}`
      )
      return NextResponse.json({ error: upsertError.message }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      snapshot_date: today,
      receita_mes_corrente,
      total_restaurantes_ativos,
      total_em_garantia,
    })
  } catch (err) {
    console.error('[criar-snapshot] unexpected error:', err)
    await notifySlack(
      process.env.SLACK_CHANNEL_SISTEMA ?? '',
      `🔴 Erro inesperado no snapshot diário: ${String(err)}`
    )
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
