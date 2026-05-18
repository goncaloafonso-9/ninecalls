export const dynamic = 'force-dynamic'

import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { ConfirmActions } from '@/components/confirm/confirm-actions'
import { Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react'

interface Props {
  params: Promise<{ uuid: string }>
}

const ESPACO_LABELS: Record<string, string> = {
  sala:            'Sala',
  terraco:         'Terraço',
  esplanada:       'Esplanada',
  sem_preferencia: 'Sem preferência',
  desconhecido:    '—',
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

export default async function ConfirmUltimaHoraPage({ params }: Props) {
  const { uuid } = await params

  const supabase = createAdminClient()

  const { data: pedido } = await supabase
    .from('ultima_hora_requests')
    .select('id, estado, ultima_hora_datetime, pessoas, espaco_preferido, expira_em, cliente_nome, cliente_phone, criado_em, restaurants(nome)')
    .eq('id', uuid)
    .single()

  if (!pedido) notFound()

  const now = new Date()
  const expirado = pedido.expira_em ? now > new Date(pedido.expira_em) : true
  const jaRespondido = pedido.estado !== 'pendente_restaurante'
  const restaurantName = Array.isArray(pedido.restaurants)
    ? pedido.restaurants[0]?.nome
    : (pedido.restaurants as { nome?: string } | null)?.nome

  if (jaRespondido) {
    if (pedido.estado === 'nao_aplicavel') {
      return (
        <PageShell restaurantName={restaurantName}>
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-5">
              <XCircle className="w-8 h-8 text-slate-400" />
            </div>
            <h1 className="text-xl font-bold text-slate-900 mb-2">Confirmação não disponível</h1>
            <p className="text-slate-500 text-sm">
              Este restaurante não disponibiliza confirmação de pedidos de última hora.
            </p>
          </div>
        </PageShell>
      )
    }

    const aceite = pedido.estado === 'aceite'
    return (
      <PageShell restaurantName={restaurantName}>
        <div className="text-center">
          <div className={`w-16 h-16 rounded-2xl ${aceite ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-5`}>
            {aceite
              ? <CheckCircle className="w-8 h-8 text-emerald-600" />
              : <XCircle className="w-8 h-8 text-slate-400" />
            }
          </div>
          <h1 className="text-xl font-bold text-slate-900 mb-2">
            {aceite ? 'Pedido aceite' : 'Pedido rejeitado'}
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

  const dt = pedido.ultima_hora_datetime ? new Date(pedido.ultima_hora_datetime) : null

  return (
    <PageShell restaurantName={restaurantName}>
      <div className="space-y-6">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pedido de Última Hora</h1>
            <p className="text-slate-500 text-sm">Aceite ou rejeite este pedido</p>
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
          <DetailRow label="Cliente" value={pedido.cliente_nome ?? pedido.cliente_phone ?? '—'} />
          {dt && (
            <DetailRow label="Para quando" value={formatDatetimePT(dt)} />
          )}
          {pedido.pessoas && (
            <DetailRow label="Pessoas" value={String(pedido.pessoas)} />
          )}
          {pedido.espaco_preferido && (
            <DetailRow
              label="Espaço"
              value={ESPACO_LABELS[pedido.espaco_preferido] ?? pedido.espaco_preferido}
            />
          )}
        </div>

        {pedido.expira_em && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>Expira às {formatTimePT(new Date(pedido.expira_em))}</span>
          </div>
        )}

        <ConfirmActions uuid={uuid} type="ultima-hora" />
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
            <Clock className="w-3.5 h-3.5 text-white" />
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
