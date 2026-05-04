import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { z } from 'zod'

const schema = z.object({
  action: z.enum(['confirmar', 'rejeitar']),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const { uuid } = await params

  const body = await request.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })
  }

  const { action } = parsed.data
  const supabase = createAdminClient()

  // Verify order exists, is pending, and not expired
  const { data: order } = await supabase
    .from('takeaway_orders')
    .select('id, estado, expira_em')
    .eq('id', uuid)
    .single()

  if (!order) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  if (order.estado !== 'pendente_restaurante') {
    return NextResponse.json({ error: 'Pedido já foi respondido' }, { status: 409 })
  }

  if (order.expira_em && new Date() > new Date(order.expira_em)) {
    return NextResponse.json({ error: 'Pedido expirado' }, { status: 410 })
  }

  const novoEstado = action === 'confirmar' ? 'confirmado' : 'rejeitado'

  const { error } = await supabase
    .from('takeaway_orders')
    .update({
      estado: novoEstado,
      timestamp_resposta_restaurante: new Date().toISOString(),
    })
    .eq('id', uuid)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, estado: novoEstado })
}
