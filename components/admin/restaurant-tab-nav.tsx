'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

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
    <div
      style={{
        borderBottom: '1px solid var(--surface-border)',
        background: 'var(--surface-1)',
        padding: '0 24px',
      }}
    >
      <nav className="nc-tab-nav-scroll" style={{ display: 'flex', gap: '0', marginBottom: '-1px' }}>
        {tabs.map(tab => {
          const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: '12px 16px',
                fontSize: '13px',
                fontWeight: active ? 600 : 500,
                color: active ? 'var(--text-primary)' : 'var(--text-muted)',
                textDecoration: 'none',
                borderBottom: active ? '2px solid var(--text-primary)' : '2px solid transparent',
                transition: 'color 150ms ease, border-color 150ms ease',
                whiteSpace: 'nowrap',
                fontFamily: 'var(--font-geist), sans-serif',
              }}
              onMouseEnter={e => {
                if (!active) e.currentTarget.style.color = 'var(--text-secondary)'
              }}
              onMouseLeave={e => {
                if (!active) e.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              {tab.label}
            </Link>
          )
        })}
      </nav>
    </div>
  )
}
