import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
  nome_empresa: z.string().min(1),
  nif: z.string().min(1),
  morada: z.string(),
  email_faturacao: z.string().email(),
  telefone: z.string().optional(),
  docusign_envelope_id: z.string().optional(),
  notas_internas: z.string().optional(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos', details: parsed.error.flatten() }, { status: 400 })

  const { clientId, ...fields } = parsed.data
  const db = createAdminClient()

  const { error } = await db
    .from('clients')
    .update({
      nome_empresa: fields.nome_empresa,
      nif: fields.nif,
      morada: fields.morada,
      email_faturacao: fields.email_faturacao,
      telefone: fields.telefone ?? null,
      docusign_envelope_id: fields.docusign_envelope_id ?? null,
      notas_internas: fields.notas_internas ?? null,
    })
    .eq('id', clientId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
