import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatEuro, formatDate } from '@/lib/utils'
import { Euro, AlertCircle } from 'lucide-react'
import { RegistarFaturaButton } from '@/components/admin/registar-fatura-button'

export default async function FinanceiroPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  const [faturasPendentes, emAtraso] = await Promise.all([
    db
      .from('billing_cycles')
      .select('*, restaurants(nome, slug, client_id, clients(nome_empresa))')
      .eq('estado_pagamento', 'pago')
      .is('numero_fatura_at', null)
      .not('isento_faturacao', 'eq', true)
      .order('data_fim_real', { ascending: true }),
    db
      .from('billing_cycles')
      .select('*, restaurants(nome, slug, client_id, clients(nome_empresa))')
      .eq('estado_pagamento', 'em_atraso')
      .order('data_fim_real', { ascending: true }),
  ])

  const pendentes = faturasPendentes.data ?? []
  const atraso = emAtraso.data ?? []

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-xl font-semibold text-slate-900">Financeiro</h1>
        <p className="text-sm text-slate-500 mt-0.5">Facturas AT pendentes e pagamentos em atraso</p>
      </div>

      {/* Facturas AT pendentes */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Euro className="w-4 h-4 text-slate-500" />
          <h2 className="text-sm font-semibold text-slate-900">Facturas AT por Registar</h2>
          {pendentes.length > 0 && (
            <span className="bg-amber-100 text-amber-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {pendentes.length}
            </span>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {pendentes.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Todas as facturas estão registadas ✓</div>
          ) : (
            pendentes.map((cycle: Record<string, unknown>) => {
              const rest = cycle.restaurants as Record<string, unknown>
              const client = rest?.clients as Record<string, unknown>
              return (
                <div key={cycle.id as string} className="flex items-center justify-between px-5 py-3.5">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{rest?.nome as string}</p>
                    <p className="text-xs text-slate-400">
                      {client?.nome_empresa as string} · Ciclo {cycle.numero_ciclo as number} · {formatDate(cycle.data_fim_real as string)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-900">{formatEuro(cycle.valor_total as number)}</span>
                    <RegistarFaturaButton
                      cycleId={cycle.id as string}
                      restauranteNome={rest?.nome as string}
                    />
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>

      {/* Pagamentos em atraso */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <AlertCircle className="w-4 h-4 text-red-500" />
          <h2 className="text-sm font-semibold text-slate-900">Pagamentos em Atraso</h2>
          {atraso.length > 0 && (
            <span className="bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
              {atraso.length}
            </span>
          )}
        </div>
        <div className="bg-white rounded-lg border border-slate-200 divide-y divide-slate-100">
          {atraso.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-sm">Nenhum pagamento em atraso ✓</div>
          ) : (
            atraso.map((cycle: Record<string, unknown>) => {
              const rest = cycle.restaurants as Record<string, unknown>
              const client = rest?.clients as Record<string, unknown>
              return (
                <div key={cycle.id as string} className="flex items-center justify-between px-5 py-3.5 bg-red-50/30">
                  <div>
                    <p className="text-sm font-medium text-slate-900">{rest?.nome as string}</p>
                    <p className="text-xs text-slate-400">
                      {client?.nome_empresa as string} · Ciclo {cycle.numero_ciclo as number} · {formatDate(cycle.data_fim_real as string)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-red-600">{formatEuro(cycle.valor_total as number)}</span>
                    <button className="text-xs bg-red-600 text-white px-3 py-1.5 rounded-md hover:bg-red-700 transition-colors">
                      Reenviar Portal Stripe
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </section>
    </div>
  )
}
