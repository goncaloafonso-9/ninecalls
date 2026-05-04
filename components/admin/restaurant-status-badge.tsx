import { cn, estadoColors, estadoDotColors, estadoLabels } from '@/lib/utils'
import type { RestaurantEstado } from '@/types'

interface RestaurantStatusBadgeProps {
  estado: RestaurantEstado
  dot?: boolean
  className?: string
}

export function RestaurantStatusBadge({ estado, dot = true, className }: RestaurantStatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border',
        estadoColors[estado],
        className
      )}
    >
      {dot && (
        <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', estadoDotColors[estado])} />
      )}
      {estadoLabels[estado]}
    </span>
  )
}
