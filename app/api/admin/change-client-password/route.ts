import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const revealSchema = z.object({
  clientId: z.string().uuid(),
  action: z.literal('reveal'),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()

  if (body.action !== 'reveal') {
    return NextResponse.json({ error: 'Acção não permitida' }, { status: 400 })
  }

  const parsed = revealSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const db = createAdminClient()
  const ENC_KEY = process.env.ADMIN_PASSWORD_ENC_KEY
  if (!ENC_KEY) return NextResponse.json({ error: 'Chave de encriptação não configurada' }, { status: 500 })

  const { data, error } = await db
    .rpc('reveal_client_password', { p_client_id: parsed.data.clientId, p_enc_key: ENC_KEY })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ password: data })
}
