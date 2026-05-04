'use client'

import { cn, formatDate, formatEuro } from '@/lib/utils'
import type { BillingCycle } from '@/types'

interface BillingCyclesTableProps {
  cycles: BillingCycle[]
}

const paymentBadge: Record<string, string> = {
  pendente:  'bg-slate-100 text-slate-500 border-slate-200',
  pago:      'bg-green-50 text-green-700 border-green-200',
  em_atraso: 'bg-red-50 text-red-700 border-red-200',
}
const paymentLabel: Record<string, string> = {
  pendente: 'Pendente', pago: 'Pago', em_atraso: 'Em Atraso',
}
const cycleStateBadge: Record<string, string> = {
  ativo:     'bg-blue-50 text-blue-700 border-blue-200',
  concluido: 'bg-slate-100 text-slate-500 border-slate-200',
  cancelado: 'bg-red-50 text-red-600 border-red-200',
  pausado:   'bg-amber-50 text-amber-600 border-amber-200',
}
const cycleStateLabel: Record<string, string> = {
  ativo: 'Activo', concluido: 'Concluído', cancelado: 'Cancelado', pausado: 'Pausado',
}

export function BillingCyclesTable({ cycles }: BillingCyclesTableProps) {
  if (cycles.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-lg py-10 text-center text-slate-400 text-sm">
        Sem ciclos de faturação
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/60">
              {['Ciclo', 'Período', 'Estado', 'Dias Paus.', 'Pessoas', 'Valor', 'Pagamento', 'Isento', 'Fatura AT'].map(h => (
                <th key={h} className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cycles.map(cycle => {
              const totalPessoas = cycle.total_pessoas_reservas + cycle.total_pessoas_ultima_hora
              return (
                <tr key={cycle.id} className="border-b border-slate-50 hover:bg-slate-50/60 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">
                    {cycle.numero_ciclo === 0 ? 'G' : cycle.numero_ciclo}
                  </td>
                  <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                    {formatDate(cycle.data_inicio)} → {formatDate(cycle.data_fim_real ?? cycle.data_fim_prevista)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', cycleStateBadge[cycle.estado])}>
                      {cycleStateLabel[cycle.estado]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-500">
                    {cycle.dias_pausados > 0 ? `${cycle.dias_pausados}d` : '—'}
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {totalPessoas > 0 ? totalPessoas : '—'}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {formatEuro(cycle.valor_total)}
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', paymentBadge[cycle.estado_pagamento])}>
                      {paymentLabel[cycle.estado_pagamento]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {cycle.isento_faturacao ? (
                      <span className="text-xs text-green-600">✓ Isento</span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-500 font-mono text-xs">
                    {cycle.numero_fatura_at ?? <span className="text-slate-300">—</span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
