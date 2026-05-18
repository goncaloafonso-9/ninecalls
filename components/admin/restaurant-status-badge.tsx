// Re-export from the unified StatusBadge component
import { StatusBadge } from '@/components/ui/status-badge'
import type { BadgeVariant } from '@/components/ui/status-badge'
import type { RestaurantEstado } from '@/types'

interface RestaurantStatusBadgeProps {
  estado: RestaurantEstado
  dot?: boolean
  className?: string
}

export function RestaurantStatusBadge({ estado, dot = true, className }: RestaurantStatusBadgeProps) {
  return (
    <StatusBadge
      variant={estado as BadgeVariant}
      dot={dot}
      className={className}
    />
  )
}
