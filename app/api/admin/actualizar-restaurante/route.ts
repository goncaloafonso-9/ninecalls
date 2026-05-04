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
  pessoas_por_takeaway: z.number().int().min(1),
  valor_estimado_por_pessoa: z.number().min(0),
  valor_medio_takeaway: z.number().min(0),
  periodo_compromisso_dias: z.number().int().min(0),
  valor_rescisao_antecipada: z.number().min(0),
  google_drive_folder_id: z.string().optional(),
  notas_internas: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { restaurantId, ...fields } = parsed.data
  const db = createAdminClient()

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
      pessoas_por_takeaway: fields.pessoas_por_takeaway,
      valor_estimado_por_pessoa: fields.valor_estimado_por_pessoa,
      valor_medio_takeaway: fields.valor_medio_takeaway,
      periodo_compromisso_dias: fields.periodo_compromisso_dias,
      valor_rescisao_antecipada: fields.valor_rescisao_antecipada,
      google_drive_folder_id: fields.google_drive_folder_id ?? null,
      notas_internas: fields.notas_internas ?? null,
    })
    .eq('id', restaurantId)
    // Protect immutable fields — slug, ordem, objetivo_garantia are never in the update payload

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
