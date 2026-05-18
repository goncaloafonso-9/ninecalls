import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const runtime = 'nodejs'

/**
 * POST /api/internal/ingest-call
 *
 * Called by n8n WF-DC-01 after a Telnyx call completes.
 * Inserts directamente em `calls`. Os triggers AFTER INSERT tratam do resto:
 *   - Trigger 5: INSERT em bookings         (se appointment_booked=true + booking_datetime ≠ null)
 *   - Trigger 6: INSERT em takeaway_orders  (se takeaway_order_placed=true + takeaway_pickup_time ≠ null)
 *   - Trigger 7: INSERT em ultima_hora_reqs (se ultima_hora_solicitada=true + ultima_hora_datetime ≠ null)
 *   - Trigger 8: UPDATE customers counters
 *   - Trigger 9: UPSERT daily_stats
 *   - Trigger 10: UPDATE guarantee_tracking.contagem_organica
 *
 * Os triggers BEFORE INSERT resolvem automaticamente:
 *   agent_id, restaurant_id, customer_id, billing_cycle_id
 *
 * Auth: Bearer token = N8N_INGEST_WEBHOOK_SECRET
 *
 * Mapeamento de campos (n8n → coluna DB):
 *   call_id_externo         → telnyx_call_id
 *   chamada_sucesso         → call_successful
 *   chamada_transferida     → call_transferred
 *   data_reserva+hora_reserva → booking_datetime (TIMESTAMPTZ)
 *   num_pessoas             → number_of_people
 *   notas_reserva           → special_requests
 *   items_json (JSONB)      → takeaway_items (TEXT serializado)
 *   hora_levantamento       → takeaway_pickup_time (combinado com data de hoje)
 */

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 })
}

export async function POST(request: Request) {
  // ── Auth ──────────────────────────────────────────────────────────────
  const secret = process.env.N8N_INGEST_WEBHOOK_SECRET
  if (!secret) return unauthorized()

  const authHeader = request.headers.get('authorization') ?? ''
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
  if (!token || token !== secret) return unauthorized()

  // ── Parse body ────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return badRequest('JSON inválido')
  }

  // ── Campos obrigatórios ───────────────────────────────────────────────
  const restaurantId = body.restaurant_id as string | undefined
  const tipoChamada  = body.tipo_chamada  as string | undefined

  if (!restaurantId) return badRequest('restaurant_id obrigatório')
  if (!tipoChamada)  return badRequest('tipo_chamada obrigatório')

  // ── booking_datetime: combina data_reserva + hora_reserva → TIMESTAMPTZ
  // Trigger 5 só cria booking se appointment_booked=true E booking_datetime ≠ null
  let bookingDatetime: string | null = null
  if (body.appointment_booked) {
    if (body.booking_datetime) {
      bookingDatetime = body.booking_datetime as string
    } else if (body.data_reserva && body.hora_reserva) {
      const hora = String(body.hora_reserva).slice(0, 5) // "19:30"
      bookingDatetime = `${body.data_reserva}T${hora}:00`
    }
  }

  // ── takeaway_pickup_time: combina hora com data de hoje se necessário
  // Trigger 6 só cria takeaway_order se takeaway_order_placed=true E takeaway_pickup_time ≠ null
  let takeawayPickupTime: string | null = null
  if (body.takeaway_order_placed) {
    if (body.takeaway_pickup_time) {
      takeawayPickupTime = body.takeaway_pickup_time as string
    } else if (body.hora_levantamento) {
      const hora = String(body.hora_levantamento).slice(0, 5) // "20:30"
      const hoje = new Date().toISOString().split('T')[0]
      takeawayPickupTime = `${hoje}T${hora}:00`
    }
  }

  // ── takeaway_items: serializa JSONB se necessário ─────────────────────
  let takeawayItems: string | null = null
  if (body.items_json !== undefined && body.items_json !== null) {
    takeawayItems = typeof body.items_json === 'string'
      ? body.items_json
      : JSON.stringify(body.items_json)
  } else if (body.takeaway_items) {
    takeawayItems = body.takeaway_items as string
  }

  // ── telnyx_call_id: NOT NULL na tabela calls ───────────────────────────
  // Aceita call_id_externo (nome legado n8n) ou telnyx_call_id (nome correcto)
  const telnyxCallId =
    (body.call_id_externo as string | undefined) ??
    (body.telnyx_call_id  as string | undefined) ??
    `nc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`

  // ── Build insert ──────────────────────────────────────────────────────
  const callInsert = {
    restaurant_id:          restaurantId,
    telnyx_call_id:         telnyxCallId,

    // Dados base
    caller_phone:           (body.caller_phone        as string)  ?? null,
    nome_cliente:           (body.nome_cliente         as string)  ?? null,
    contacto_cliente:       (body.contacto_cliente     as string)  ?? null,
    tipo_chamada:           tipoChamada,
    call_start_at:          (body.call_start_at        as string)  ?? null,
    call_end_at:            (body.call_end_at          as string)  ?? null,
    duration_seconds:       (body.duration_seconds     as number)  ?? null,
    transcript:             (body.transcript           as string)  ?? null,
    raw_payload:            body.raw_payload ?? null,

    // PCA (Post-Call Analysis)
    call_summary:           (body.call_summary                  as string)  ?? null,
    call_successful:        (body.chamada_sucesso               as boolean) ?? (body.call_successful    as boolean) ?? false,
    call_transferred:       (body.chamada_transferida           as boolean) ?? (body.call_transferred   as boolean) ?? false,
    motivo_transferencia:   (body.motivo_transferencia          as string)  ?? null,
    razao_insucesso:        (body.razao_insucesso               as string)  ?? null,
    numero_slots_tentados:  (body.numero_slots_tentados         as number)  ?? 0,
    lingua_detectada:       (body.lingua_detectada              as string)  ?? null,
    user_sentiment:         (body.user_sentiment                as string)  ?? null,

    // Reserva — Trigger 5 cria booking automaticamente
    appointment_booked:     (body.appointment_booked            as boolean) ?? false,
    booking_datetime:       bookingDatetime,
    number_of_people:       (body.num_pessoas                   as number)  ?? (body.number_of_people  as number)  ?? null,
    espaco_preferido:       (body.espaco_preferido              as string)  ?? null,
    servico:                (body.servico                       as string)  ?? null,
    special_requests:       (body.notas_reserva                 as string)  ?? (body.special_requests  as string)  ?? null,
    reserva_id_verdadeira:  (body.reserva_id_verdadeira         as string)  ?? null,

    // Takeaway — Trigger 6 cria takeaway_order automaticamente
    takeaway_order_placed:  (body.takeaway_order_placed         as boolean) ?? false,
    takeaway_pickup_time:   takeawayPickupTime,
    takeaway_items:         takeawayItems,
    takeaway_pessoas:       (body.takeaway_pessoas              as number)  ?? (body.num_pessoas        as number)  ?? null,

    // Última hora — Trigger 7 cria ultima_hora_request automaticamente
    ultima_hora_solicitada: (body.ultima_hora_solicitada        as boolean) ?? false,
    ultima_hora_datetime:   (body.ultima_hora_datetime          as string)  ?? null,
    ultima_hora_pessoas:    (body.ultima_hora_pessoas           as number)  ?? null,
    ultima_hora_espaco:     (body.ultima_hora_espaco            as string)  ?? null,
  }

  // ── Insert ────────────────────────────────────────────────────────────
  const db = createAdminClient()

  const { data, error } = await db
    .from('calls')
    .insert(callInsert)
    .select('id')
    .single()

  if (error) {
    console.error('[ingest-call] insert error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, call_id: data.id })
}
