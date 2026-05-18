'use client'

import Link from 'next/link'
import { ExternalLink } from 'lucide-react'
import { formatEuro } from '@/lib/utils'
import { StatusBadge } from '@/components/ui/status-badge'
import type { RestaurantEstado } from '@/types'

export interface FinanceiroRestauranteRow {
  nome: string
  slug: string
  estado: RestaurantEstado
  faturado: number
  emAtraso: number
  emAberto: number
  custosIA: number
  margem: number
  numeroCiclos: number
}

export function FinanceiroRestaurantesTable({ rows }: { rows: FinanceiroRestauranteRow[] }) {
  if (rows.length === 0) return null

  return (
    <div
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        overflow: 'hidden',
      }}
    >
      {/* Header */}
      <div
        className="nc-financeiro-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 110px 90px 90px 90px 90px',
          padding: '10px 20px',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--surface-2, rgba(0,0,0,0.02))',
        }}
      >
        {([
          { label: 'Restaurante', hide: false },
          { label: 'Estado', hide: false },
          { label: 'Faturado', hide: false },
          { label: 'Em Aberto', hide: false },
          { label: 'Custos IA', hide: true },
          { label: 'Margem', hide: true },
        ] as { label: string; hide: boolean }[]).map(h => (
          <span
            key={h.label}
            className={h.hide ? 'nc-col-hide-mobile' : undefined}
            style={{
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--text-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
            }}
          >
            {h.label}
          </span>
        ))}
      </div>

      {/* Rows */}
      {rows.map((row, idx) => (
        <div
          key={row.slug}
          className="nc-financeiro-row"
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 110px 90px 90px 90px 90px',
            padding: '14px 20px',
            borderBottom: idx < rows.length - 1 ? '1px solid var(--surface-border)' : 'none',
            alignItems: 'center',
            transition: 'background 150ms ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLDivElement).style.background = 'var(--surface-2, rgba(0,0,0,0.02))'
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLDivElement).style.background = ''
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
            <Link
              href={`/admin/restaurantes/${row.slug}`}
              style={{
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--text-primary)',
                textDecoration: 'none',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              {row.nome}
              <ExternalLink style={{ width: '10px', height: '10px', color: 'var(--text-muted)', opacity: 0.6 }} />
            </Link>
          </div>

          <div>
            <StatusBadge variant={row.estado}>{row.estado.replace(/_/g, ' ')}</StatusBadge>
          </div>

          <span
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '13px',
              color: 'var(--text-primary)',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {formatEuro(row.faturado)}
          </span>

          <span
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '13px',
              color: row.emAberto > 0 ? 'var(--text-primary)' : 'var(--text-muted)',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {row.emAberto > 0 ? formatEuro(row.emAberto) : '—'}
          </span>

          <span
            className="nc-col-hide-mobile"
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '13px',
              color: 'var(--text-muted)',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {row.custosIA > 0 ? formatEuro(row.custosIA) : '—'}
          </span>

          <span
            className="nc-col-hide-mobile"
            style={{
              fontFamily: 'var(--font-geist-mono), monospace',
              fontSize: '13px',
              fontWeight: 600,
              color: row.faturado > 0
                ? row.margem >= 0
                  ? 'var(--green-600, #16a34a)'
                  : 'var(--red-600, #dc2626)'
                : 'var(--text-muted)',
              fontFeatureSettings: '"tnum"',
            }}
          >
            {row.faturado > 0 ? formatEuro(row.margem) : '—'}
          </span>
        </div>
      ))}
    </div>
  )
}
