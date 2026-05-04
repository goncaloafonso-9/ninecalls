import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  restaurantId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { restaurantId } = parsed.data
  const db = createAdminClient()

  // Fetch restaurant for pre-condition check
  const { data: restaurant, error: fetchErr } = await db
    .from('restaurants')
    .select('*, agents(id, activo)')
    .eq('id', restaurantId)
    .single()

  if (fetchErr || !restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

  // Pre-conditions
  const hasActiveAgent = (restaurant.agents as { id: string; activo: boolean }[]).some(a => a.activo)
  if (!hasActiveAgent) return NextResponse.json({ error: 'É necessário pelo menos um agente Telnyx activo' }, { status: 422 })
  if (!restaurant.transfer_phone) return NextResponse.json({ error: 'Número de transferência não configurado' }, { status: 422 })
  if (!restaurant.google_drive_folder_id) return NextResponse.json({ error: 'Pasta Google Drive não configurada' }, { status: 422 })
  if (!restaurant.objetivo_garantia || restaurant.objetivo_garantia === 0) return NextResponse.json({ error: 'Objectivo de garantia deve ser maior que 0' }, { status: 422 })
  if (restaurant.estado !== 'em_construcao') return NextResponse.json({ error: 'Restaurante não está em construção' }, { status: 422 })

  const today = new Date().toISOString().split('T')[0]
  const dataFimPrevista = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  // Update restaurant state
  const { error: updateErr } = await db
    .from('restaurants')
    .update({ estado: 'em_garantia', data_live: today })
    .eq('id', restaurantId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Create billing cycle 0 (guarantee cycle) with price snapshots
  const { error: cycleErr } = await db
    .from('billing_cycles')
    .insert({
      restaurant_id: restaurantId,
      numero_ciclo: 0,
      data_inicio: today,
      data_fim_prevista: dataFimPrevista,
      estado: 'ativo',
      snapshot_comissao_por_pessoa: restaurant.comissao_por_pessoa,
      snapshot_taxa_takeaway: restaurant.taxa_takeaway,
      snapshot_pessoas_por_takeaway: restaurant.pessoas_por_takeaway,
    })

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 })

  // Create guarantee tracking
  const { error: gtErr } = await db
    .from('guarantee_tracking')
    .insert({
      restaurant_id: restaurantId,
      objetivo: restaurant.objetivo_garantia,
      estado: 'em_curso',
    })

  if (gtErr) return NextResponse.json({ error: gtErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
