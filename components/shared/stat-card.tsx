'use client'

import { KpiCard } from '@/components/ui/kpi-card'
import { SkeletonCard } from '@/components/ui/skeleton-card'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  className?: string
  loading?: boolean
  hero?: boolean
  sparklineData?: number[]
  animationDelay?: number
}

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
  loading = false,
  hero = false,
  sparklineData,
  animationDelay,
}: StatCardProps) {
  if (loading) return <SkeletonCard />

  return (
    <KpiCard
      label={label}
      value={value}
      icon={Icon ? <Icon style={{ width: '16px', height: '16px' }} /> : undefined}
      hero={hero}
      sparklineData={sparklineData}
      animationDelay={animationDelay}
      className={className}
      deltaLabel={trend ? (trend.positive ? 'vs período anterior' : 'vs período anterior') : undefined}
    />
  )
}
