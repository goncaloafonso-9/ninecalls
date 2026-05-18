export interface ActivacaoRestaurantePayload {
  restaurant_id: string
  restaurant_nome: string
  restaurant_slug: string
  restaurant_morada: string | null
  restaurant_telnyx_phone: string | null   // número Telnyx inbound do agente
  restaurant_transfer_phone: string | null  // número de transferência (staff)
  restaurant_google_drive_folder_link: string | null
  client_nome: string
  client_email: string
  client_telefone: string | null
  comissao_por_pessoa: number
  taxa_takeaway: number
  taxa_mensal_fixa: number
  snapshot_pessoas_por_takeaway: number
  valor_estimado_por_pessoa: number
  objetivo_garantia: number
  periodo_compromisso_dias: number
  tem_garantia: boolean
  numero_ciclo_inicial: number  // 0 se tem garantia, 1 se activado directamente
  data_live: string             // YYYY-MM-DD
  activado_em: string           // ISO timestamp
}
