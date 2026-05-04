import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
  newEmail: z.string().email(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { clientId, newEmail } = parsed.data
  const db = createAdminClient()

  // Get auth_user_id for this client
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Update auth.users email atomically first
  const { error: authErr } = await db.auth.admin.updateUserById(client.auth_user_id, { email: newEmail })
  if (authErr) return NextResponse.json({ error: authErr.message }, { status: 500 })

  // Update clients.email_contacto
  const { error: dbErr } = await db
    .from('clients')
    .update({ email_contacto: newEmail })
    .eq('id', clientId)

  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
