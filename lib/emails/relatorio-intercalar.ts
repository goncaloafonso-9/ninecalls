// lib/emails/relatorio-intercalar.ts
// Template HTML do email de relatório intercalar (Dia 15 de cada ciclo).
// Usado por: wf-dc-06, email-15-dias, preview-email-15d.

export interface RelatorioIntercalarData {
  restaurantNome: string
  clienteNomeEmpresa: string
  numeroCiclo: number
  dataInicio: string // YYYY-MM-DD
  totalChamadas: number
  sucessos: number
  successRate: number
  taxaTransferencia: number
  reservasConfirmadas: number
  takeawaysConfirmados: number
  pessoasUltimaHora: number
  valorAcumulado: number
  receitaEstimada: number
  roi: number
  appUrl: string
}

const FONT = `'Geist', 'Inter', system-ui, -apple-system, sans-serif`

function formatPeriod(dataInicio: string): string {
  const start = new Date(dataInicio + 'T12:00:00Z')
  const end = new Date(dataInicio + 'T12:00:00Z')
  end.setDate(end.getDate() + 14)
  const opts: Intl.DateTimeFormatOptions = { day: 'numeric', month: 'long' }
  return `${start.toLocaleDateString('pt-PT', opts)} — ${end.toLocaleDateString('pt-PT', { ...opts, year: 'numeric' })}`
}

function row(label: string, value: string, highlight = false, color?: string): string {
  const valColor = color ?? (highlight ? '#111827' : '#374151')
  const valWeight = highlight ? '700' : '500'
  return `
  <tr>
    <td style="padding:10px 0;font-size:14px;color:#6b7280;border-bottom:1px solid #f3f4f6;font-family:${FONT};">${label}</td>
    <td style="padding:10px 0;font-size:14px;font-weight:${valWeight};color:${valColor};text-align:right;border-bottom:1px solid #f3f4f6;font-family:${FONT};">${value}</td>
  </tr>`
}

function sectionHeader(title: string): string {
  return `
  <tr>
    <td colspan="2" style="padding:24px 0 8px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:#9ca3af;font-family:${FONT};">${title}</td>
  </tr>`
}

export function buildRelatorioIntercalarHtml(data: RelatorioIntercalarData): string {
  const {
    restaurantNome,
    numeroCiclo,
    dataInicio,
    totalChamadas,
    successRate,
    taxaTransferencia,
    reservasConfirmadas,
    takeawaysConfirmados,
    pessoasUltimaHora,
    valorAcumulado,
    receitaEstimada,
    roi,
    appUrl,
  } = data

  const logoUrl = 'https://res.cloudinary.com/dggjje8o5/image/upload/v1779017326/nine-call-ai-light_tbhqvh.png'
  const periodo = formatPeriod(dataInicio)
  const cicloLabel = numeroCiclo === 0 ? 'Ciclo de Garantia' : `Ciclo ${numeroCiclo}`

  const roiLabel = roi >= 0 ? `+${roi}%` : `${roi}%`
  const roiColor = roi >= 0 ? '#10b981' : '#ef4444'

  const roiRows = receitaEstimada > 0 ? `
    ${row('Receita Estimada Recuperada', `€${receitaEstimada.toFixed(2)}`)}
    ${row('ROI', roiLabel, false, roiColor)}
  ` : ''
  const financeiroRows = valorAcumulado > 0 ? `
    ${sectionHeader('Resultados Financeiros')}
    ${row('Investimento a Efetuar', `€${valorAcumulado.toFixed(2)}`, true)}
    ${roiRows}
  ` : ''

  return `<!DOCTYPE html>
<html lang="pt">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Relatório Intercalar — ${restaurantNome}</title>
</head>
<body style="margin:0;padding:0;background:#f6f9fc;font-family:${FONT};-webkit-font-smoothing:antialiased;">

  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f6f9fc;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo header -->
          <tr>
            <td style="padding:0 0 24px;" align="center">
              <img src="${logoUrl}" width="48" height="48" alt="Nine Calls" style="display:block;border-radius:10px;">
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#ffffff;border-radius:8px;border:1px solid #e5e7eb;padding:40px;">

              <!-- Title block -->
              <p style="margin:0 0 4px;font-size:13px;font-weight:500;color:#9ca3af;text-transform:uppercase;letter-spacing:0.06em;font-family:${FONT};">${cicloLabel}</p>
              <h1 style="margin:0 0 4px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.4px;font-family:${FONT};">Relatório Intercalar</h1>
              <p style="margin:0 0 6px;font-size:15px;color:#374151;font-family:${FONT};">${restaurantNome}</p>
              <p style="margin:0 0 32px;font-size:13px;color:#9ca3af;font-family:${FONT};">${periodo}</p>

              <div style="height:1px;background:#f3f4f6;margin:0 0 4px;"></div>

              <!-- Metrics table -->
              <table width="100%" cellpadding="0" cellspacing="0">

                ${sectionHeader('Chamadas')}
                ${row('Total de chamadas', String(totalChamadas))}
                ${row('Taxa de sucesso', `${successRate}%`)}
                ${row('Taxa de transferência', `${taxaTransferencia}%`)}

                ${sectionHeader('Resultados')}
                ${row('Reservas Confirmadas', String(reservasConfirmadas))}
                ${row('Takeaways Confirmados', String(takeawaysConfirmados))}
                ${row('Mesas de Última Hora', String(pessoasUltimaHora))}

                ${financeiroRows}

              </table>

              <!-- CTA -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;">
                <tr>
                  <td>
                    <a href="${appUrl}" style="display:inline-block;background:#111827;color:#ffffff;font-size:14px;font-weight:600;padding:12px 22px;border-radius:6px;text-decoration:none;letter-spacing:-0.1px;font-family:${FONT};">Ver dashboard</a>
                  </td>
                </tr>
              </table>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:24px 0 0;" align="center">
              <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;font-family:${FONT};">
                Dúvidas? Responda a este email ou contacte <a href="mailto:hello@ninecallsai.com" style="color:#6b7280;text-decoration:none;">hello@ninecallsai.com</a>
              </p>
              <p style="margin:0;font-size:13px;color:#9ca3af;font-family:${FONT};">
                Gonçalo Afonso &middot; Nine Calls &middot; <a href="mailto:hello@ninecallsai.com?subject=Cancelar emails Nine Calls" style="color:#9ca3af;text-decoration:none;">Cancelar subscrição</a>
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
