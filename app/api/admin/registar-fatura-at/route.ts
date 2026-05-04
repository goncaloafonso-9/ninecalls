import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const schema = z.object({
  cycleId: z.string().uuid(),
  numeroFaturaAt: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { cycleId, numeroFaturaAt } = parsed.data
  const db = createAdminClient()

  const { error } = await db
    .from('billing_cycles')
    .update({ numero_fatura_at: numeroFaturaAt })
    .eq('id', cycleId)
    .eq('estado_pagamento', 'pago') // Safety: only register AT invoice on paid cycles

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
