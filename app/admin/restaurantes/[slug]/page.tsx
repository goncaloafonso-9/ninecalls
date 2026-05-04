import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { formatDate, formatEuro } from '@/lib/utils'
import { RestaurantActions } from '@/components/admin/restaurant-actions'
import { GuaranteeWidget } from '@/components/admin/guarantee-widget'
import { AgentsManager } from '@/components/admin/agents-manager'
import { BillingCyclesTable } from '@/components/admin/billing-cycles-table'
import { RestaurantForm } from '@/components/admin/restaurant-form'
import type { Restaurant, Agent, BillingCycle } from '@/types'
import { CreditCard } from 'lucide-react'

export default async function RestaurantGeralPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || user.app_metadata?.role !== 'admin') redirect('/login')

  const db = createAdminClient()

  // First fetch restaurant (need ID for subsequent queries)
  const { data: restaurantData } = await db
    .from('restaurants')
    .select('*, clients(id, nome_empresa, stripe_customer_id)')
    .eq('slug', slug)
    .single()

  if (!restaurantData) notFound()

  const restaurant = restaurantData as Restaurant & {
    clients: { id: string; nome_empresa: string; stripe_customer_id: string | null }
  }

  // Parallel fetch of everything else
  const [agentsRes, cyclesRes, garantiaRes, conversoeRes] = await Promise.all([
    db
      .from('agents')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('criado_em', { ascending: true }),
    db
      .from('billing_cycles')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('numero_ciclo', { ascending: false }),
    db
      .from('v_guarantee_status')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle(),
    db
      .from('conversoes_manuais')
      .select('id, tipo, pessoas, motivo, criado_em')
      .eq('restaurant_id', restaurant.id)
      .order('criado_em', { ascending: false })
      .limit(20),
  ])

  const agents = (agentsRes.data ?? []) as Agent[]
  const cycles = (cyclesRes.data ?? []) as BillingCycle[]
  const garantia = garantiaRes.data

  const hasActiveAgent = agents.some(a => a.activo)
  const hasTransferPhone = !!restaurant.transfer_phone
  const hasDriveFolder = !!restaurant.google_drive_folder_id
  const hasObjetivo = restaurant.objetivo_garantia > 0

  const activeCycle = cycles.find(c => c.estado === 'ativo')

  const conversoes = (conversoeRes.data ?? []) as {
    id: string; tipo: 'adicionar' | 'remover'; pessoas: number; motivo: string; criado_em: string
  }[]

  return (
    <div className="p-6 space-y-6">
      {/* Action bar */}
      <div>
        <RestaurantActions
          restaurantId={restaurant.id}
          slug={restaurant.slug}
          estado={restaurant.estado}
          hasActiveAgent={hasActiveAgent}
          hasTransferPhone={hasTransferPhone}
          hasDriveFolder={hasDriveFolder}
          hasObjetivo={hasObjetivo}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Guarantee widget — only when em_garantia */}
          {restaurant.estado === 'em_garantia' && garantia && (
            <GuaranteeWidget
              restaurantId={restaurant.id}
              contagem_actual={garantia.contagem_actual}
              objetivo={garantia.objetivo}
              dia_efectivo={garantia.dia_efectivo}
              dias_restantes={garantia.dias_restantes}
              estado={garantia.estado}
              conversoes={conversoes}
            />
          )}

          {/* Restaurant form */}
          <RestaurantForm
            restaurant={restaurant}
            rescindido={restaurant.estado === 'rescindido'}
          />
        </div>

        {/* Right column (1/3) */}
        <div className="space-y-6">
          {/* Stripe widget */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <div className="flex items-center gap-2 mb-4">
              <CreditCard className="w-4 h-4 text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900">Stripe</h3>
            </div>
            {restaurant.clients.stripe_customer_id ? (
              <div className="space-y-3">
                <div>
                  <p className="text-xs text-slate-400 mb-0.5">Customer ID</p>
                  <p className="text-xs font-mono text-slate-700 break-all">{restaurant.clients.stripe_customer_id}</p>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-xs text-slate-600">Cliente Stripe configurado</span>
                </div>
                <button className="w-full text-xs bg-slate-900 text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors">
                  Gerar Link Portal Stripe
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                  <span className="text-xs text-slate-500">Sem customer Stripe</span>
                </div>
                <button className="w-full text-xs border border-slate-200 text-slate-700 px-3 py-2 rounded-md hover:bg-slate-50 transition-colors">
                  Criar Customer Stripe
                </button>
              </div>
            )}
          </div>

          {/* Active cycle summary */}
          {activeCycle && (
            <div className="bg-white border border-slate-200 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">
                Ciclo {activeCycle.numero_ciclo === 0 ? 'Garantia' : activeCycle.numero_ciclo}
              </h3>
              <div className="space-y-2.5 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Início</span>
                  <span className="text-slate-700">{formatDate(activeCycle.data_inicio)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fim previsto</span>
                  <span className="text-slate-700">{formatDate(activeCycle.data_fim_prevista)}</span>
                </div>
                {activeCycle.dias_pausados > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Dias pausados</span>
                    <span className="text-amber-600">{activeCycle.dias_pausados}d</span>
                  </div>
                )}
                <div className="border-t border-slate-100 pt-2.5">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Pessoas reservas</span>
                    <span className="text-slate-700">{activeCycle.total_pessoas_reservas}</span>
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-slate-500">Takeaways</span>
                    <span className="text-slate-700">{activeCycle.total_takeaways_confirmados}</span>
                  </div>
                </div>
                <div className="border-t border-slate-100 pt-2.5 flex justify-between">
                  <span className="text-slate-700 font-medium">Total acumulado</span>
                  <span className="font-semibold text-slate-900">{formatEuro(activeCycle.valor_total)}</span>
                </div>
                {activeCycle.isento_faturacao && (
                  <div className="text-xs text-green-600 bg-green-50 rounded-md px-2 py-1">Isento de faturação</div>
                )}
              </div>
            </div>
          )}

          {/* Quick stats */}
          <div className="bg-white border border-slate-200 rounded-lg p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">Configurações</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Comissão/pessoa</span>
                <span className="text-slate-700">{formatEuro(restaurant.comissao_por_pessoa)}</span>
              </div>
              {restaurant.tem_takeaway && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Taxa takeaway</span>
                  <span className="text-slate-700">{formatEuro(restaurant.taxa_takeaway)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-500">Objectivo garantia</span>
                <span className="text-slate-700">{restaurant.objetivo_garantia} px</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Compromisso</span>
                <span className="text-slate-700">{restaurant.periodo_compromisso_dias}d</span>
              </div>
              {restaurant.data_live && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Live desde</span>
                  <span className="text-slate-700">{formatDate(restaurant.data_live)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Agents */}
      <AgentsManager restaurantId={restaurant.id} agents={agents} />

      {/* Billing cycles */}
      <div>
        <h3 className="text-sm font-semibold text-slate-900 mb-3">Histórico de Ciclos</h3>
        <BillingCyclesTable cycles={cycles} />
      </div>
    </div>
  )
}
