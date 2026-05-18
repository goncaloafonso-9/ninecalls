import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { validateCronRequest } from '@/lib/cron-auth'
import { z } from 'zod'

export const runtime = 'nodejs'

// POST /api/internal/atualizar-estado-booking
// Chamado pelo workflow n8n de verificação diária de reservas.
//
// Campos reais na tabela bookings:
//   checked              BOOLEAN DEFAULT FALSE  — se a reserva já foi verificada
//   checked_at           TIMESTAMPTZ            — quando foi verificada
//   check_resultado      TEXT                   — resultado da verificação
//   reserva_id_verdadeira TEXT                  — ID no software externo (Zenchef/TheFork)
//
// Valores possíveis de check_resultado enviados pelo n8n:
//   'confirmed'  — reserva confirmada no software externo (sem mudança de estado)
//   'no_show'    — cliente não apareceu → UPDATE estado=no_show → Trigger 12 reverte faturação
//   'cancelado'  — cancelado no software externo → UPDATE estado=cancelado → Trigger 12 reverte
//   'sem_id'     — reserva_id_verdadeira é NULL → não é possível verificar (marcar como checked)
//
// Nota: 'api_error' NÃO é enviado aqui — o n8n trata falhas de API
// deixando checked=FALSE e check_resultado='api_error' directamente via
// Supabase REST API (PATCH /rest/v1/bookings?id=eq.{uuid}).
// Apenas resultados que exigem lógica de negócio chegam a este endpoint.
//
// Auth: Bearer CRON_JOBS
//
// Body: {
//   updates: [
//     {
//       booking_id: "uuid",
//       resultado: "confirmed" | "no_show" | "cancelado" | "sem_id"
//     }
//   ]
// }

const UpdateSchema = z.object({
  updates: z.array(
    z.object({
      booking_id: z.string().uuid(),
      resultado: z.enum(['confirmed', 'no_show', 'cancelado', 'sem_id']),
    })
  ).min(1).max(200),
})

export async function POST(request: Request) {
  if (!validateCronRequest(request)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Body inválido' }, { status: 400 })
  }

  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validação falhou', details: parsed.error.flatten() },
      { status: 422 }
    )
  }

  const { updates } = parsed.data
  const db = createAdminClient()
  const agora = new Date().toISOString()

  const processados: { booking_id: string; resultado: string }[] = []
  const erros: { booking_id: string; erro: string }[] = []

  for (const update of updates) {
    const { booking_id, resultado } = update

    // Fetch booking — verificar que existe e ainda não foi checked
    const { data: booking, error: fetchErr } = await db
      .from('bookings')
      .select('id, estado, restaurant_id, billing_cycle_id, number_of_people, checked')
      .eq('id', booking_id)
      .single()

    if (fetchErr || !booking) {
      erros.push({ booking_id, erro: 'Booking não encontrado' })
      continue
    }

    if (booking.checked) {
      // Já foi processado — ignorar silenciosamente (idempotente)
      processados.push({ booking_id, resultado: 'already_checked' })
      continue
    }

    // -----------------------------------------------------------------
    // Caso 1: confirmed ou sem_id — marcar como verificado sem mudar estado
    // -----------------------------------------------------------------
    if (resultado === 'confirmed' || resultado === 'sem_id') {
      const { error: updateErr } = await db
        .from('bookings')
        .update({
          checked: true,
          checked_at: agora,
          check_resultado: resultado,
        })
        .eq('id', booking_id)

      if (updateErr) {
        erros.push({ booking_id, erro: updateErr.message })
        continue
      }

      processados.push({ booking_id, resultado })
      continue
    }

    // -----------------------------------------------------------------
    // Caso 2: no_show ou cancelado — só actuar se booking está confirmada
    // Se já está em outro estado, só marcar como checked (idempotente)
    // -----------------------------------------------------------------
    if (booking.estado !== 'confirmada') {
      // Booking já foi modificado anteriormente — apenas marcar checked
      await db
        .from('bookings')
        .update({
          checked: true,
          checked_at: agora,
          check_resultado: resultado,
        })
        .eq('id', booking_id)

      processados.push({ booking_id, resultado: `already_${booking.estado}` })
      continue
    }

    // Actualizar estado — Trigger 12 (BEFORE UPDATE) reverte automaticamente
    // faturação e garantia para confirmada → no_show e confirmada → cancelado
    const { error: updateErr } = await db
      .from('bookings')
      .update({
        estado: resultado, // 'no_show' | 'cancelado'
        checked: true,
        checked_at: agora,
        check_resultado: resultado,
      })
      .eq('id', booking_id)

    if (updateErr) {
      erros.push({ booking_id, erro: updateErr.message })
      continue
    }

    // Audit log
    await db.from('audit_log').insert({
      acao: `booking_${resultado}_verificacao_n8n`,
      entidade_tipo: 'booking',
      entidade_id: booking_id,
      detalhes: {
        restaurant_id: booking.restaurant_id,
        billing_cycle_id: booking.billing_cycle_id,
        number_of_people: booking.number_of_people,
        estado_anterior: 'confirmada',
        novo_estado: resultado,
        verificado_em: agora,
      },
    })

    processados.push({ booking_id, resultado })
  }

  return NextResponse.json({
    ok: true,
    processados: processados.length,
    erros: erros.length > 0 ? erros : undefined,
    detalhes: processados,
  })
}
