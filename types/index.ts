// Nine Calls — Domain Types

export type RestaurantEstado =
  | 'em_construcao'
  | 'em_garantia'
  | 'ativo'
  | 'pausado'
  | 'rescindido'

export type CycleStatus = 'ativo' | 'concluido' | 'cancelado' | 'pausado'
export type PaymentStatus = 'pendente' | 'pago' | 'em_atraso' | 'isento'
export type GuaranteeEstado = 'em_curso' | 'cumprido' | 'nao_cumprido_30_dias' | 'cancelado'
export type BookingEstado = 'confirmada' | 'no_show' | 'cancelado'
export type TakeawayEstado = 'pendente_restaurante' | 'confirmado' | 'rejeitado'
export type UltimaHoraEstado = 'pendente_restaurante' | 'aceite' | 'rejeitado' | 'nao_aplicavel'
export type CallTipo = 'agendamento' | 'reagendamento' | 'cancelamento' | 'takeaway' | 'ultima_hora' | 'apoio' | 'transferencia' | 'spam_hangup'
export type CallLingua = 'pt' | 'en'
export type SoftwareReservasTipo = 'zenchef' | 'thefork' | 'outro' | 'nenhum'
export type ConversaoManualTipo = 'adicionar' | 'remover'
// espaco_tipo was a DB ENUM — now TEXT. Keep as string for compatibility.
export type EspacoTipo = string
export type ServicoTipo = 'almoco' | 'jantar' | 'desconhecido'

// Admin overview row
export interface AdminRestaurantRow {
  id: string
  nome: string
  slug: string
  estado: RestaurantEstado
  em_compromisso: boolean
  cliente_nome: string
  cliente_id: string
  numero_ciclo: number | null
  data_inicio: string | null
  data_fim_prevista: string | null
  dia_ciclo: number | null
  contagem_actual: number | null
  objetivo: number | null
  garantia_estado: GuaranteeEstado | null
  garantia_pct: number | null
  ultima_chamada: string | null
  estado_pagamento: PaymentStatus | null
}

// Guarantee status view
export interface GuaranteeStatus {
  restaurant_id: string
  restaurant_nome: string
  cliente_nome: string
  objetivo: number
  contagem_actual: number
  contagem_organica: number
  contagem_manual: number
  estado: GuaranteeEstado
  dia_efectivo: number
  dias_restantes: number
  progresso_pct: number
  pessoas_em_falta: number
  data_cumprimento: string | null
}

// Admin daily snapshot
export interface AdminSnapshot {
  snapshot_date: string
  receita_mes_corrente: number
  receita_mes_anterior: number
  receita_prevista_proximo_mes: number
  total_restaurantes_ativos: number
  total_em_garantia: number
  total_em_construcao: number
  total_pausados: number
  total_rescindidos_mes: number
  total_minutos_mes: number
  total_conversoes_mes: number
  clientes_em_atraso: {
    restaurant_id: string
    nome: string
    cliente: string
    dias_atraso: number
    valor: number
  }[]
}

// Client profile
export interface ClientProfile {
  id: string
  auth_user_id: string
  nome_empresa: string
  nif: string
  morada: string
  email_contacto: string
  email_faturacao: string
  telefone: string | null
  stripe_customer_id: string | null
  stripe_payment_method_id: string | null
  password_alterada_cliente: boolean
  docusign_envelope_id: string | null
  notas_internas: string | null
  criado_em: string
}

// Restaurant full
export interface Restaurant {
  id: string
  client_id: string
  nome: string
  morada: string | null
  slug: string
  ordem: number
  estado: RestaurantEstado
  telnyx_phone: string | null
  transfer_phone: string | null
  software_reservas: SoftwareReservasTipo
  tem_takeaway: boolean
  aceita_ultima_hora: boolean
  taxa_ativacao: number
  comissao_por_pessoa: number
  taxa_takeaway: number
  valor_estimado_por_pessoa: number
  valor_medio_takeaway: number
  objetivo_garantia: number
  tem_garantia: boolean
  taxa_mensal_fixa: number
  periodo_compromisso_dias: number
  valor_rescisao_antecipada: number
  data_inicio_compromisso: string | null
  em_compromisso: boolean
  data_live: string | null
  google_drive_folder_link: string | null
  notas_internas: string | null
  slack_channel_id: string | null
  slack_channel_name: string | null
  criado_em: string
}

// Agent
export interface Agent {
  id: string
  restaurant_id: string
  telnyx_agent_id: string
  nome: string
  activo: boolean
  criado_em: string
}

// Billing cycle
export interface BillingCycle {
  id: string
  restaurant_id: string
  numero_ciclo: number
  data_inicio: string
  data_fim_prevista: string
  data_fim_real: string | null
  estado: CycleStatus
  fecho_pendente: boolean
  dias_pausados: number
  snapshot_comissao_por_pessoa: number
  snapshot_taxa_takeaway: number
  snapshot_taxa_mensal_fixa: number
  valor_mensalidade: number
  total_pessoas_reservas: number
  total_pessoas_ultima_hora: number
  total_takeaways_confirmados: number
  valor_comissoes_reservas: number
  valor_comissoes_ultima_hora: number
  valor_takeaways: number
  valor_total: number
  isento_faturacao: boolean
  is_founder: boolean
  skip_stripe_invoice: boolean
  estado_pagamento: PaymentStatus
  stripe_invoice_id: string | null
  pago_em: string | null
  email_intercalar_enviado_em: string | null
  minutos_usados: number
  reembolso_ativacao: boolean
  numero_fatura_at: string | null
  valor_rescisao_antecipada: number
}
