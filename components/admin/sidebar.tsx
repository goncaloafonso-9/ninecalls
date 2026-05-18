'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { useTheme } from 'next-themes'
import { createClient } from '@/lib/supabase/client'
import {
  LayoutDashboard, Euro, ShieldCheck, Users, Store,
  Plus, Settings, LogOut, MoreHorizontal,
  PanelLeftClose, PanelLeftOpen, Activity,
} from 'lucide-react'
import { toast } from 'sonner'

const navItems = [
  { href: '/admin/dashboard',    label: 'Dashboard',    icon: LayoutDashboard },
  { href: '/admin/financeiro',   label: 'Financeiro',   icon: Euro },
  { href: '/admin/garantias',    label: 'Garantias',    icon: ShieldCheck },
  { href: '/admin/clientes',     label: 'Clientes',     icon: Users },
  { href: '/admin/restaurantes', label: 'Restaurantes', icon: Store },
]

function NavItem({
  href, label, icon: Icon, active, collapsed, onMobileClose,
}: {
  href: string
  label: string
  icon: React.ComponentType<{ style?: React.CSSProperties }>
  active: boolean
  collapsed: boolean
  onMobileClose?: () => void
}) {
  return (
    <Link
      href={href}
      title={collapsed ? label : undefined}
      onClick={onMobileClose}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : '10px',
        justifyContent: collapsed ? 'center' : 'flex-start',
        height: '36px',
        padding: collapsed ? '0' : '0 12px',
        borderRadius: '8px',
        fontSize: '13px',
        fontWeight: active ? 600 : 400,
        color: active ? 'var(--sidebar-item-active-text)' : 'var(--sidebar-text)',
        background: active ? 'var(--sidebar-item-active-bg)' : 'transparent',
        textDecoration: 'none',
        position: 'relative',
        transition: 'all 150ms ease',
        whiteSpace: 'nowrap',
        overflow: 'hidden',
      }}
      onMouseEnter={e => {
        if (!active) {
          e.currentTarget.style.background = 'var(--sidebar-item-hover)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--sidebar-text)'
        }
      }}
    >
      {active && (
        <span
          style={{
            position: 'absolute',
            left: 0,
            top: '50%',
            transform: 'translateY(-50%)',
            width: '3px',
            height: '20px',
            background: 'var(--blue-600)',
            borderRadius: '0 2px 2px 0',
          }}
        />
      )}
      <Icon style={{ width: '16px', height: '16px', flexShrink: 0, color: active ? 'var(--sidebar-item-active-icon)' : 'var(--sidebar-icon)' }} />
      {!collapsed && <span>{label}</span>}
    </Link>
  )
}

