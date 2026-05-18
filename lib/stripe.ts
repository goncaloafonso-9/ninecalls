import Stripe from 'stripe'

let _stripe: Stripe | null = null

function getInstance(): Stripe {
  if (!_stripe) {
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
      apiVersion: '2026-04-22.dahlia',
    })
  }
  return _stripe
}

// Proxy ensures Stripe is only instantiated at runtime (not during Next.js build)
export const stripe = new Proxy({} as Stripe, {
  get(_target, prop) {
    return (getInstance() as unknown as Record<string | symbol, unknown>)[prop]
  },
})
