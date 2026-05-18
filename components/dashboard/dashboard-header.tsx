'use client'

import { useRouter } from 'next/navigation'
import { RefreshCw, Moon, Sun, Settings, Menu } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useTheme } from 'next-themes'

const LS_KEY = 'nc-display-name'

interface DashboardHeaderProps {
  nomeResponsavel: string
  onHamburgerClick?: () => void
}

export function DashboardHeader({ nomeResponsavel, onHamburgerClick }: DashboardHeaderProps) {
  const router = useRouter()
  const { resolvedTheme, setTheme } = useTheme()
  const [refreshing, setRefreshing] = useState(false)
  const [displayName, setDisplayName] = useState(nomeResponsavel)

  useEffect(() => {
    const stored = localStorage.getItem(LS_KEY)
    if (stored) setDisplayName(stored)

    function handleNameUpdate(e: Event) {
      setDisplayName((e as CustomEvent<string>).detail)
    }
    window.addEventListener('nc:name-updated', handleNameUpdate)
    return () => window.removeEventListener('nc:name-updated', handleNameUpdate)
  }, [])

  function toggleTheme() {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  function handleRefresh() {
    setRefreshing(true)
    router.refresh()
    setTimeout(() => setRefreshing(false), 800)
  }

  function handleSettings() {
    window.dispatchEvent(new CustomEvent('nc:open-settings'))
  }

  const name = displayName?.trim()

  return (
    <>
      {/* ── Header desktop ── */}
      <div
        className="nc-topbar-desktop"
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '28px 32px 8px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '1.75rem',
              fontWeight: 700,
              color: 'var(--text-primary)',
              letterSpacing: '-0.035em',
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {name ? `Olá, ${name} 👋` : 'Olá 👋'}
          </h1>
          <p
            style={{
              fontSize: '14px',
              color: 'var(--text-muted)',
              margin: '6px 0 0',
            }}
          >
            Aqui está o que aconteceu hoje.
          </p>
        </div>

        {/* Action buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <button
            onClick={handleRefresh}
            title="Actualizar"
            style={iconBtnStyle}
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
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            {resolvedTheme === 'dark'
              ? <Sun style={{ width: '16px', height: '16px' }} />
              : <Moon style={{ width: '16px', height: '16px' }} />
            }
          </button>

          <button
            onClick={handleSettings}
            title="Configurações"
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Settings style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      {/* ── Header mobile: barra fixa no topo ── */}
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
          {name ? `Olá, ${name} 👋` : 'Olá 👋'}
        </span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '2px' }}>
          <button
            onClick={handleRefresh}
            title="Actualizar"
            style={iconBtnStyle}
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
            onClick={handleSettings}
            title="Configurações"
            style={iconBtnStyle}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
          >
            <Settings style={{ width: '16px', height: '16px' }} />
          </button>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </>
  )
}

const iconBtnStyle: React.CSSProperties = {
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
