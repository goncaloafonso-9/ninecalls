export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ConfirmActions } from '@/components/confirm/confirm-actions'
import { ShoppingBag, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ uuid: string }>
}

function formatDatetimePT(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

function formatTimePT(date: Date): string {
  return new Intl.DateTimeFormat('pt-PT', {
    timeZone: 'Europe/Lisbon',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
}

export default async function ConfirmTakeawayPage({ params }: Props) {
  const { uuid } = await params

  const supabase = createAdminClient()

  const { data: order } = await supabase
    .from('takeaway_orders')
    .select('id, estado, pickup_time, items, pessoas, expira_em, cliente_nome, cliente_phone, criado_em, restaurants(nome)')
    .eq('id', uuid)
    .single()

  if (!order) notFound()

  const now = new Date()
  const expirado = order.expira_em ? now > new Date(order.expira_em) : true
  const jaRespondido = order.estado !== 'pendente_restaurante'
  const restaurantName = Array.isArray(order.restaurants)
    ? order.restaurants[0]?.nome
    : (order.restaurants as { nome?: string } | null)?.nome

  if (jaRespondido) {
    const confirmado = order.estado === 'confirmado'
    return (
      <PageShell restaurantName={restaurantName}>
        <div className="text-center">
          <div className={`w-16 h-16 rounded-2xl ${confirmado ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-5`}>
            {confirmado
              ? <CheckCircle className="w-8 h-8 text-emerald-600" />
              : <XCircle className="w-8 h-8 text-slate-400" />
            }
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {confirmado ? 'Pedido confirmado' : 'Pedido rejeitado'}
          </h1>
          <p className="text-slate-500 text-sm">Este pedido já foi respondido.</p>
        </div>
      </PageShell>
    )
  }

  if (expirado) {
    return (
      <PageShell restaurantName={restaurantName}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-amber-50 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="w-8 h-8 text-amber-500" />
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">Pedido expirado</h1>
          <p className="text-slate-500 text-sm">
            Este link expirou (validade: 4 horas após o pedido).
          </p>
        </div>
      </PageShell>
    )
  }

  const pickup = order.pickup_time ? new Date(order.pickup_time) : null

  return (
    <PageShell restaurantName={restaurantName}>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pedido de Takeaway</h1>
            <p className="text-slate-500 text-sm">Confirme ou rejeite este pedido</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
          <DetailRow label="Cliente" value={order.cliente_nome ?? order.cliente_phone ?? '—'} />
          {pickup && (
            <DetailRow label="Levantamento" value={formatDatetimePT(pickup)} />
          )}
          {order.pessoas && (
            <DetailRow label="Pessoas" value={String(order.pessoas)} />
          )}
          {order.items && (
            <DetailRow label="Itens" value={order.items} />
          )}
        </div>

        {order.expira_em && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Expira às {formatTimePT(new Date(order.expira_em))}</span>
          </div>
        )}

        <ConfirmActions uuid={uuid} type="takeaway" />
      </div>
    </PageShell>
  )
}

function PageShell({ restaurantName, children }: { restaurantName?: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-1">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <ShoppingBag className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Nine Calls</span>
        </div>
        {restaurantName
          ? <p className="text-xs text-slate-400 mb-7 ml-9">{restaurantName}</p>
          : <div className="mb-7" />
        }
        {children}
      </div>
    </div>
  )
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-sm text-slate-500 shrink-0">{label}</span>
      <span className="text-sm text-slate-900 font-medium text-right">{value}</span>
    </div>
  )
}
