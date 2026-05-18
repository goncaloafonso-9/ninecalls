import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
})

export async function DELETE(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { clientId } = parsed.data
  const db = createAdminClient()

  const { data: restaurants, error: restErr } = await db
    .from('restaurants')
    .select('id, estado')
    .eq('client_id', clientId)

  if (restErr) return NextResponse.json({ error: restErr.message }, { status: 500 })

  const notRescindidos = (restaurants ?? []).filter(r => r.estado !== 'rescindido')
  if (notRescindidos.length > 0) {
    return NextResponse.json(
      { error: 'Todos os restaurantes têm de estar rescindidos antes de apagar o cliente' },
      { status: 400 }
    )
  }

  // Delete each restaurant's data
  const restaurantTables = [
    'calls',
    'bookings',
    'takeaway_requests',
    'ultima_hora_requests',
    'guarantee_tracking',
    'conversoes_manuais',
    'billing_cycles',
    'agents',
  ]

  for (const restaurant of (restaurants ?? [])) {
    for (const table of restaurantTables) {
      await db.from(table as never).delete().eq('restaurant_id', restaurant.id)
    }
    await db.from('restaurants').delete().eq('id', restaurant.id)
  }

  // Get auth_user_id before deleting client row
  const { data: client, error: clientErr } = await db
    .from('clients')
    .select('auth_user_id')
    .eq('id', clientId)
    .single()

  if (clientErr || !client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })

  // Delete client row
  const { error: deleteClientErr } = await db.from('clients').delete().eq('id', clientId)
  if (deleteClientErr) return NextResponse.json({ error: deleteClientErr.message }, { status: 500 })

  // Delete auth user
  const { error: authErr } = await db.auth.admin.deleteUser(client.auth_user_id)
  if (authErr) {
    console.error('Erro ao apagar auth user:', authErr.message)
    // Non-blocking: client row already deleted
  }

  return NextResponse.json({ success: true })
}
