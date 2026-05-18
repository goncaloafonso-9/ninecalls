'use client'

import { FolderOpen, ExternalLink } from 'lucide-react'

export function GoogleDriveButton({ driveLink, fullWidth }: { driveLink: string; fullWidth?: boolean }) {
  return (
    <a
      href={driveLink}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: fullWidth ? 'center' : 'flex-start',
        gap: '8px',
        width: fullWidth ? '100%' : undefined,
        height: '40px',
        padding: '0 16px',
        borderRadius: '8px',
        border: '1px solid var(--surface-border)',
        background: 'var(--surface-1)',
        color: 'var(--text-primary)',
        fontSize: '13px',
        fontWeight: 500,
        fontFamily: 'inherit',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
        flexShrink: 0,
        boxSizing: 'border-box',
        transition: 'background 150ms ease',
      }}
      onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--bg-muted)' }}
      onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.background = 'var(--surface-1)' }}
    >
      <FolderOpen style={{ width: '15px', height: '15px', color: 'var(--text-muted)', flexShrink: 0 }} />
      Pasta de Documentos
      <ExternalLink style={{ width: '13px', height: '13px', color: 'var(--text-muted)', flexShrink: 0 }} />
    </a>
  )
}
