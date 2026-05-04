import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'

export const runtime = 'nodejs'

// Called by WF-CRON-01 at 07:00 daily.
// Expires takeaway_orders and ultima_hora_requests past their expira_em.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  const db = createAdminClient()

  // Expire takeaway_orders
  const { data: expiredTakeaways, error: errT } = await db
    .from('takeaway_orders')
    .update({ estado: 'rejeitado' })
    .lt('expira_em', new Date().toISOString())
    .eq('estado', 'pendente_restaurante')
    .select('id, restaurants(nome)')

  if (errT) {
    console.error('[expirar-pendentes] takeaway_orders error:', errT)
    await notifySlack(
      process.env.SLACK_CHANNEL_SISTEMA ?? '',
      `🔴 Erro ao expirar takeaways: ${errT.message}`
    )
  }

  // Expire ultima_hora_requests
  const { data: expiredUltimaHora, error: errU } = await db
    .from('ultima_hora_requests')
    .update({ estado: 'rejeitado' })
    .lt('expira_em', new Date().toISOString())
    .eq('estado', 'pendente_restaurante')
    .select('id, restaurants(nome)')

  if (errU) {
    console.error('[expirar-pendentes] ultima_hora_requests error:', errU)
    await notifySlack(
      process.env.SLACK_CHANNEL_SISTEMA ?? '',
      `🔴 Erro ao expirar última hora: ${errU.message}`
    )
  }

  const totalExpired = (expiredTakeaways?.length ?? 0) + (expiredUltimaHora?.length ?? 0)

  return NextResponse.json({
    ok: true,
    takeaways_expirados: expiredTakeaways?.length ?? 0,
    ultima_hora_expirados: expiredUltimaHora?.length ?? 0,
    total: totalExpired,
  })
}
