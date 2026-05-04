import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const updateSchema = z.object({
  clientId: z.string().uuid(),
  newPassword: z.string().min(8),
  action: z.undefined(),
})

const revealSchema = z.object({
  clientId: z.string().uuid(),
  action: z.literal('reveal'),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const db = createAdminClient()
  const ENC_KEY = process.env.ADMIN_PASSWORD_ENC_KEY

  if (!ENC_KEY) return NextResponse.json({ error: 'Chave de encriptação não configurada' }, { status: 500 })

  // Reveal mode
  if (body.action === 'reveal') {
    const parsed = revealSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

    const { data, error } = await db
      .rpc('reveal_client_password', { p_client_id: parsed.data.clientId, p_enc_key: ENC_KEY })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ password: data })
  }

  // Update mode
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { clientId, newPassword } = parsed.data

  // Get auth_user_id
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Update auth.users password
  const { error: authErr } = await db.auth.admin.updateUserById(client.auth_user_id, { password: newPassword })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  // Encrypt and store new password + reset altered flag
  const { error: dbErr } = await db
    .from('clients')
    .update({
      password_admin_enc: db.rpc('pgp_sym_encrypt', { data: newPassword, psw: ENC_KEY }) as unknown as string,
      password_alterada_cliente: false,
    })
    .eq('id', clientId)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
