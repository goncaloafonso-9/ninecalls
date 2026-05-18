import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'

export const runtime = 'nodejs'

// POST /api/internal/expirar-pendentes
// Expires takeaway_orders and ultima_hora_requests past their expira_em timestamp.
// Standalone version of the expiry step in WF-CRON-01.
// Auth: CRON_SECRET.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const db = createAdminClient()
  const now = new Date().toISOString()

  try {
    const { data: expiredTakeaways, error: errT } = await db
      .from('takeaway_orders')
      .update({ estado: 'rejeitado' })
      .lt('expira_em', now)
      .eq('estado', 'pendente_restaurante')
      .select('id, restaurants(nome)')

    if (errT) {
      console.error('[expirar-pendentes] takeaway_orders error:', errT)
      await sendSlackAlert('sistema', 'Erro ao expirar takeaways', errT.message, 'error')
    }

    const { data: expiredUltimaHora, error: errU } = await db
      .from('ultima_hora_requests')
      .update({ estado: 'rejeitado' })
      .lt('expira_em', now)
      .eq('estado', 'pendente_restaurante')
      .select('id, restaurants(nome)')

    if (errU) {
      console.error('[expirar-pendentes] ultima_hora_requests error:', errU)
      await sendSlackAlert('sistema', 'Erro ao expirar última hora', errU.message, 'error')
    }

    const totalExpired = (expiredTakeaways?.length ?? 0) + (expiredUltimaHora?.length ?? 0)

    if (totalExpired > 5) {
      await sendSlackMessage({
        channel: 'sistema',
        text: `⚠️ ${totalExpired} pedidos expirados (${expiredTakeaways?.length ?? 0} takeaways + ${expiredUltimaHora?.length ?? 0} última hora)`,
      })
    }

    console.log(JSON.stringify({
      event: 'expirar-pendentes',
      takeaways_expirados: expiredTakeaways?.length ?? 0,
      ultima_hora_expirados: expiredUltimaHora?.length ?? 0,
      timestamp: new Date().toISOString(),
    }))

    return NextResponse.json({
      ok: true,
      takeaways_expirados: expiredTakeaways?.length ?? 0,
      ultima_hora_expirados: expiredUltimaHora?.length ?? 0,
    })
  } catch (err) {
    console.error('[expirar-pendentes] unexpected error:', err)
    await sendSlackAlert('sistema', 'Erro inesperado no expirar-pendentes', String(err), 'error')
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 })
  }
}
