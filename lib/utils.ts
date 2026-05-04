import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'
import { pt } from 'date-fns/locale'
import type { RestaurantEstado, PaymentStatus, GuaranteeEstado } from '@/types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ── Date helpers ──────────────────────────────────────────────────────────────

export function formatDate(date: string | Date | null, fmt = 'dd/MM/yyyy') {
  if (!date) return '—'
  return format(new Date(date), fmt, { locale: pt })
}

export function formatDateTime(date: string | Date | null) {
  if (!date) return '—'
  return format(new Date(date), 'dd/MM/yyyy HH:mm', { locale: pt })
}

export function timeAgo(date: string | Date | null) {
  if (!date) return '—'
  return formatDistanceToNow(new Date(date), { addSuffix: true, locale: pt })
}

// ── Currency helpers ──────────────────────────────────────────────────────────

export function formatEuro(value: number | null | undefined) {
  if (value == null) return '—'
  return new Intl.NumberFormat('pt-PT', {
    style: 'currency',
    currency: 'EUR',
  }).format(value)
}

// ── Restaurant state helpers ──────────────────────────────────────────────────

export const estadoLabels: Record<RestaurantEstado, string> = {
  em_construcao: 'Em Construção',
  em_garantia:   'Em Garantia',
  ativo:         'Ativo',
  pausado:       'Pausado',
  rescindido:    'Rescindido',
}

export const estadoColors: Record<RestaurantEstado, string> = {
  em_construcao: 'bg-slate-100 text-slate-600 border-slate-200',
  em_garantia:   'bg-blue-50 text-blue-700 border-blue-200',
  ativo:         'bg-green-50 text-green-700 border-green-200',
  pausado:       'bg-amber-50 text-amber-700 border-amber-200',
  rescindido:    'bg-red-50 text-red-700 border-red-200',
}

export const estadoDotColors: Record<RestaurantEstado, string> = {
  em_construcao: 'bg-slate-400',
  em_garantia:   'bg-blue-500',
  ativo:         'bg-green-500',
  pausado:       'bg-amber-500',
  rescindido:    'bg-red-500',
}

// ── Payment state helpers ─────────────────────────────────────────────────────

export const paymentLabels: Record<PaymentStatus, string> = {
  pendente:  'Pendente',
  pago:      'Pago',
  em_atraso: 'Em Atraso',
}

export const paymentColors: Record<PaymentStatus, string> = {
  pendente:  'bg-slate-100 text-slate-500 border-slate-200',
  pago:      'bg-green-50 text-green-700 border-green-200',
  em_atraso: 'bg-red-50 text-red-700 border-red-200',
}

// ── Guarantee state helpers ───────────────────────────────────────────────────

export const guaranteeLabels: Record<GuaranteeEstado, string> = {
  em_curso:             'Em Curso',
  cumprido:             'Cumprida',
  nao_cumprido_30_dias: 'Não Cumprida',
  cancelado:            'Cancelada',
}

export const guaranteeColors: Record<GuaranteeEstado, string> = {
  em_curso:             'bg-blue-50 text-blue-700 border-blue-200',
  cumprido:             'bg-green-50 text-green-700 border-green-200',
  nao_cumprido_30_dias: 'bg-red-50 text-red-700 border-red-200',
  cancelado:            'bg-slate-100 text-slate-500 border-slate-200',
}

// ── Misc helpers ──────────────────────────────────────────────────────────────

export function clampPercent(value: number) {
  return Math.min(100, Math.max(0, Math.round(value)))
}

export function pluralPessoa(n: number) {
  return n === 1 ? '1 pessoa' : `${n} pessoas`
}
