// scripts/send-preview-email.mjs
// Envia email de prévia do relatório intercalar directamente via Resend API.
// Uso: node scripts/send-preview-email.mjs [email]
// Não necessita de servidor a correr.

const to = process.argv[2] ?? 'penagrowthagency@gmail.com'
const RESEND_API_KEY = 're_9f9xVh5W_ALoTSJQcEnCV63DHVv3bnKBz'
const emailFrom = 'onboarding@resend.dev'
const appUrl = 'https://app.ninecalls.io'

const data = {
  restaurantNome: 'Taberna do Chiado',
  numeroCiclo: 0,
  dataInicio: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  totalChamadas: 47,
  successRate: 91,
  transferencias: 4,
  pessoasReservas: 38,
  takeawaysConfirmados: 12,
  pessoasUltimaHora: 7,
  valorAcumulado: 127.50,
  dashboardUrl: `${appUrl}/dashboard/taberna-do-chiado`,
  appUrl,
  garantia: { contagem: 38, objetivo: 50, pct: 76 },
}

function formatPeriod(dataInicio) {
  const start = new Date(dataInicio + 'T12:00:00Z')
  const end = new Date(dataInicio + 'T12:00:00Z')
  end.setDate(end.getDate() + 14)
  const opts = { day: 'numeric', month: 'long' }
  return `${start.toLocaleDateString('pt-PT', opts)} — ${end.toLocaleDateString('pt-PT', { ...opts, year: 'numeric' })}`
}

function row(label, value, highlight = false) {
  return `
  <tr>
    <td style="padding:10px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;">${label}</td>
    <td style="padding:10px 0;font-size:14px;font-weight:${highlight ? '700' : '500'};color:${highlight ? '#111827' : '#374151'};text-align:right;border-bottom:1px solid #f3f4f6;">${value}</td>
  </tr>`
}

function sectionHeader(title) {
  return `
  <tr>
    <td colspan="2" style="padding:24px 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;">${title}</td>
  </tr>`
}

function buildHtml(d) {
  const logoUrl = `${d.appUrl}/nine-call-ai-light.png`
  const periodo = formatPeriod(d.dataInicio)
  const ciclolabel = d.numeroCiclo === 0 ? 'Ciclo de Garantia' : `Ciclo ${d.numeroCiclo}`

  let garantiaRows = ''
  if (d.garantia) {
    const { contagem, objetivo, pct } = d.garantia
    const filledPct = Math.min(100, pct)
    const emptyPct = 100 - filledPct
    const status = pct >= 60 ? 'No bom caminho' : pct >= 30 ? 'Atenção necessária' : 'Abaixo do esperado'

    garantiaRows = `
    ${sectionHeader('Garantia')}
    ${row('Pessoas contabilizadas', `${contagem} de ${objetivo}`)}
    <tr>
      <td colspan="2" style="padding:8px 0 0;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td style="padding-bottom:6px;font-size:13px;color:#6b7280;">Progresso — Dia 15 de 30</td>
            <td style="padding-bottom:6px;text-align:right;font-size:13px;font-weight:600;color:#111827;">${pct}%</td>
          </tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-radius:3px;overflow:hidden;background:#f3f4f6;">
          <tr>
            ${filledPct > 0 ? `<td width="${filledPct}%" style="background:#00D4AA;height:6px;"></td>` : ''}
            ${emptyPct > 0 ? `<td width="${emptyPct}%" style="background:#f3f4f6;height:6px;"></td>` : ''}
          </tr>
        </table>
        <p style="margin:8px 0 0;font-size:13px;color:#374151;">${status}</p>
      </td>
    </tr>`
  }

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Intercalar — ${d.restaurantNome}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <tr>
            <td style="padding:0 0 24px;" align="center">
              <img src="${logoUrl}" width="48" height="48" alt="Nine Calls" style="display:block;border-radius:10px;">
            </td>
          </tr>

          <tr>
            <td style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">

              <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;">${ciclolabel}</p>
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.4px;">Relatório Intercalar</h1>
              <p style="margin:0 0 6px;font-size:15px;color:#374151;">${d.restaurantNome}</p>
              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;">${periodo}</p>

              <div style="height:1px;background:#f3f4f6;"></div>

              <table width="100%" cellpadding="0" cellspacing="0">
                ${sectionHeader('Chamadas')}
                ${row('Total de chamadas', String(d.totalChamadas))}
                ${row('Taxa de sucesso', `${d.successRate}%`)}
                ${row('Transferências', String(d.transferencias))}

                ${sectionHeader('Resultados')}
                ${row('Pessoas — Reservas', String(d.pessoasReservas))}
                ${row('Takeaways confirmados', String(d.takeawaysConfirmados))}
                ${row('Pessoas — Última hora', String(d.pessoasUltimaHora))}

                ${sectionHeader('Faturação acumulada')}
                ${row('Comissões (primeiros 15 dias)', `€${d.valorAcumulado.toFixed(2)}`, true)}

                ${garantiaRows}
              </table>

              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td>
                    <a href="${d.dashboardUrl}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;text-decoration:none;">Ver dashboard</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <tr>
            <td style="padding:24px 0 0;" align="center">
              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">
                Dúvidas? Responda a este email ou contacte <a href="mailto:goncaloafonso@ninecallsai.com" style="color:#6b7280;text-decoration:none;">goncaloafonso@ninecallsai.com</a>
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;">
                Gonçalo Afonso &middot; Nine Calls &middot; <a href="mailto:goncaloafonso@ninecallsai.com?subject=Cancelar emails Nine Calls" style="color:#9ca3af;text-decoration:none;">Cancelar subscrição</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>

</body>
</html>`
}

const html = buildHtml(data)

console.log(`A enviar para: ${to}`)

const res = await fetch('https://api.resend.com/emails', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${RESEND_API_KEY}`,
  },
  body: JSON.stringify({
    from: emailFrom,
    to: [to],
    subject: `[PREVIEW] Taberna do Chiado — Relatório intercalar dos primeiros 15 dias`,
    html,
  }),
})

if (!res.ok) {
  const err = await res.text()
  console.error('Erro Resend:', err)
  process.exit(1)
}

const body = await res.json()
console.log('Enviado:', body)
