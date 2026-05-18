import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlackMessage, sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'
import { buildRelatorioIntercalarHtml } from '@/lib/emails/relatorio-intercalar'

export const runtime = 'nodejs'

// POST /api/internal/email-15-dias
// Versão standalone do WF-DC-06. Pode ser chamado pelo n8n ou Vercel cron independentemente.
// Encontra ciclos activos com data_inicio = hoje - 15 dias (e email ainda não enviado) e envia relatório intercalar.
// Auth: CRON_SECRET.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? 'noreply@ninecalls.io'
  const emailReplyTo = process.env.EMAIL_REPLY_TO ?? 'hello@ninecallsai.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ninecalls.io'

  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 })
  }

  const db = createAdminClient()
  const today = new Date()
  const fifteenDaysAgo = new Date(today)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  const targetDate = fifteenDaysAgo.toISOString().split('T')[0]

  // Idempotência: só ciclos que ainda não receberam o email
  const { data: cycles, error } = await db
    .from('billing_cycles')
    .select(`
      id, numero_ciclo, data_inicio, valor_total,
      total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados,
      restaurants (
        id, nome, slug,
        clients (nome_empresa, email_faturacao)
      )
    `)
    .eq('estado', 'ativo')
    .eq('data_inicio', targetDate)
    .is('email_intercalar_enviado_em', null)

  if (error) {
    console.error('[email-15-dias] fetch error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (!cycles || cycles.length === 0) {
    return NextResponse.json({ ok: true, enviados: 0 })
  }

  const results: { restaurant: string; email: string; status: string }[] = []

  for (const cycle of cycles) {
    const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
    const client = restaurant && (Array.isArray(restaurant.clients) ? restaurant.clients[0] : restaurant.clients)

    if (!client?.email_faturacao || !restaurant) continue

    const { data: calls } = await db
      .from('calls')
      .select('call_successful, tipo_chamada')
      .eq('billing_cycle_id', cycle.id)

    const { data: bookings } = await db
      .from('bookings')
      .select('id')
      .eq('billing_cycle_id', cycle.id)
      .eq('estado', 'confirmada')

    const totalChamadas = calls?.length ?? 0
    const sucessos = calls?.filter(c => c.call_successful === true).length ?? 0
    const transferencias = calls?.filter(c => c.tipo_chamada === 'transferencia').length ?? 0
    const successRate = totalChamadas > 0 ? Math.round((sucessos / totalChamadas) * 100) : 0
    const taxaTransferencia = totalChamadas > 0 ? Math.round((transferencias / totalChamadas) * 100) : 0
    const reservasConfirmadas = bookings?.length ?? 0

    const valorAcumulado = Number(cycle.valor_total) || 0
    const receitaEstimada =
      ((cycle.total_pessoas_reservas ?? 0) + (cycle.total_pessoas_ultima_hora ?? 0)) * 20
      + (cycle.total_takeaways_confirmados ?? 0) * 35
    const roi = valorAcumulado > 0
      ? Math.round(((receitaEstimada - valorAcumulado) / valorAcumulado) * 100)
      : 0

    const html = buildRelatorioIntercalarHtml({
      restaurantNome: restaurant.nome,
      clienteNomeEmpresa: client.nome_empresa,
      numeroCiclo: cycle.numero_ciclo,
      dataInicio: cycle.data_inicio,
      totalChamadas,
      sucessos,
      successRate,
      taxaTransferencia,
      reservasConfirmadas,
      takeawaysConfirmados: cycle.total_takeaways_confirmados ?? 0,
      pessoasUltimaHora: cycle.total_pessoas_ultima_hora ?? 0,
      valorAcumulado,
      receitaEstimada,
      roi,
      appUrl,
    })

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${resendApiKey}` },
        body: JSON.stringify({
          from: emailFrom,
          reply_to: emailReplyTo,
          to: [client.email_faturacao],
          subject: `${restaurant.nome} — Relatório intercalar dos primeiros 15 dias`,
          html,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Resend error: ${errText}`)
      }

      // Marcar como enviado (idempotência)
      await db
        .from('billing_cycles')
        .update({ email_intercalar_enviado_em: new Date().toISOString() })
        .eq('id', cycle.id)

      await sendSlackMessage({ channel: 'clientes', text: `📧 Email mid-cycle enviado — ${restaurant.nome} → ${client.email_faturacao}` })
      results.push({ restaurant: restaurant.nome, email: client.email_faturacao, status: 'sent' })
    } catch (err) {
      console.error(`[email-15-dias] error for ${restaurant.nome}:`, err)
      await sendSlackAlert('sistema', `Erro ao enviar email mid-cycle — ${restaurant.nome}`, String(err), 'error')
      results.push({ restaurant: restaurant.nome, email: client.email_faturacao, status: 'error' })
    }
  }

  console.log(JSON.stringify({
    event: 'email-15-dias',
    enviados: results.filter(r => r.status === 'sent').length,
    erros: results.filter(r => r.status === 'error').length,
    timestamp: new Date().toISOString(),
  }))

  return NextResponse.json({ ok: true, enviados: results.filter(r => r.status === 'sent').length, results })
}
