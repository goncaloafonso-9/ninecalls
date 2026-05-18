'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon } from 'lucide-react'
import { useEffect, useState } from 'react'

interface ThemeToggleProps {
  collapsed?: boolean
}

export function ThemeToggle({ collapsed = false }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <button
        className="flex items-center justify-center w-8 h-8 rounded-lg"
        aria-label="Toggle theme"
        style={{ color: 'var(--sidebar-icon)' }}
      />
    )
  }

  const isDark = theme === 'dark'

  return (
    <button
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
      title={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      aria-label={isDark ? 'Mudar para modo claro' : 'Mudar para modo escuro'}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '8px',
        padding: '6px 8px',
        borderRadius: '8px',
        border: 'none',
        background: 'transparent',
        color: 'var(--sidebar-icon)',
        cursor: 'pointer',
        transition: 'background 150ms ease, color 150ms ease',
        width: collapsed ? '36px' : 'auto',
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}
      onMouseEnter={e => {
        const el = e.currentTarget
        el.style.background = 'var(--sidebar-item-hover)'
        el.style.color = 'var(--text-primary)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget
        el.style.background = 'transparent'
        el.style.color = 'var(--sidebar-icon)'
      }}
    >
      {isDark
        ? <Sun className="w-4 h-4 shrink-0" />
        : <Moon className="w-4 h-4 shrink-0" />
      }
      {!collapsed && (
        <span style={{ fontSize: '13px', fontWeight: 500, whiteSpace: 'nowrap' }}>
          {isDark ? 'Modo Claro' : 'Modo Escuro'}
        </span>
      )}
    </button>
  )
}
