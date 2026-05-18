'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { RefreshCw, Moon, Sun, Settings, Menu } from 'lucide-react'
import { useState } from 'react'
import { useTheme } from 'next-themes'

export function AdminTopBar({ onHamburgerClick }: { onHamburgerClick?: () => void }) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  return (
    <>
      {/* ── Topbar desktop: canto superior direito ── */}
      <div
        className="nc-topbar-desktop"
        style={{
          position: 'fixed',
          top: '16px',
          right: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px',
          zIndex: 40,
        }}
      >
        <button
          onClick={handleRefresh}
          title="Actualizar"
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <RefreshCw
            style={{
              width: '16px',
              height: '16px',
              animation: refreshing ? 'spin 0.8s linear' : 'none',
            }}
          />
        </button>

        <button
          onClick={toggleTheme}
          title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
          style={btnStyle}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          {resolvedTheme === 'dark'
            ? <Sun style={{ width: '16px', height: '16px' }} />
            : <Moon style={{ width: '16px', height: '16px' }} />
          }
        </button>

        <Link
          href="/admin/configuracoes"
          title="Configurações"
          style={{ ...btnStyle, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
        >
          <Settings style={{ width: '16px', height: '16px' }} />
        </Link>
      </div>

      {/* ── Topbar mobile: full width, fixo no topo ── */}
      <div className="nc-topbar-mobile">
        <button
          className="nc-hamburger"
          onClick={onHamburgerClick}
          title="Menu"
          aria-label="Abrir menu"
        >
          <Menu style={{ width: '20px', height: '20px' }} />
        </button>

        <span
          style={{
            fontSize: '14px',
            fontWeight: 700,
            letterSpacing: '0.02em',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-geist), sans-serif',
          }}
        >
          Nine Calls
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={handleRefresh}
            title="Actualizar"
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <RefreshCw
              style={{
                width: '16px',
                height: '16px',
                animation: refreshing ? 'spin 0.8s linear' : 'none',
              }}
            />
          </button>
          <button
            onClick={toggleTheme}
            title={resolvedTheme === 'dark' ? 'Modo claro' : 'Modo escuro'}
            style={btnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {resolvedTheme === 'dark'
              ? <Sun style={{ width: '16px', height: '16px' }} />
              : <Moon style={{ width: '16px', height: '16px' }} />
            }
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '32px',
  height: '32px',
  borderRadius: '8px',
  border: 'none',
  background: 'transparent',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  transition: 'background 150ms ease, color 150ms ease',
}
