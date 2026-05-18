import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  restaurantId: z.string().uuid(),
  acao: z.enum(['pausar', 'retomar', 'rescindir']),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { restaurantId, acao } = parsed.data
  const db = createAdminClient()

  if (acao === 'pausar') {
    const { error } = await db.rpc('fn_pause_restaurant', { p_restaurant_id: restaurantId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (acao === 'retomar') {
    const { error } = await db.rpc('fn_resume_restaurant', { p_restaurant_id: restaurantId })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (acao === 'rescindir') {
    const { data: restaurant, error: fetchErr } = await db
      .from('restaurants')
      .select('estado, em_compromisso, data_inicio_compromisso, periodo_compromisso_dias, valor_rescisao_antecipada')
      .eq('id', restaurantId)
      .single()

    if (fetchErr || !restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

    if (restaurant.estado === 'rescindido') {
      return NextResponse.json({ error: 'Restaurante já está rescindido' }, { status: 422 })
    }
    if (restaurant.estado === 'em_construcao') {
      return NextResponse.json({ error: 'Não é possível rescindir um restaurante em construção' }, { status: 422 })
    }

    // During guarantee → exempt from billing
    const durante_garantia = restaurant.estado === 'em_garantia'

    // Get active billing cycle
    const { data: activeCycle } = await db
      .from('billing_cycles')
      .select('id, isento_faturacao')
      .eq('restaurant_id', restaurantId)
      .eq('estado', 'ativo')
      .maybeSingle()

    // Update cycle: mark as pending close + isento if during guarantee
    if (activeCycle) {
      await db
        .from('billing_cycles')
        .update({
          fecho_pendente: true,
          ...(durante_garantia ? { isento_faturacao: true } : {}),
        })
        .eq('id', activeCycle.id)
    }

    // If during commitment and NOT during guarantee → store rescission value then recalculate total
    if (!durante_garantia && restaurant.em_compromisso && activeCycle) {
      const rescisaoValor = restaurant.valor_rescisao_antecipada ?? 0

      if (rescisaoValor > 0) {
        // Store the rescission fee on the cycle row (column added in nine-calls-fixes-v1.sql)
        const { error: rescErr } = await db
          .from('billing_cycles')
          .update({ valor_rescisao_antecipada: rescisaoValor })
          .eq('id', activeCycle.id)

        if (rescErr) return NextResponse.json({ error: rescErr.message }, { status: 500 })
      }

      // Recalculate valor_total including the new column
      const { error: recalcErr } = await db.rpc('fn_recalc_billing_cycle_total', {
        p_cycle_id: activeCycle.id,
      })
      if (recalcErr) return NextResponse.json({ error: recalcErr.message }, { status: 500 })
    }

    const { error: updateErr } = await db
      .from('restaurants')
      .update({ estado: 'rescindido' })
      .eq('id', restaurantId)

    if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
