import { createAdminClient } from '@/lib/supabase/admin'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { pt } from 'date-fns/locale'
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

export default async function ConfirmUltimaHoraPage({ params }: Props) {
  const { uuid } = await params

  const supabase = createAdminClient()

  const { data: pedido } = await supabase
    .from('ultima_hora_requests')
    .select('id, estado, datetime_solicitado, pessoas, espaco_preferido, expira_em, cliente_nome, cliente_phone, criado_em')
    .eq('id', uuid)
    .single()

  if (!pedido) notFound()

  const now = new Date()
  const expirado = pedido.expira_em ? now > new Date(pedido.expira_em) : true
  const jaRespondido = pedido.estado !== 'pendente_restaurante'

  if (jaRespondido) {
    const aceite = pedido.estado === 'aceite'
    return (
      <PageShell>
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
          <p className="text-slate-500 text-sm">
            Este pedido já foi respondido.
          </p>
        </div>
      </PageShell>
    )
  }

  if (expirado) {
    return (
      <PageShell>
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

  const dt = pedido.datetime_solicitado ? new Date(pedido.datetime_solicitado) : null

  return (
    <PageShell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Pedido de Última Hora</h1>
            <p className="text-slate-500 text-sm">Aceite ou rejeite este pedido</p>
          </div>
        </div>

        {/* Details */}
        <div className="bg-slate-50 rounded-2xl p-5 space-y-3">
          <DetailRow label="Cliente" value={pedido.cliente_nome ?? pedido.cliente_phone ?? '—'} />
          {dt && (
            <DetailRow
              label="Para quando"
              value={format(dt, "d 'de' MMMM 'às' HH:mm", { locale: pt })}
            />
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

        {/* Expiry */}
        {pedido.expira_em && (
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Clock className="w-3.5 h-3.5" />
            <span>
              Expira às {format(new Date(pedido.expira_em), 'HH:mm', { locale: pt })}
            </span>
          </div>
        )}

        {/* Actions */}
        <ConfirmActions uuid={uuid} type="ultima-hora" />
      </div>
    </PageShell>
  )
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
        <div className="flex items-center gap-2 mb-8">
          <div className="w-7 h-7 bg-emerald-500 rounded-lg flex items-center justify-center">
            <Clock className="w-3.5 h-3.5 text-white" />
          </div>
          <span className="text-sm font-semibold text-slate-700">Nine Calls</span>
        </div>
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
