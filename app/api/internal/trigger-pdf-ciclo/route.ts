import { NextResponse } from 'next/server'
import { sendSlackAlert } from '@/lib/slack'
import { validateCronRequest } from '@/lib/cron-auth'
import type { PdfCicloPayload } from '@/types/pdf-ciclo'

export const runtime = 'nodejs'

// POST /api/internal/trigger-pdf-ciclo
// Called internally by wf-cron-02 after closing each billing cycle.
// Forwards the full cycle payload to n8n (WF-PDF-CICLO) for PDF generation.
export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const n8nWebhookUrl = process.env.N8N_PDF_WEBHOOK_URL
  if (!n8nWebhookUrl) {
    console.error('[trigger-pdf-ciclo] N8N_PDF_WEBHOOK_URL not configured')
    return NextResponse.json({ error: 'N8N_PDF_WEBHOOK_URL não configurada' }, { status: 500 })
  }

  let payload: PdfCicloPayload
  try {
    payload = (await request.json()) as PdfCicloPayload
  } catch {
    return NextResponse.json({ error: 'Payload inválido' }, { status: 400 })
  }

  if (!payload.ciclo_id || !payload.restaurant_id) {
    return NextResponse.json({ error: 'ciclo_id e restaurant_id são obrigatórios' }, { status: 400 })
  }

  try {
    const res = await fetch(n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000),
    })

    if (!res.ok) {
      const errText = await res.text()
      throw new Error(`n8n respondeu com ${res.status}: ${errText}`)
    }

    const n8nResponse = await res.json().catch(() => ({}))

    console.log(JSON.stringify({
      event: 'trigger-pdf-ciclo',
      ciclo_id: payload.ciclo_id,
      restaurant: payload.restaurant_name,
      timestamp: new Date().toISOString(),
    }))

    return NextResponse.json({
      success: true,
      n8n_execution_id: (n8nResponse as Record<string, unknown>).executionId ?? null,
    })
  } catch (err) {
    console.error('[trigger-pdf-ciclo] error:', err)
    await sendSlackAlert(
      'sistema',
      `Falha ao disparar PDF — ${payload.restaurant_name}`,
      `Ciclo: ${payload.ciclo_id}\nErro: ${String(err)}`,
      'error'
    )
    return NextResponse.json({ error: String(err) }, { status: 502 })
  }
}
