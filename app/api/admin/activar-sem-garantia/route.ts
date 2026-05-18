import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'
import type { ActivacaoRestaurantePayload } from '@/types/activacao-restaurante'

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

  const { data: restaurant, error: fetchErr } = await db
    .from('restaurants')
    .select('*, agents(id, activo)')
    .eq('id', restaurantId)
    .single()

  if (fetchErr || !restaurant) return NextResponse.json({ error: 'Restaurante não encontrado' }, { status: 404 })

  if (restaurant.tem_garantia) {
    return NextResponse.json({ error: 'Este restaurante tem período de garantia — use Activar Garantia' }, { status: 422 })
  }
  if (restaurant.estado !== 'em_construcao') {
    return NextResponse.json({ error: 'Restaurante não está em construção' }, { status: 422 })
  }

  const hasActiveAgent = (restaurant.agents as { id: string; activo: boolean }[]).some(a => a.activo)
  if (!hasActiveAgent) return NextResponse.json({ error: 'É necessário pelo menos um agente Telnyx activo' }, { status: 422 })
  if (!restaurant.transfer_phone) return NextResponse.json({ error: 'Número de transferência não configurado' }, { status: 422 })
  if (!restaurant.google_drive_folder_link) return NextResponse.json({ error: 'Pasta Google Drive não configurada' }, { status: 422 })

  const today = new Date().toISOString().split('T')[0]
  const dataFimPrevista = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

  const { error: updateErr } = await db
    .from('restaurants')
    .update({ estado: 'ativo', data_live: today, data_inicio_compromisso: today })
    .eq('id', restaurantId)

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // Criar ciclo 1 imediatamente (sem ciclo 0 — sem garantia)
  const { error: cycleErr } = await db
    .from('billing_cycles')
    .insert({
      restaurant_id: restaurantId,
      numero_ciclo: 1,
      data_inicio: today,
      data_fim_prevista: dataFimPrevista,
      estado: 'ativo',
      snapshot_comissao_por_pessoa: restaurant.comissao_por_pessoa,
      snapshot_taxa_takeaway: restaurant.taxa_takeaway,
      snapshot_taxa_mensal_fixa: restaurant.taxa_mensal_fixa,
    })

  if (cycleErr) return NextResponse.json({ error: cycleErr.message }, { status: 500 })

  // Limpar dados de construção e preservar minutos para custo admin
  const { error: cleanupErr } = await db.rpc('fn_activar_restaurante_limpar_dados', {
    p_restaurant_id: restaurantId,
  })
  if (cleanupErr) {
    console.error('[activar-sem-garantia] cleanup error:', cleanupErr)
    // Não bloquear a activação — logar e continuar
  }

  // Disparar webhook n8n de activação (fire-and-forget)
  if (process.env.N8N_ACTIVACAO_WEBHOOK_URL) {
    const { data: clientData } = await db
      .from('clients')
      .select('nome_empresa, email, telefone')
      .eq('id', restaurant.client_id)
      .single()

    const { data: agentData } = await db
      .from('agents')
      .select('telnyx_phone')
      .eq('restaurant_id', restaurantId)
      .eq('activo', true)
      .limit(1)
      .maybeSingle()

    const payload: ActivacaoRestaurantePayload = {
      restaurant_id: restaurantId,
      restaurant_nome: restaurant.nome,
      restaurant_slug: restaurant.slug,
      restaurant_morada: restaurant.morada ?? null,
      restaurant_telnyx_phone: (agentData as { telnyx_phone?: string } | null)?.telnyx_phone ?? restaurant.telnyx_phone ?? null,
      restaurant_transfer_phone: restaurant.transfer_phone ?? null,
      restaurant_google_drive_folder_link: restaurant.google_drive_folder_link ?? null,
      client_nome: clientData?.nome_empresa ?? '',
      client_email: clientData?.email ?? '',
      client_telefone: clientData?.telefone ?? null,
      comissao_por_pessoa: restaurant.comissao_por_pessoa ?? 0,
      taxa_takeaway: restaurant.taxa_takeaway ?? 0,
      taxa_mensal_fixa: restaurant.taxa_mensal_fixa ?? 0,
      snapshot_pessoas_por_takeaway: restaurant.snapshot_pessoas_por_takeaway ?? 0,
      valor_estimado_por_pessoa: restaurant.valor_estimado_por_pessoa ?? 0,
      objetivo_garantia: restaurant.objetivo_garantia ?? 0,
      periodo_compromisso_dias: restaurant.periodo_compromisso_dias ?? 0,
      tem_garantia: false,
      numero_ciclo_inicial: 1,
      data_live: today,
      activado_em: new Date().toISOString(),
    }

    fetch(process.env.N8N_ACTIVACAO_WEBHOOK_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }).catch(err => console.error('[activacao-webhook] erro ao enviar:', err))
  }

  return NextResponse.json({ success: true })
}
