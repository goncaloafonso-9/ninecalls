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

  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'

  const supabase = createAdminClient()

  const { data: pedido } = await supabase
    .from('ultima_hora_requests')
    .select('id, estado, expira_em')
    .eq('id', uuid)
    .single()

  if (!pedido) {
    return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 })
  }

  if (pedido.estado === 'nao_aplicavel') {
    return NextResponse.json({ error: 'Este restaurante não disponibiliza confirmação de última hora' }, { status: 409 })
  }

  if (pedido.estado !== 'pendente_restaurante') {
    return NextResponse.json({ error: 'Pedido já foi respondido' }, { status: 409 })
  }

  if (pedido.expira_em && new Date() > new Date(pedido.expira_em)) {
    return NextResponse.json({ error: 'Pedido expirado' }, { status: 410 })
  }

  // Note: action=confirmar → estado=aceite (for ultima_hora the accepted state is 'aceite')
  const novoEstado = action === 'confirmar' ? 'aceite' : 'rejeitado'

  const { error } = await supabase
    .from('ultima_hora_requests')
    .update({
      estado: novoEstado,
      timestamp_resposta_restaurante: new Date().toISOString(),
      confirmacao_ip: ip,
    })
    .eq('id', uuid)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, estado: novoEstado })
}
