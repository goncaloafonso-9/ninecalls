import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/api-auth'
import { createAdminClient } from '@/lib/supabase/admin'
import { buildRelatorioIntercalarHtml } from '@/lib/emails/relatorio-intercalar'

export const runtime = 'nodejs'

// POST /api/admin/preview-email-15d
// Envia um email de prévia do relatório intercalar para um endereço arbitrário.
// Se cycleId fornecido: usa dados reais. Caso contrário: usa dados mock.
// Não actualiza email_intercalar_enviado_em (é apenas preview).
// Auth: sessão admin.
export async function POST(request: Request) {
  const { errorResponse } = await requireAdmin()
  if (errorResponse) return errorResponse

  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.RESEND_FROM_EMAIL ?? process.env.EMAIL_FROM ?? 'noreply@ninecalls.io'
  const emailReplyTo = process.env.EMAIL_REPLY_TO ?? 'hello@ninecallsai.com'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://app.ninecalls.io'

  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 })
  }

  let body: { to?: string; cycleId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const { to, cycleId } = body

  if (!to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: 'Endereço de email inválido' }, { status: 400 })
  }

  let emailData: Parameters<typeof buildRelatorioIntercalarHtml>[0]

  if (cycleId) {
    // Dados reais do ciclo
    const db = createAdminClient()
    const { data: cycle, error } = await db
      .from('billing_cycles')
      .select(`
        id, numero_ciclo, data_inicio, valor_total,
        total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados,
        restaurants (
          id, nome, slug,
          clients (nome_empresa, email_faturacao)
        )
      `)
      .eq('id', cycleId)
      .single()

    if (error || !cycle) {
      return NextResponse.json({ error: 'Ciclo não encontrado' }, { status: 404 })
    }

    const restaurant = Array.isArray(cycle.restaurants) ? cycle.restaurants[0] : cycle.restaurants
    const client = restaurant && (Array.isArray(restaurant.clients) ? restaurant.clients[0] : restaurant.clients)

    if (!restaurant || !client) {
      return NextResponse.json({ error: 'Restaurante ou cliente não encontrado' }, { status: 404 })
    }

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

    emailData = {
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
    }
  } else {
    // Dados mock realistas para preview
    emailData = {
      restaurantNome: 'Taberna do Chiado',
      clienteNomeEmpresa: 'Taberna do Chiado, Lda.',
      numeroCiclo: 1,
      dataInicio: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      totalChamadas: 47,
      sucessos: 43,
      successRate: 91,
      taxaTransferencia: 9,
      reservasConfirmadas: 14,
      takeawaysConfirmados: 12,
      pessoasUltimaHora: 7,
      valorAcumulado: 127.50,
      receitaEstimada: 950,
      roi: 645,
      appUrl,
    }
  }

  const html = buildRelatorioIntercalarHtml(emailData)

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${resendApiKey}`,
      },
      body: JSON.stringify({
        from: emailFrom,
        reply_to: emailReplyTo,
        to: [to],
        subject: `[PREVIEW] ${emailData.restaurantNome} — Relatório intercalar dos primeiros 15 dias`,
        html,
      }),
    })

    if (!res.ok) {
      const errText = await res.text()
      return NextResponse.json({ error: `Resend error: ${errText}` }, { status: 500 })
    }

    const resBody = await res.json() as { id?: string }
    return NextResponse.json({ ok: true, messageId: resBody.id ?? null, sentTo: to })
  } catch (err) {
    console.error('[preview-email-15d] error:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
