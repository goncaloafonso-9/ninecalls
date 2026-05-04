import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  restaurantId: z.string().uuid(),
  tipo: z.enum(['adicionar', 'remover']),
  pessoas: z.number().int().positive(),
  motivo: z.string().min(3),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { restaurantId, tipo, pessoas, motivo } = parsed.data
  const db = createAdminClient()

  // Verify restaurant is em_garantia
  const { data: restaurant } = await db
    .from('restaurants')
    .select('estado')
    .eq('id', restaurantId)
    .single()

  if (!restaurant || restaurant.estado !== 'em_garantia') {
    return NextResponse.json({ error: 'Restaurante não está em garantia' }, { status: 422 })
  }

  // Get active guarantee tracking
  const { data: gt } = await db
    .from('guarantee_tracking')
    .select('id, contagem_manual, contagem_actual, objetivo')
    .eq('restaurant_id', restaurantId)
    .eq('estado', 'em_curso')
    .single()

  if (!gt) return NextResponse.json({ error: 'Garantia activa não encontrada' }, { status: 404 })

  const delta = tipo === 'adicionar' ? pessoas : -pessoas
  const novaContagem = gt.contagem_actual + delta

  if (novaContagem < 0) {
    return NextResponse.json({ error: 'A contagem não pode ser negativa' }, { status: 422 })
  }

  // Insert conversion record
  const { error: insertErr } = await db
    .from('conversoes_manuais')
    .insert({
      restaurant_id: restaurantId,
      guarantee_tracking_id: gt.id,
      tipo,
      pessoas,
      motivo,
    })

  if (insertErr) return NextResponse.json({ error: insertErr.message }, { status: 500 })

  // Update contagem_manual (contagem_actual is GENERATED from organica + manual)
  const novoManual = gt.contagem_manual + delta
  const { error: updateErr } = await db
    .from('guarantee_tracking')
    .update({ contagem_manual: novoManual })
    .eq('id', gt.id)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  return NextResponse.json({ success: true, nova_contagem: novaContagem })
}
