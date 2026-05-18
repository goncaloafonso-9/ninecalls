import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'
import { createSlackChannelForRestaurant } from '@/lib/slack'
import { z } from 'zod'

const restaurantSchema = z.object({
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
  })).min(0).default([]),
})

const clientSchema = z.object({
  nome_empresa: z.string().min(1),
  nif: z.string().min(1),
  morada: z.string().min(1),
  email_contacto: z.string().email(),
  email_faturacao: z.string().email(),
  telefone: z.string().optional(),
  password: z.string().min(8),
  docusign_envelope_id: z.string().optional(),
  notas_internas: z.string().optional(),
  restaurantes: z.array(restaurantSchema).min(1),
})

// Mirrors fn_slugify() in the database schema.
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
  const parsed = clientSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const data = parsed.data
  const db = createAdminClient()
  const ENC_KEY = process.env.ADMIN_PASSWORD_ENC_KEY

  if (!ENC_KEY) return NextResponse.json({ error: 'Chave de encriptação não configurada' }, { status: 500 })

  // 1. Create auth user
  const { data: authUser, error: authErr } = await db.auth.admin.createUser({
    email: data.email_contacto,
    password: data.password,
    email_confirm: true,
    app_metadata: { role: 'client' },
  })

  if (authErr || !authUser.user) {
    return NextResponse.json({ error: authErr?.message ?? 'Erro ao criar utilizador' }, { status: 500 })
  }

  // 2. Create client record
  const { data: client, error: clientErr } = await db
    .from('clients')
    .insert({
      auth_user_id: authUser.user.id,
      nome_empresa: data.nome_empresa,
      nif: data.nif,
      morada: data.morada,
      email_contacto: data.email_contacto,
      email_faturacao: data.email_faturacao,
      telefone: data.telefone ?? null,
      docusign_envelope_id: data.docusign_envelope_id ?? null,
      notas_internas: data.notas_internas ?? null,
    })
    .select('id')
    .single()

  if (clientErr || !client) {
    await db.auth.admin.deleteUser(authUser.user.id)
    return NextResponse.json({ error: clientErr?.message ?? 'Erro ao criar cliente' }, { status: 500 })
  }

  // Store encrypted password via RPC (uses pgp_sym_encrypt server-side)
  const { error: pwErr } = await db.rpc('store_client_password', {
    p_client_id: client.id,
    p_password: data.password,
    p_enc_key: ENC_KEY,
  })
  if (pwErr) {
    // Non-blocking: password can be re-set later via change-client-password
    console.error('store_client_password error:', pwErr.message)
  }

  // Create Stripe customer (non-blocking — don't fail onboarding if Stripe fails)
  try {
    const stripeCustomer = await stripe.customers.create({
      name: data.nome_empresa,
      email: data.email_faturacao,
      phone: data.telefone ?? undefined,
      metadata: {
        client_id: client.id,
        nif: data.nif,
      },
    })
    await db
      .from('clients')
      .update({ stripe_customer_id: stripeCustomer.id })
      .eq('id', client.id)
  } catch {
    // Log but don't fail — Stripe can be linked later via reenviar-portal-stripe
  }

  // 3. Create restaurants + agents
  const restaurantIds: string[] = []
  for (let i = 0; i < data.restaurantes.length; i++) {
    const r = data.restaurantes[i]
    const slug = await generateUniqueSlug(db, r.nome)

    const { data: rest, error: restErr } = await db
      .from('restaurants')
      .insert({
        client_id: client.id,
        nome: r.nome,
        slug,
        morada: r.morada ?? null,
        ordem: i + 1,
        telnyx_phone: r.telnyx_phone ?? null,
        transfer_phone: r.transfer_phone ?? null,
        software_reservas: r.software_reservas,
        tem_takeaway: r.tem_takeaway,
        aceita_ultima_hora: r.aceita_ultima_hora,
        taxa_ativacao: r.taxa_ativacao,
        comissao_por_pessoa: r.comissao_por_pessoa,
        taxa_mensal_fixa: r.taxa_mensal_fixa,
        taxa_takeaway: r.taxa_takeaway,
        valor_medio_takeaway: r.valor_medio_takeaway,
        objetivo_garantia: r.objetivo_garantia,
        tem_garantia: r.tem_garantia,
        periodo_compromisso_dias: r.periodo_compromisso_dias,
        valor_rescisao_antecipada: r.valor_rescisao_antecipada,
        google_drive_folder_link: r.google_drive_folder_link ?? null,
      })
      .select('id')
      .single()

    if (restErr || !rest) {
      return NextResponse.json({ error: restErr?.message ?? 'Erro ao criar restaurante' }, { status: 500 })
    }
    restaurantIds.push(rest.id)

    if (r.agentes.length > 0) {
      const { error: agentErr } = await db.from('agents').insert(
        r.agentes.map(a => ({
          restaurant_id: rest.id,
          nome: a.nome,
          telnyx_agent_id: a.telnyx_agent_id,
          activo: true,
        }))
      )
      if (agentErr) {
        return NextResponse.json({ error: `Restaurante criado mas erro ao adicionar agentes: ${agentErr.message}` }, { status: 500 })
      }
    }

    // Auto-create Slack channel (non-blocking — failure shows warning in restaurant page)
    try {
      await createSlackChannelForRestaurant(rest.id, slug)
    } catch (e) {
      console.error(`[criar-cliente] Slack channel creation failed for ${slug}:`, e)
    }
  }

  return NextResponse.json({
    success: true,
    clientId: client.id,
    restaurantIds,
  })
}
