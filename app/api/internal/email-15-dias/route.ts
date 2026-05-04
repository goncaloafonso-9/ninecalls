import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateInternalSecret, notifySlack } from '@/lib/internal-auth'

export const runtime = 'nodejs'

// Called by WF-DC-06 at 12:00 daily.
// Sends 15-day mid-cycle report to clients whose active cycle started exactly 15 days ago.
export async function POST(req: NextRequest) {
  const authError = validateInternalSecret(req)
  if (authError) return authError

  const resendApiKey = process.env.RESEND_API_KEY
  const emailFrom = process.env.EMAIL_FROM ?? 'goncaloafonso@ninecallsai.com'

  if (!resendApiKey) {
    return NextResponse.json({ error: 'RESEND_API_KEY não configurada' }, { status: 500 })
  }

  const db = createAdminClient()
  const today = new Date()
  const fifteenDaysAgo = new Date(today)
  fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15)
  const targetDate = fifteenDaysAgo.toISOString().split('T')[0]

  // Find active cycles that started 15 days ago
  const { data: cycles, error } = await db
    .from('billing_cycles')
    .select(`
      id, numero_ciclo, data_inicio, valor_total,
      total_pessoas_reservas, total_pessoas_ultima_hora, total_takeaways_confirmados,
      snapshot_comissao_por_pessoa, snapshot_taxa_takeaway,
      restaurants (
        id, nome, estado,
        clients (nome_empresa, email_faturacao)
      )
    `)
    .eq('estado', 'ativo')
    .eq('data_inicio', targetDate)

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

    // Gather call stats for this cycle
    const { data: calls } = await db
      .from('calls')
      .select('resultado, tipo_chamada')
      .eq('billing_cycle_id', cycle.id)

    const totalChamadas = calls?.length ?? 0
    const sucessos = calls?.filter(c => c.resultado === 'sucesso').length ?? 0
    const transferencias = calls?.filter(c => c.tipo_chamada === 'transferencia').length ?? 0

    // Guarantee progress (ciclo 0 only)
    let guaranteeSection = ''
    if (cycle.numero_ciclo === 0) {
      const { data: gt } = await db
        .from('guarantee_tracking')
        .select('contagem_actual, objetivo')
        .eq('restaurant_id', restaurant.id)
        .single()

      if (gt) {
        const pct = Math.min(100, Math.round(((gt.contagem_actual ?? 0) / (gt.objetivo ?? 1)) * 100))
        guaranteeSection = `
          <tr><td colspan="2" style="padding:8px 0;font-weight:600;color:#1a1a1a;border-top:1px solid #e5e7eb;padding-top:16px;">PROGRESSO DA GARANTIA</td></tr>
          <tr><td style="padding:4px 0;color:#6b7280;">Pessoas contabilizadas</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${gt.contagem_actual ?? 0} / ${gt.objetivo ?? '?'} (${pct}%) — Dia 15 de 30</td></tr>
        `
      }
    }

    const valorAcumulado = Number(cycle.valor_total) || 0
    const successRate = totalChamadas > 0 ? Math.round((sucessos / totalChamadas) * 100) : 0

    const html = `
<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório 15 Dias — ${restaurant.nome}</title>
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f9fafb;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;border:1px solid #e5e7eb;overflow:hidden;">
    <div style="background:#111827;padding:24px 32px;">
      <p style="margin:0;color:#9ca3af;font-size:13px;font-weight:500;letter-spacing:0.05em;text-transform:uppercase;">Nine Calls</p>
      <h1 style="margin:8px 0 0;color:#fff;font-size:20px;font-weight:600;">${restaurant.nome} — Relatório dos primeiros 15 dias</h1>
    </div>
    <div style="padding:24px 32px;">
      <table style="width:100%;border-collapse:collapse;">
        <tr><td colspan="2" style="padding:8px 0;font-weight:600;color:#1a1a1a;">CHAMADAS</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Total de chamadas</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${totalChamadas}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Atendidas com sucesso</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${sucessos} (${successRate}%)</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Transferidas</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${transferencias}</td></tr>

        <tr><td colspan="2" style="padding:8px 0;font-weight:600;color:#1a1a1a;border-top:1px solid #e5e7eb;padding-top:16px;">RESULTADOS</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Reservas confirmadas</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${cycle.total_pessoas_reservas ?? 0} pessoas</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Takeaways confirmados</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${cycle.total_takeaways_confirmados ?? 0}</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Última hora aceites</td><td style="padding:4px 0;font-weight:500;color:#1a1a1a;text-align:right;">${cycle.total_pessoas_ultima_hora ?? 0} pessoas</td></tr>

        <tr><td colspan="2" style="padding:8px 0;font-weight:600;color:#1a1a1a;border-top:1px solid #e5e7eb;padding-top:16px;">FATURAÇÃO ACUMULADA</td></tr>
        <tr><td style="padding:4px 0;color:#6b7280;">Valor acumulado</td><td style="padding:4px 0;font-weight:600;color:#059669;text-align:right;">€${valorAcumulado.toFixed(2)} (ciclo em curso)</td></tr>

        ${guaranteeSection}
      </table>

      <div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;">
        <p style="margin:0;color:#6b7280;font-size:13px;">Qualquer questão, estou disponível: <a href="mailto:goncaloafonso@ninecallsai.com" style="color:#059669;">goncaloafonso@ninecallsai.com</a></p>
        <p style="margin:8px 0 0;color:#6b7280;font-size:13px;">Gonçalo · Nine Calls</p>
      </div>
    </div>
  </div>
</body>
</html>`

    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${resendApiKey}`,
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [client.email_faturacao],
          subject: `${restaurant.nome} — Relatório dos primeiros 15 dias`,
          html,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(`Resend error: ${errText}`)
      }

      await notifySlack(
        process.env.SLACK_CHANNEL_FATURACAO ?? '',
        `📊 Mini-relatório 15 dias enviado — ${restaurant.nome}`
      )

      results.push({ restaurant: restaurant.nome, email: client.email_faturacao, status: 'sent' })
    } catch (err) {
      console.error(`[email-15-dias] error for ${restaurant.nome}:`, err)
      results.push({ restaurant: restaurant.nome, email: client.email_faturacao, status: 'error' })
    }
  }

  return NextResponse.json({
    ok: true,
    enviados: results.filter(r => r.status === 'sent').length,
    results,
  })
}
