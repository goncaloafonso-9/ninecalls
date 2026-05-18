export interface PdfCicloPayload {
  // Identificação
  ciclo_id: string
  restaurant_id: string
  restaurant_name: string
  restaurant_slug: string
  restaurant_address: string
  client_name: string
  client_email: string

  // Período
  data_inicio: string
  data_fim: string
  duracao_dias: number
  numero_ciclo: number

  // Contrato
  comissao_por_pessoa: number
  taxa_takeaway: number
  valor_estimado_por_pessoa: number
  is_founder: boolean

  // Métricas do ciclo
  total_chamadas: number
  chamadas_sucesso: number
  taxa_sucesso_percent: number
  sentimento_positivo_percent: number
  sentimento_neutro_percent: number
  sentimento_negativo_percent: number
  duracao_media_chamada_segundos: number

  // Reservas
  reservas_confirmadas: number
  reservas_canceladas: number
  reservas_no_show: number
  total_pessoas_confirmadas: number
  taxa_no_show_percent: number

  // Takeaway & Última Hora
  pedidos_takeaway: number
  pedidos_ultima_hora: number

  // Financeiro
  subtotal_reservas: number
  subtotal_takeaway: number
  subtotal_mensalidade: number
  taxa_mensal_fixa: number
  desconto_no_show: number
  total_final: number
  receita_estimada_recuperada: number
  roi_percent: number
  stripe_invoice_id: string | null
  skip_stripe_invoice: boolean

  // Distribuição de tipos de chamada
  distribuicao_tipos: {
    agendamento: number
    reagendamento: number
    cancelamento: number
    takeaway: number
    ultima_hora: number
    apoio: number
    transferencia: number
    spam_hangup: number
  }

  // Motivos de transferência (top 3)
  top_motivos_transferencia: string[]

  // Espaços preferidos
  distribuicao_espacos: {
    sala: number
    terraco: number
    esplanada: number
    sem_preferencia: number
  }

  // Meta
  gerado_em: string
  google_drive_folder_link: string
}
