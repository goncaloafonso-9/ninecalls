'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

interface Tab {
  label: string
  href: string
  exact?: boolean
}

export function RestaurantTabNav({ slug }: { slug: string }) {
  const pathname = usePathname()
  const base = `/admin/restaurantes/${slug}`

  const tabs: Tab[] = [
    { label: 'Geral',       href: base,                    exact: true },
    { label: 'Chamadas',    href: `${base}/chamadas` },
    { label: 'Reservas',    href: `${base}/reservas` },
    { label: 'Takeaways',   href: `${base}/takeaways` },
    { label: 'Última Hora', href: `${base}/ultima-hora` },
    { label: 'Clientes',    href: `${base}/clientes` },
  ]

  return (
    <div className="border-b border-slate-200 bg-white px-6">
      <nav className="flex gap-0 -mb-px">
        {tabs.map(tab => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap',
                active
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
              )}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
