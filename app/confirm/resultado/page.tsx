import { CheckCircle, XCircle } from 'lucide-react'

interface Props {
  searchParams: Promise<{ type?: string; action?: string }>
}

export default async function ResultadoPage({ searchParams }: Props) {
  const { type = 'takeaway', action = 'confirmar' } = await searchParams

  const isAccept = action === 'confirmar'
  const typeLabel = type === 'ultima-hora' ? 'pedido de última hora' : 'pedido de takeaway'
  const actionLabel = isAccept
    ? (type === 'ultima-hora' ? 'aceite' : 'confirmado')
    : 'rejeitado'

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-slate-100 p-8 text-center">
        <div className={`w-16 h-16 rounded-2xl ${isAccept ? 'bg-emerald-100' : 'bg-slate-100'} flex items-center justify-center mx-auto mb-5`}>
          {isAccept
            ? <CheckCircle className="w-8 h-8 text-emerald-600" />
            : <XCircle className="w-8 h-8 text-slate-400" />
          }
        </div>
        <h1 className="text-xl font-bold text-slate-900 mb-2 capitalize">
          {isAccept ? 'Obrigado!' : 'Pedido rejeitado'}
        </h1>
        <p className="text-slate-500 text-sm leading-relaxed">
          O {typeLabel} foi <strong>{actionLabel}</strong>.
          {isAccept && ' O cliente será notificado.'}
        </p>
        <p className="text-xs text-slate-400 mt-6">Pode fechar esta janela.</p>
      </div>
    </div>
  )
}
