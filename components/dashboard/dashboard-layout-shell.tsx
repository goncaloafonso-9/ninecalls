'use client'

import { useState, useEffect, useCallback } from 'react'
import { DashboardSidebar } from '@/components/dashboard/sidebar'
import { DashboardHeader } from '@/components/dashboard/dashboard-header'
import { DashboardSettingsModal } from '@/components/dashboard/settings-modal'

interface Restaurant {
  id: string
  nome: string
  slug: string
  estado: string
  google_drive_folder_link?: string | null
}

interface Props {
  children: React.ReactNode
  restaurants: Restaurant[]
  activeSlug: string
  nomeResponsavel: string
  driveLinkAtivo: string | null
}

export function DashboardLayoutShell({
  children,
  restaurants,
  activeSlug,
  nomeResponsavel,
  driveLinkAtivo,
}: Props) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Fecha ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileSidebarOpen) setMobileSidebarOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen])

  // Fecha ao redimensionar para desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMobileSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Bloqueia scroll do body quando sidebar está aberta
  useEffect(() => {
    document.body.style.overflow = mobileSidebarOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [mobileSidebarOpen])

  const handleMobileClose = useCallback(() => setMobileSidebarOpen(false), [])
  const handleHamburger = useCallback(() => setMobileSidebarOpen(v => !v), [])

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{ background: 'var(--bg-base)' }}
    >
      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <div
          className="nc-sidebar-overlay"
          onClick={handleMobileClose}
          aria-hidden="true"
        />
      )}

      <DashboardSidebar
        restaurants={restaurants}
        activeSlug={activeSlug}
        nomeResponsavel={nomeResponsavel}
        mobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileClose}
      />

      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto nc-main-with-topbar">
          <DashboardHeader
            nomeResponsavel={nomeResponsavel}
            onHamburgerClick={handleHamburger}
          />
          {children}
        </main>
      </div>

      <DashboardSettingsModal driveLink={driveLinkAtivo} />
    </div>
  )
}
