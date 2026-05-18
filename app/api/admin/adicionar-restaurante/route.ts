import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { createSlackChannelForRestaurant } from '@/lib/slack'
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
  taxa_mensal_fixa: z.number().min(0).default(0),
  taxa_takeaway: z.number().min(0).default(0),
  valor_medio_takeaway: z.number().min(0).default(0),
  objetivo_garantia: z.number().int().min(0),
  tem_garantia: z.boolean().default(true),
  periodo_compromisso_dias: z.number().int().min(0).default(0),
  valor_rescisao_antecipada: z.number().min(0).default(0),
  google_drive_folder_link: z.string().optional(),
  agentes: z.array(z.object({
    nome: z.string().min(1),
    telnyx_agent_id: z.string().min(1),
  })).default([]),
})

// Mirrors fn_slugify() in the database schema.
// Applied here to guarantee slug is never NULL even if the DB trigger is not yet present.
function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .replace(/-+/g, '-')
    .slice(0, 80)
}

async function generateUniqueSlug(db: ReturnType<typeof createAdminClient>, nome: string): Promise<string> {
  const base = slugify(nome) || 'restaurante'
  let slug = base
  let counter = 2
  while (true) {
    const { data } = await db.from('restaurants').select('id').eq('slug', slug).maybeSingle()
    if (!data) return slug
    slug = `${base}-${counter++}`
  }
}

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const db = createAdminClient()

  // Regra de negócio: investimento inicial = 0 obriga a sem garantia
  if (data.taxa_ativacao === 0 && data.tem_garantia) {
    return NextResponse.json({ error: 'Investimento inicial = €0 obriga a restaurante sem garantia' }, { status: 422 })
  }

  // Get next ordem for this client
  const { data: existing } = await db
    .from('restaurants')
    .select('ordem')
    .eq('client_id', data.clientId)
    .order('ordem', { ascending: false })
    .limit(1)
    .maybeSingle()

  const ordem = (existing?.ordem ?? 0) + 1
  const slug = await generateUniqueSlug(db, data.nome)

  const { data: rest, error: restErr } = await db
    .from('restaurants')
    .insert({
      client_id: data.clientId,
      nome: data.nome,
      slug,
      morada: data.morada ?? null,
      ordem,
      telnyx_phone: data.telnyx_phone ?? null,
      transfer_phone: data.transfer_phone ?? null,
      software_reservas: data.software_reservas,
      tem_takeaway: data.tem_takeaway,
      aceita_ultima_hora: data.aceita_ultima_hora,
      taxa_ativacao: data.taxa_ativacao,
      comissao_por_pessoa: data.comissao_por_pessoa,
      taxa_mensal_fixa: data.taxa_mensal_fixa,
      taxa_takeaway: data.taxa_takeaway,
      valor_medio_takeaway: data.valor_medio_takeaway,
      objetivo_garantia: data.objetivo_garantia,
      tem_garantia: data.tem_garantia,
      periodo_compromisso_dias: data.periodo_compromisso_dias,
      valor_rescisao_antecipada: data.valor_rescisao_antecipada,
      google_drive_folder_link: data.google_drive_folder_link ?? null,
    })
    .select('id, slug')
    .single()

  if (restErr || !rest) return NextResponse.json({ error: restErr?.message ?? 'Erro ao criar restaurante' }, { status: 500 })

  if (data.agentes.length > 0) {
    const { error: agentErr } = await db.from('agents').insert(
      data.agentes.map(a => ({
        restaurant_id: rest.id,
        nome: a.nome,
        telnyx_agent_id: a.telnyx_agent_id,
        activo: true,
      }))
    )
    if (agentErr) return NextResponse.json({ error: `Restaurante criado mas erro ao adicionar agentes: ${agentErr.message}` }, { status: 500 })
  }

  // Auto-create Slack channel (non-blocking)
  try {
    await createSlackChannelForRestaurant(rest.id, rest.slug)
  } catch (e) {
    console.error(`[adicionar-restaurante] Slack channel creation failed for ${rest.slug}:`, e)
  }

  return NextResponse.json({ success: true, restaurantId: rest.id, slug: rest.slug })
}
