import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'ativo'
  | 'em_garantia'
  | 'pausado'
  | 'em_construcao'
  | 'rescindido'
  | 'pendente'
  | 'pago'
  | 'em_atraso'
  | 'isento'
  | 'confirmada'
  | 'no_show'
  | 'cancelado'
  | 'positivo'
  | 'neutro'
  | 'negativo'

interface StatusBadgeProps {
  variant: BadgeVariant
  dot?: boolean
  className?: string
  children?: React.ReactNode
}

const variantConfig: Record<BadgeVariant, { bg: string; text: string; dot: string; label: string }> = {
  ativo:          { bg: 'var(--green-50)',  text: 'var(--green-700)',  dot: 'var(--green-600)',  label: 'Ativo' },
  em_garantia:    { bg: 'var(--blue-50)',   text: 'var(--blue-700)',   dot: 'var(--blue-600)',   label: 'Em Garantia' },
  pausado:        { bg: 'var(--amber-50)',  text: 'var(--amber-600)',  dot: 'var(--amber-500)',  label: 'Pausado' },
  em_construcao:  { bg: 'var(--gray-100)',  text: 'var(--gray-600)',   dot: 'var(--gray-400)',   label: 'Em Construção' },
  rescindido:     { bg: 'var(--red-50)',    text: 'var(--red-700)',    dot: 'var(--red-600)',    label: 'Rescindido' },
  pendente:       { bg: 'var(--amber-50)',  text: 'var(--amber-600)',  dot: 'var(--amber-500)',  label: 'Pendente' },
  pago:           { bg: 'var(--green-50)',  text: 'var(--green-700)',  dot: 'var(--green-600)',  label: 'Pago' },
  em_atraso:      { bg: 'var(--red-50)',    text: 'var(--red-700)',    dot: 'var(--red-600)',    label: 'Em Atraso' },
  isento:         { bg: 'var(--gray-100)', text: 'var(--gray-500)',   dot: 'var(--gray-400)',   label: 'Isento' },
  confirmada:     { bg: 'var(--green-50)',  text: 'var(--green-700)',  dot: 'var(--green-600)',  label: 'Confirmada' },
  no_show:        { bg: 'var(--red-50)',    text: 'var(--red-700)',    dot: 'var(--red-600)',    label: 'No Show' },
  cancelado:      { bg: 'var(--gray-100)',  text: 'var(--gray-600)',   dot: 'var(--gray-400)',   label: 'Cancelado' },
  positivo:       { bg: 'var(--green-50)',  text: 'var(--green-700)',  dot: 'var(--green-600)',  label: 'Positivo' },
  neutro:         { bg: 'var(--gray-100)',  text: 'var(--gray-600)',   dot: 'var(--gray-400)',   label: 'Neutro' },
  negativo:       { bg: 'var(--red-50)',    text: 'var(--red-700)',    dot: 'var(--red-600)',    label: 'Negativo' },
}

export function StatusBadge({ variant, dot = true, className, children }: StatusBadgeProps) {
  const config = variantConfig[variant]

  return (
    <span
      className={cn(className)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '5px',
        padding: '3px 10px',
        borderRadius: '100px',
        fontSize: '12px',
        fontWeight: 600,
        whiteSpace: 'nowrap',
        background: config.bg,
        color: config.text,
      }}
    >
      {dot && (
        <span
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            background: config.dot,
            flexShrink: 0,
          }}
        />
      )}
      {children ?? config.label}
    </span>
  )
}

export { variantConfig }