export function AdminSidebar({
  mobileOpen = false,
  onMobileClose,
}: {
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const pathname = usePathname()
  const router = useRouter()
  const { resolvedTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [maisOpen, setMaisOpen] = useState(false)
  const maisRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const stored = localStorage.getItem('nc-sidebar-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  // Close "Mais" on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (maisRef.current && !maisRef.current.contains(e.target as Node)) {
        setMaisOpen(false)
      }
    }
    if (maisOpen) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [maisOpen])

  const toggleCollapse = () => {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('nc-sidebar-collapsed', String(next))
    if (next) setMaisOpen(false)
  }

  async function handleLogout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    toast.success('Sessão terminada')
    router.push('/login')
    router.refresh()
  }

  const width = collapsed ? 'var(--sidebar-width-collapsed)' : 'var(--sidebar-width-expanded)'

  return (
    <aside
      className="nc-sidebar-drawer"
      data-mobile-open={mobileOpen ? 'true' : 'false'}
      style={{
        width,
        minWidth: width,
        maxWidth: width,
        height: '100vh',
        display: 'flex',
        flexDirection: 'column',
        background: 'var(--sidebar-bg)',
        borderRight: '1px solid var(--sidebar-border)',
        transition: 'width 200ms var(--ease-in-out), min-width 200ms var(--ease-in-out), max-width 200ms var(--ease-in-out)',
        overflow: 'hidden',
        flexShrink: 0,
        position: 'relative',
      }}
    >
      {/* ── Logo + collapse ── */}
      <div
        style={{
          height: '64px',
          display: 'flex',
          alignItems: 'center',
          padding: '0 12px',
          justifyContent: collapsed ? 'center' : 'space-between',
          flexShrink: 0,
        }}
      >
        {/* Logo + wordmark — oculto quando colapsado */}
        {!collapsed && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', overflow: 'hidden', minWidth: 0 }}>
            <Image
              src={resolvedTheme === 'dark' ? '/nine-calls-ai-dark-waves.png' : '/nine-calls-ai-light-waves.jpg'}
              alt="Nine Calls"
              width={20}
              height={20}
              style={{ objectFit: 'contain', flexShrink: 0, borderRadius: '4px' }}
              priority
            />
            <span
              style={{
                fontSize: '13px',
                fontWeight: 700,
                letterSpacing: '0.02em',
                color: 'var(--text-primary)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                fontFamily: 'var(--font-geist), sans-serif',
              }}
            >
              Nine Calls
            </span>
          </div>
        )}

        <button
          onClick={toggleCollapse}
          title={collapsed ? 'Expandir sidebar' : 'Colapsar sidebar'}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '28px',
            height: '28px',
            borderRadius: '6px',
            border: 'none',
            background: 'transparent',
            color: 'var(--text-muted)',
            cursor: 'pointer',
            transition: 'background 150ms ease, color 150ms ease',
            flexShrink: 0,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--sidebar-item-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.color = 'var(--text-muted)'
          }}
        >
          {collapsed
            ? <PanelLeftOpen style={{ width: '16px', height: '16px' }} />
            : <PanelLeftClose style={{ width: '16px', height: '16px' }} />
          }
        </button>
      </div>

      {/* ── Nav ── */}
      <nav
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '12px 8px 0',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px',
        }}
      >
        {navItems.map(({ href, label, icon }) => {
          const active = pathname === href || pathname.startsWith(href + '/')
          return (
            <NavItem key={href} href={href} label={label} icon={icon} active={active} collapsed={collapsed} onMobileClose={onMobileClose} />
          )
        })}

        {/* Novo Cliente */}
        <div style={{ margin: '10px 0' }}>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('nc:open-onboarding'))}
            title={collapsed ? 'Novo Cliente' : undefined}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: collapsed ? 0 : '10px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              height: '36px',
              padding: collapsed ? '0' : '0 12px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--text-secondary)',
              background: 'transparent',
              border: '1px dashed var(--surface-border)',
              cursor: 'pointer',
              transition: 'all 150ms ease',
              width: '100%',
              fontFamily: 'var(--font-geist), sans-serif',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--blue-50)'
              e.currentTarget.style.color = 'var(--blue-600)'
              e.currentTarget.style.borderColor = 'var(--blue-200)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
              e.currentTarget.style.borderColor = 'var(--surface-border)'
            }}
          >
            <Plus style={{ width: '16px', height: '16px', flexShrink: 0 }} />
            {!collapsed && <span>Novo Cliente</span>}
          </button>
        </div>
      </nav>

      {/* ── Footer — Mais ── */}
      <div
        ref={maisRef}
        style={{ padding: '8px', flexShrink: 0, position: 'relative' }}
      >
        {/* Mais mini card */}
        {maisOpen && (
          <div
            style={{
              position: 'absolute',
              bottom: '56px',
              left: '8px',
              right: '8px',
              background: 'var(--surface-1)',
              border: '1px solid var(--surface-border)',
              borderRadius: '10px',
              boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
              overflow: 'hidden',
              zIndex: 50,
            }}
          >
            <Link
              href="/admin/configuracoes"
              onClick={() => setMaisOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <Settings style={{ width: '15px', height: '15px', color: 'var(--sidebar-icon)', flexShrink: 0 }} />
              {!collapsed && 'Configurações'}
            </Link>
            <Link
              href="/admin/diagnostico"
              onClick={() => setMaisOpen(false)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                color: 'var(--text-primary)',
                fontSize: '13px',
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 120ms ease',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <Activity style={{ width: '15px', height: '15px', color: 'var(--sidebar-icon)', flexShrink: 0 }} />
              {!collapsed && 'Diagnóstico BD'}
            </Link>
            <div style={{ height: '1px', background: 'var(--surface-border)', margin: '0 10px' }} />
            <button
              onClick={handleLogout}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 14px',
                border: 'none',
                background: 'transparent',
                color: 'var(--red-600, #dc2626)',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                fontFamily: 'var(--font-geist), sans-serif',
                transition: 'background 120ms ease',
                textAlign: 'left',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'var(--red-50, #fef2f2)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
            >
              <LogOut style={{ width: '15px', height: '15px', flexShrink: 0 }} />
              {!collapsed && 'Sair'}
            </button>
          </div>
        )}

        {/* Mais button */}
        <button
          onClick={() => setMaisOpen(v => !v)}
          title={collapsed ? 'Mais' : undefined}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: collapsed ? 0 : '10px',
            justifyContent: collapsed ? 'center' : 'flex-start',
            height: '36px',
            padding: collapsed ? '0' : '0 12px',
            borderRadius: '8px',
            border: 'none',
            width: '100%',
            background: maisOpen ? 'var(--sidebar-item-hover)' : 'transparent',
            color: maisOpen ? 'var(--text-primary)' : 'var(--sidebar-text)',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-geist), sans-serif',
            transition: 'background 150ms ease, color 150ms ease',
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = 'var(--sidebar-item-hover)'
            e.currentTarget.style.color = 'var(--text-primary)'
          }}
          onMouseLeave={e => {
            if (!maisOpen) {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--sidebar-text)'
            }
          }}
        >
          <MoreHorizontal style={{ width: '16px', height: '16px', flexShrink: 0, color: 'var(--sidebar-icon)' }} />
          {!collapsed && <span>Mais</span>}
        </button>
      </div>
    </aside>
  )
}
