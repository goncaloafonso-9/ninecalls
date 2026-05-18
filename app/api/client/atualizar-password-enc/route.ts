import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const schema = z.object({
  password: z.string().min(8),
})

export async function POST(req: NextRequest) {
  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const supabase = await createServerClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const ENC_KEY = process.env.ADMIN_PASSWORD_ENC_KEY
  if (!ENC_KEY) return NextResponse.json({ error: 'Configuração inválida' }, { status: 500 })

  const db = createAdminClient()

  // Get client id from auth_user_id
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientErr || !client) {
    // User may be admin — not an error, just skip
    return NextResponse.json({ success: true })
  }

  // Re-encrypt new password and reset altered flag
  const { error: rpcErr } = await db.rpc('store_client_password', {
    p_client_id: client.id,
    p_password: parsed.data.password,
    p_enc_key: ENC_KEY,
  })
  if (rpcErr) return NextResponse.json({ error: rpcErr.message }, { status: 500 })

  await db
    .from('clients')
    .update({ password_alterada_cliente: false })
    .eq('id', client.id)

  return NextResponse.json({ success: true })
}
