import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  booking_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'client') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
  }

  const { booking_id } = parsed.data

  // Verify the booking exists, belongs to this client, and is within no-show window
  // v_bookings_enriched has RLS so this is safe
  const { data: booking } = await supabase
    .from('v_bookings_enriched')
    .select('id, estado, pode_marcar_no_show')
    .eq('id', booking_id)
    .single()

  if (!booking) {
    return NextResponse.json({ error: 'Reserva não encontrada' }, { status: 404 })
  }

  if (booking.estado !== 'confirmada') {
    return NextResponse.json({ error: 'Reserva já está em no-show ou outro estado' }, { status: 409 })
  }

  if (!booking.pode_marcar_no_show) {
    return NextResponse.json({ error: 'Fora da janela de no-show (confirmado_em → reserva + 48h)' }, { status: 400 })
  }

  // Mark no-show — RLS ensures client can only update own restaurant's bookings
  const { error } = await supabase
    .from('bookings')
    .update({ estado: 'no_show' })
    .eq('id', booking_id)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
