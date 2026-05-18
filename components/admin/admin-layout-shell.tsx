'use client'

import { useState, useEffect, useCallback } from 'react'
import { AdminSidebar } from '@/components/admin/sidebar'
import { AdminTopBar } from '@/components/admin/admin-topbar'
import { AdminOnboardingSheet } from '@/components/admin/onboarding-sheet'

export function AdminLayoutShell({ children }: { children: React.ReactNode }) {
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Fecha sidebar ao pressionar Escape
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && mobileSidebarOpen) {
        setMobileSidebarOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [mobileSidebarOpen])

  // Fecha sidebar ao redimensionar para desktop
  useEffect(() => {
    function handleResize() {
      if (window.innerWidth > 768) setMobileSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Bloqueia scroll do body quando sidebar está aberta em mobile
  useEffect(() => {
    if (mobileSidebarOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [mobileSidebarOpen])

  const handleMobileClose = useCallback(() => setMobileSidebarOpen(false), [])
  const handleHamburger = useCallback(() => setMobileSidebarOpen(v => !v), [])

  return (
    <div
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: 'var(--bg-base)',
      }}
    >
      {/* Overlay mobile */}
      {mobileSidebarOpen && (
        <div
          className="nc-sidebar-overlay"
          onClick={handleMobileClose}
          aria-hidden="true"
        />
      )}

      <AdminSidebar
        mobileOpen={mobileSidebarOpen}
        onMobileClose={handleMobileClose}
      />

      <main
        className="nc-layout-main-mobile nc-main-with-topbar"
        style={{
          flex: 1,
          overflowY: 'auto',
          background: 'var(--bg-base)',
        }}
      >
        {children}
      </main>

      <AdminTopBar onHamburgerClick={handleHamburger} />
      <AdminOnboardingSheet />
    </div>
  )
}
