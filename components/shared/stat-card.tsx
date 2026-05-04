import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  sub?: string
  icon?: LucideIcon
  trend?: { value: string; positive: boolean }
  className?: string
  loading?: boolean
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  trend,
  className,
  loading = false,
}: StatCardProps) {
  if (loading) {
    return (
      <div className={cn('bg-white rounded-lg border border-slate-200 p-5', className)}>
        <div className="h-4 w-24 bg-slate-100 rounded animate-pulse mb-3" />
        <div className="h-7 w-32 bg-slate-100 rounded animate-pulse mb-2" />
        <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
      </div>
    )
  }

  return (
    <div className={cn('bg-white rounded-lg border border-slate-200 p-5 group', className)}>
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">{label}</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 tabular-nums truncate">{value}</p>
          {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
          {trend && (
            <p className={cn('mt-2 text-xs font-medium', trend.positive ? 'text-green-600' : 'text-red-500')}>
              {trend.positive ? '↑' : '↓'} {trend.value}
            </p>
          )}
        </div>
        {Icon && (
          <div className="ml-3 p-2 bg-slate-50 rounded-lg group-hover:bg-slate-100 transition-colors">
            <Icon className="w-4 h-4 text-slate-400" />
          </div>
        )}
      </div>
    </div>
  )
}
