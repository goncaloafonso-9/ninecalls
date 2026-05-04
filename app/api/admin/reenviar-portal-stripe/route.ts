import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { stripe } from '@/lib/stripe'
import { z } from 'zod'

const schema = z.object({
  clientId: z.string().uuid(),
})

export async function POST(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const body = await req.json()
  const parsed = schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  const { clientId } = parsed.data
  const db = createAdminClient()

  const { data: client } = await db
    .from('clients')
    .select('id, stripe_customer_id, email_faturacao, nome_empresa')
    .eq('id', clientId)
    .single()

  if (!client) {
    return NextResponse.json({ error: 'Cliente não encontrado' }, { status: 404 })
  }

  // If no Stripe customer yet, create one now
  if (!client.stripe_customer_id) {
    try {
      const stripeCustomer = await stripe.customers.create({
        name: client.nome_empresa,
        email: client.email_faturacao,
        metadata: { client_id: clientId },
      })
      await db
        .from('clients')
        .update({ stripe_customer_id: stripeCustomer.id })
        .eq('id', clientId)
      client.stripe_customer_id = stripeCustomer.id
    } catch (e) {
      return NextResponse.json({ error: `Erro ao criar customer Stripe: ${e instanceof Error ? e.message : 'desconhecido'}` }, { status: 500 })
    }
  }

  // Create billing portal session
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const session = await stripe.billingPortal.sessions.create({
    customer: client.stripe_customer_id,
    return_url: `${appUrl}/admin/clientes/${clientId}`,
  })

  return NextResponse.json({ success: true, url: session.url })
}
