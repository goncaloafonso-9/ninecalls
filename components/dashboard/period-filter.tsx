'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const options = [
  { value: 'hoje',  label: 'Hoje' },
  { value: '7d',   label: '7 dias' },
  { value: '30d',  label: '30 dias' },
]

export function PeriodFilter({ active }: { active: string }) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(value: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <div className="flex items-center bg-slate-100 rounded-lg p-0.5 gap-0.5">
      {options.map(o => (
        <button
          key={o.value}
          onClick={() => handleChange(o.value)}
          className={cn(
            'px-3 py-1.5 rounded-md text-xs font-medium transition-all',
            active === o.value
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-500 hover:text-slate-700'
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}
