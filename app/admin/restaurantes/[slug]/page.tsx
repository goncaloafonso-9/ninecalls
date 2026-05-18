import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'

export const dynamic = 'force-dynamic'
import { formatDate, formatEuro } from '@/lib/utils'
import { RestaurantActions } from '@/components/admin/restaurant-actions'
import { GuaranteeWidget } from '@/components/admin/guarantee-widget'
import { AgentsManager } from '@/components/admin/agents-manager'
import { BillingCyclesTable } from '@/components/admin/billing-cycles-table'
import { RestaurantForm } from '@/components/admin/restaurant-form'
import { DeleteRestaurantButton } from '@/components/admin/delete-restaurant-button'
import { SlackChannelCard } from '@/components/admin/slack-channel-card'
import type { Restaurant, Agent, BillingCycle } from '@/types'
import { CreditCard, TrendingDown } from 'lucide-react'
import { CopyIdButton } from '@/components/admin/copy-id-button'

const cardStyle: React.CSSProperties = {
  background: 'var(--surface-1)',
  border: '1px solid var(--surface-border)',
  borderRadius: '16px',
  padding: '20px',
}

const cardTitleStyle: React.CSSProperties = {
  fontSize: '13px',
  fontWeight: 600,
  color: 'var(--text-primary)',
  margin: '0 0 16px',
}

const rowStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '13px',
}

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

  const { data: restaurantData } = await db
    .from('restaurants')
    .select('*, clients(id, nome_empresa, stripe_customer_id)')
    .eq('slug', slug)
    .single()

  if (!restaurantData) notFound()

  const restaurant = restaurantData as Restaurant & {
    clients: { id: string; nome_empresa: string; stripe_customer_id: string | null }
  }

  const [agentsRes, cyclesRes, garantiaRes, conversoeRes, custosRes] = await Promise.all([
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
    db
      .from('v_admin_custos')
      .select('total_minutos, custo_total_eur, minutos_preconstrucao, custo_preconstrucao_eur, minutos_ciclos_activos, custo_ciclos_activos_eur, total_chamadas_ativas')
      .eq('restaurant_id', restaurant.id)
      .maybeSingle(),
  ])

  const agents = (agentsRes.data ?? []) as Agent[]
  const cycles = (cyclesRes.data ?? []) as BillingCycle[]
  const garantia = garantiaRes.data

  const hasActiveAgent = agents.some(a => a.activo)
  const hasTransferPhone = !!restaurant.transfer_phone
  const hasDriveFolder = !!restaurant.google_drive_folder_link
  const hasObjetivo = restaurant.objetivo_garantia > 0

  const activeCycle = cycles.find(c => c.estado === 'ativo')

  const conversoes = (conversoeRes.data ?? []) as {
    id: string; tipo: 'adicionar' | 'remover'; pessoas: number; motivo: string; criado_em: string
  }[]
  const custos = custosRes.data

  return (
    <div
      style={{
        padding: 'var(--page-padding-y) var(--page-padding-x)',
        display: 'flex',
        flexDirection: 'column',
        gap: '24px',
      }}
    >
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div>
          <h1
            style={{
              fontSize: '1.5rem',
              fontWeight: 600,
              color: 'var(--text-primary)',
              letterSpacing: '-0.025em',
              margin: '0 0 6px',
            }}
          >
            {restaurant.nome}
          </h1>
          <CopyIdButton id={restaurant.id} />
        </div>
      </div>

      {/* Action bar */}
      <RestaurantActions
        restaurantId={restaurant.id}
        slug={restaurant.slug}
        estado={restaurant.estado}
        hasActiveAgent={hasActiveAgent}
        hasTransferPhone={hasTransferPhone}
        hasDriveFolder={hasDriveFolder}
        hasObjetivo={hasObjetivo}
        temGarantia={restaurant.tem_garantia}
      />

      {/* Main grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 320px',
          gap: '24px',
          alignItems: 'start',
        }}
      >
        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <RestaurantForm
            restaurant={restaurant}
            rescindido={restaurant.estado === 'rescindido'}
          />
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Slack */}
          <SlackChannelCard
            restaurantId={restaurant.id}
            restaurantSlug={restaurant.slug}
            slackChannelId={restaurant.slack_channel_id ?? null}
            slackChannelName={restaurant.slack_channel_name ?? null}
          />

          {/* Stripe */}
          <div style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <CreditCard style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <h3 style={{ ...cardTitleStyle, margin: 0 }}>Stripe</h3>
            </div>
            {restaurant.clients.stripe_customer_id ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', margin: '0 0 4px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Customer ID
                  </p>
                  <p
                    style={{
                      fontSize: '11px',
                      fontFamily: 'var(--font-geist-mono), monospace',
                      color: 'var(--text-secondary)',
                      margin: 0,
                      wordBreak: 'break-all',
                    }}
                  >
                    {restaurant.clients.stripe_customer_id}
                  </p>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--green-500)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>Cliente Stripe configurado</span>
                </div>
                <button
                  className="nc-btn-dark"
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'var(--gray-950)',
                    color: '#ffffff',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-geist), sans-serif',
                  }}
                >
                  Gerar Link Portal Stripe
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--surface-border)' }} />
                  <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Sem customer Stripe</span>
                </div>
                <button
                  className="nc-btn-ghost"
                  style={{
                    width: '100%',
                    fontSize: '12px',
                    fontWeight: 500,
                    background: 'transparent',
                    color: 'var(--text-secondary)',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    fontFamily: 'var(--font-geist), sans-serif',
                  }}
                >
                  Criar Customer Stripe
                </button>
              </div>
            )}
          </div>

          {/* Active cycle */}
          {activeCycle && (
            <div style={cardStyle}>
              <h3 style={cardTitleStyle}>
                Ciclo {activeCycle.numero_ciclo === 0 ? 'Garantia' : activeCycle.numero_ciclo}
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>Início</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatDate(activeCycle.data_inicio)}</span>
                </div>
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>Fim previsto</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatDate(activeCycle.data_fim_prevista)}</span>
                </div>
                {activeCycle.dias_pausados > 0 && (
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>Dias pausados</span>
                    <span style={{ color: '#b45309', fontWeight: 500 }}>{activeCycle.dias_pausados}d</span>
                  </div>
                )}
                <div
                  style={{
                    borderTop: '1px solid var(--surface-border)',
                    paddingTop: '10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                  }}
                >
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>Pessoas reservas</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{activeCycle.total_pessoas_reservas}</span>
                  </div>
                  <div style={rowStyle}>
                    <span style={{ color: 'var(--text-muted)' }}>Takeaways</span>
                    <span style={{ color: 'var(--text-secondary)' }}>{activeCycle.total_takeaways_confirmados}</span>
                  </div>
                </div>
                <div
                  style={{
                    borderTop: '1px solid var(--surface-border)',
                    paddingTop: '10px',
                    ...rowStyle,
                  }}
                >
                  <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>Total acumulado</span>
                  <span
                    style={{
                      fontWeight: 600,
                      color: 'var(--text-primary)',
                      fontFamily: 'var(--font-geist-mono), monospace',
                    }}
                  >
                    {formatEuro(activeCycle.valor_total)}
                  </span>
                </div>
                {activeCycle.isento_faturacao && (
                  <div
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: 'var(--green-700)',
                      background: 'var(--green-50)',
                      borderRadius: '6px',
                      padding: '4px 8px',
                    }}
                  >
                    Isento de faturação
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custo AI — apenas admin, nunca exposto ao cliente */}
          <div style={{ ...cardStyle, borderColor: 'var(--surface-border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <TrendingDown style={{ width: '14px', height: '14px', color: 'var(--text-muted)' }} />
              <h3 style={{ ...cardTitleStyle, margin: 0 }}>Custo AI (admin)</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={rowStyle}>
                <span style={{ color: 'var(--text-muted)' }}>Total minutos</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  {Number(custos?.total_minutos ?? 0).toFixed(1)} min
                </span>
              </div>
              {Number(custos?.minutos_preconstrucao ?? 0) > 0 && (
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>  ↳ Pré-activação</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                    {Number(custos?.minutos_preconstrucao ?? 0).toFixed(1)} min
                  </span>
                </div>
              )}
              {Number(custos?.minutos_ciclos_activos ?? 0) > 0 && (
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>  ↳ Ciclos activos</span>
                  <span style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-geist-mono), monospace', fontSize: '12px' }}>
                    {Number(custos?.minutos_ciclos_activos ?? 0).toFixed(1)} min
                  </span>
                </div>
              )}
              <div
                style={{
                  borderTop: '1px solid var(--surface-border)',
                  paddingTop: '10px',
                  ...rowStyle,
                }}
              >
                <span style={{ color: 'var(--text-primary)', fontWeight: 600 }}>Custo total</span>
                <span
                  style={{
                    fontWeight: 700,
                    color: '#b91c1c',
                    fontFamily: 'var(--font-geist-mono), monospace',
                    fontSize: '15px',
                  }}
                >
                  {formatEuro(Number(custos?.custo_total_eur ?? 0))}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                0,14 €/min · {custos?.total_chamadas_ativas ?? 0} chamadas
              </div>
            </div>
          </div>

          {/* Configurações */}
          <div style={cardStyle}>
            <h3 style={cardTitleStyle}>Configurações</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={rowStyle}>
                <span style={{ color: 'var(--text-muted)' }}>Comissão/pessoa</span>
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                  {formatEuro(restaurant.comissao_por_pessoa)}
                </span>
              </div>
              {restaurant.tem_takeaway && (
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>Taxa takeaway</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    {formatEuro(restaurant.taxa_takeaway)}
                  </span>
                </div>
              )}
              {restaurant.taxa_mensal_fixa > 0 && (
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>Mensalidade</span>
                  <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-geist-mono), monospace' }}>
                    {formatEuro(restaurant.taxa_mensal_fixa)}/mês
                  </span>
                </div>
              )}
              <div style={rowStyle}>
                <span style={{ color: 'var(--text-muted)' }}>Objectivo garantia</span>
                <span style={{ color: 'var(--text-secondary)' }}>{restaurant.objetivo_garantia} px</span>
              </div>
              <div style={rowStyle}>
                <span style={{ color: 'var(--text-muted)' }}>Compromisso</span>
                <span style={{ color: 'var(--text-secondary)' }}>{restaurant.periodo_compromisso_dias}d</span>
              </div>
              {restaurant.data_live && (
                <div style={rowStyle}>
                  <span style={{ color: 'var(--text-muted)' }}>Live desde</span>
                  <span style={{ color: 'var(--text-secondary)' }}>{formatDate(restaurant.data_live)}</span>
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
        <h3
          style={{
            fontSize: '13px',
            fontWeight: 600,
            color: 'var(--text-primary)',
            margin: '0 0 12px',
          }}
        >
          Histórico de Ciclos
        </h3>
        <BillingCyclesTable cycles={cycles} />
      </div>

      {/* Danger zone */}
      {restaurant.estado === 'rescindido' && (
        <div
          style={{
            borderTop: '1px solid var(--surface-border)',
            paddingTop: '24px',
          }}
        >
          <h3
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              margin: '0 0 12px',
            }}
          >
            Zona de Perigo
          </h3>
          <DeleteRestaurantButton
            restaurantId={restaurant.id}
            restaurantName={restaurant.nome}
            clientId={restaurant.clients.id}
          />
        </div>
      )}
    </div>
  )
}
