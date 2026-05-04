import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const createSchema = z.object({
  action: z.literal('create'),
  restaurantId: z.string().uuid(),
  nome: z.string().min(1),
  telnyxAgentId: z.string().min(1),
})

const toggleSchema = z.object({
  action: z.literal('toggle'),
  agentId: z.string().uuid(),
  activo: z.boolean(),
})

const deleteSchema = z.object({
  action: z.literal('delete'),
  agentId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const db = createAdminClient()

  if (body.action === 'create') {
    const parsed = createSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const { restaurantId, nome, telnyxAgentId } = parsed.data
    const { error } = await db.from('agents').insert({
      restaurant_id: restaurantId,
      nome,
      telnyx_agent_id: telnyxAgentId,
      activo: true,
    })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'toggle') {
    const parsed = toggleSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const { agentId, activo } = parsed.data
    const { error } = await db.from('agents').update({ activo }).eq('id', agentId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (body.action === 'delete') {
    const parsed = deleteSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })
    const { agentId } = parsed.data
    const { error } = await db.from('agents').delete().eq('id', agentId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acção inválida' }, { status: 400 })
}
