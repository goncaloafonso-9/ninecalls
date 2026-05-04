import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
  nome: z.string().min(1),
  morada: z.string().optional(),
  telnyx_phone: z.string().optional(),
  transfer_phone: z.string().optional(),
  software_reservas: z.enum(['zenchef', 'thefork', 'outro', 'nenhum']).default('nenhum'),
  tem_takeaway: z.boolean().default(false),
  aceita_ultima_hora: z.boolean().default(false),
  taxa_ativacao: z.number().min(0),
  comissao_por_pessoa: z.number().min(0),
  taxa_takeaway: z.number().min(0).default(0),
  pessoas_por_takeaway: z.number().int().min(1).default(2),
  valor_estimado_por_pessoa: z.number().min(0).default(0),
  valor_medio_takeaway: z.number().min(0).default(0),
  objetivo_garantia: z.number().int().min(0),
  periodo_compromisso_dias: z.number().int().min(0).default(0),
  valor_rescisao_antecipada: z.number().min(0).default(0),
  google_drive_folder_id: z.string().optional(),
  agentes: z.array(z.object({
    nome: z.string().min(1),
    telnyx_agent_id: z.string().min(1),
  })).default([]),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const db = createAdminClient()

  // Get next ordem for this client
  const { data: existing } = await db
    .from('restaurants')
    .select('ordem')
    .eq('client_id', data.clientId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ordem = (existing?.ordem ?? 0) + 1

  const { data: rest, error: restErr } = await db
    .from('restaurants')
    .insert({
      client_id: data.clientId,
      nome: data.nome,
      morada: data.morada ?? null,
      ordem,
      telnyx_phone: data.telnyx_phone ?? null,
      transfer_phone: data.transfer_phone ?? null,
      software_reservas: data.software_reservas,
      tem_takeaway: data.tem_takeaway,
      aceita_ultima_hora: data.aceita_ultima_hora,
      taxa_ativacao: data.taxa_ativacao,
      comissao_por_pessoa: data.comissao_por_pessoa,
      taxa_takeaway: data.taxa_takeaway,
      pessoas_por_takeaway: data.pessoas_por_takeaway,
      valor_estimado_por_pessoa: data.valor_estimado_por_pessoa,
      valor_medio_takeaway: data.valor_medio_takeaway,
      objetivo_garantia: data.objetivo_garantia,
      periodo_compromisso_dias: data.periodo_compromisso_dias,
      valor_rescisao_antecipada: data.valor_rescisao_antecipada,
      google_drive_folder_id: data.google_drive_folder_id ?? null,
    })
    .select('id, slug')
    .single()

  if (restErr || !rest) return NextResponse.json({ error: restErr?.message ?? 'Erro ao criar restaurante' }, { status: 500 })

  if (data.agentes.length > 0) {
    await db.from('agents').insert(
      data.agentes.map(a => ({
        restaurant_id: rest.id,
        nome: a.nome,
        telnyx_agent_id: a.telnyx_agent_id,
        activo: true,
      }))
    )
  }

  return NextResponse.json({ success: true, restaurantId: rest.id, slug: rest.slug })
}
