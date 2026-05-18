import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  slug: z.string().min(1),
})

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  if (user.app_metadata?.role !== 'client') return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // RLS guarantees the client can only read their own record
  const { data: client, error: clientErr } = await supabase
    .from('clients')
    .select('stripe_customer_id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientErr || !client) return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  if (!client.stripe_customer_id) {
    return NextResponse.json({ error: 'Sem configuração de pagamento. Contacte o administrador.' }, { status: 404 })
  }

  const returnUrl = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/${parsed.data.slug}/ciclos`

  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: returnUrl,
  })

  return NextResponse.json({ url: session.url })
}
