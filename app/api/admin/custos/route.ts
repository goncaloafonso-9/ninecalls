import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin } from '@/lib/api-auth'
import { z } from 'zod'

const uuidSchema = z.string().uuid()

// GET /api/admin/custos?restaurant_id=... | ?client_id=... | (sem params = todos)
// Retorna dados de custo AI por restaurante. Apenas admin. Nunca exposto ao cliente.
export async function GET(req: NextRequest) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const db = createAdminClient()
  const { searchParams } = new URL(req.url)
  const restaurantIdRaw = searchParams.get('restaurant_id')
  const clientIdRaw = searchParams.get('client_id')

  if (restaurantIdRaw && !uuidSchema.safeParse(restaurantIdRaw).success) {
    return NextResponse.json({ error: 'restaurant_id inválido' }, { status: 400 })
  }
  if (clientIdRaw && !uuidSchema.safeParse(clientIdRaw).success) {
    return NextResponse.json({ error: 'client_id inválido' }, { status: 400 })
  }

  const restaurantId = restaurantIdRaw
  const clientId = clientIdRaw

  let query = db.from('v_admin_custos').select('*')

  if (restaurantId) {
    query = query.eq('restaurant_id', restaurantId)
  } else if (clientId) {
    query = query.eq('client_id', clientId)
  }

  query = query.order('custo_total_eur', { ascending: false })

  const { data, error } = await query

  if (error) {
    console.error('[custos] error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Se client_id, calcular também o total agregado do cliente
  if (clientId && data) {
    const total_minutos = data.reduce((sum, r) => sum + Number(r.total_minutos ?? 0), 0)
    const custo_total_eur = data.reduce((sum, r) => sum + Number(r.custo_total_eur ?? 0), 0)
    return NextResponse.json({
      restaurantes: data,
      cliente_total: {
        total_minutos: Math.round(total_minutos * 100) / 100,
        custo_total_eur: Math.round(custo_total_eur * 100) / 100,
      },
    })
  }

  return NextResponse.json({ restaurantes: data })
}
