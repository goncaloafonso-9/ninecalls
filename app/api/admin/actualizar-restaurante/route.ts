import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  restaurantId: z.string().uuid(),
  nome: z.string().min(1),
  morada: z.string().optional(),
  telnyx_phone: z.string().optional(),
  transfer_phone: z.string().optional(),
  software_reservas: z.enum(['zenchef', 'thefork', 'outro', 'nenhum']),
  tem_takeaway: z.boolean(),
  aceita_ultima_hora: z.boolean(),
  comissao_por_pessoa: z.number().min(0),
  taxa_takeaway: z.number().min(0),
  taxa_mensal_fixa: z.number().min(0),
  valor_medio_takeaway: z.number().min(0),
  periodo_compromisso_dias: z.number().int().min(0),
  valor_rescisao_antecipada: z.number().min(0),
  google_drive_folder_link: z.string().optional(),
  notas_internas: z.string().optional(),
  tem_garantia: z.boolean().optional(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { restaurantId, ...fields } = parsed.data
  const db = createAdminClient()

  // Validar imutabilidade de tem_garantia após activação
  if (fields.tem_garantia !== undefined) {
    const { data: existing } = await db
      .from('restaurants')
      .select('data_live, taxa_ativacao')
      .eq('id', restaurantId)
      .single()

    if (existing?.data_live) {
      return NextResponse.json({ error: 'tem_garantia é imutável após activação' }, { status: 422 })
    }
    if (fields.tem_garantia === true && existing?.taxa_ativacao === 0) {
      return NextResponse.json({ error: 'Investimento inicial = €0 obriga a restaurante sem garantia' }, { status: 422 })
    }
  }

  const { error } = await db
    .from('restaurants')
    .update({
      nome: fields.nome,
      morada: fields.morada ?? null,
      telnyx_phone: fields.telnyx_phone ?? null,
      transfer_phone: fields.transfer_phone ?? null,
      software_reservas: fields.software_reservas,
      tem_takeaway: fields.tem_takeaway,
      aceita_ultima_hora: fields.aceita_ultima_hora,
      comissao_por_pessoa: fields.comissao_por_pessoa,
      taxa_takeaway: fields.taxa_takeaway,
      taxa_mensal_fixa: fields.taxa_mensal_fixa,
      valor_medio_takeaway: fields.valor_medio_takeaway,
      periodo_compromisso_dias: fields.periodo_compromisso_dias,
      valor_rescisao_antecipada: fields.valor_rescisao_antecipada,
      google_drive_folder_link: fields.google_drive_folder_link ?? null,
      notas_internas: fields.notas_internas ?? null,
      ...(fields.tem_garantia !== undefined ? { tem_garantia: fields.tem_garantia } : {}),
    })
    .eq('id', restaurantId)
    // Protect immutable fields — slug, ordem, objetivo_garantia are never in the update payload

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
