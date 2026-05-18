'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  useReactTable,
  getCoreRowModel,
  getFilteredRowModel,
  getSortedRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type ColumnFiltersState,
} from '@tanstack/react-table'
import { RestaurantStatusBadge } from './restaurant-status-badge'
import { StatusBadge } from '@/components/ui/status-badge'
import { EmptyState } from '@/components/ui/empty-state'
import { formatEuro, paymentLabels, timeAgo, clampPercent } from '@/lib/utils'
import type { AdminRestaurantRow, PaymentStatus } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronUp, ChevronDown, ChevronsUpDown, Search, Store } from 'lucide-react'

interface RestaurantsTableProps {
  data: AdminRestaurantRow[]
}

const paymentVariantMap: Record<PaymentStatus, 'pendente' | 'pago' | 'em_atraso' | 'isento'> = {
  pendente: 'pendente',
  pago: 'pago',
  em_atraso: 'em_atraso',
  isento: 'isento',
}

export function RestaurantsTable({ data }: RestaurantsTableProps) {
  const router = useRouter()
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const columns = useMemo<ColumnDef<AdminRestaurantRow>[]>(() => [
    {
      accessorKey: 'nome',
      header: 'Restaurante',
      cell: ({ row }) => (
        <div>
          <p style={{ fontWeight: 500, color: 'var(--text-primary)', fontSize: '14px', margin: 0 }}>
            {row.original.nome}
          </p>
          <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: '2px 0 0' }}>
            {row.original.cliente_nome}
          </p>
        </div>
      ),
    },
    {
      accessorKey: 'estado',
      header: 'Estado',
      cell: ({ row }) => <RestaurantStatusBadge estado={row.original.estado} />,
    },
    {
      id: 'ciclo',
      header: 'Ciclo',
      cell: ({ row }) => {
        const { numero_ciclo, dia_ciclo } = row.original
        if (numero_ciclo == null || dia_ciclo == null) {
          return <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>—</span>
        }
        const pct = clampPercent((dia_ciclo / 30) * 100)
        return (
          <div style={{ minWidth: '110px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-muted)', display: 'block', marginBottom: '4px' }}>
              Ciclo {numero_ciclo === 0 ? 'G' : numero_ciclo} · Dia {dia_ciclo}/30
            </span>
            <div
              style={{
                height: '4px',
                background: 'var(--bg-muted)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  background: 'var(--gray-400)',
                  width: `${pct}%`,
                  transition: 'width 400ms ease',
                }}
              />
            </div>
          </div>
        )
      },
    },
    {
      id: 'garantia',
      header: 'Garantia',
      cell: ({ row }) => {
        const { estado, contagem_actual, objetivo, garantia_pct } = row.original
        if (estado !== 'em_garantia' || objetivo == null) {
          return <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>—</span>
        }
        const pct = clampPercent(garantia_pct ?? 0)
        const urgente = pct < 50 && (row.original.dia_ciclo ?? 0) >= 20
        return (
          <div style={{ minWidth: '120px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                {contagem_actual}/{objetivo} px
              </span>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-geist-mono), monospace',
                  color: urgente ? 'var(--red-600)' : 'var(--text-secondary)',
                }}
              >
                {pct}%
              </span>
            </div>
            <div
              style={{
                height: '4px',
                background: 'var(--bg-muted)',
                borderRadius: '2px',
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  height: '100%',
                  borderRadius: '2px',
                  background: urgente
                    ? 'var(--red-500)'
                    : pct >= 75
                    ? 'var(--green-500)'
                    : 'var(--blue-500)',
                  width: `${pct}%`,
                  transition: 'width 400ms ease',
                }}
              />
            </div>
          </div>
        )
      },
    },
    {
      accessorKey: 'ultima_chamada',
      header: 'Última Chamada',
      cell: ({ row }) => (
        <span
          style={{
            fontSize: '12px',
            color: 'var(--text-muted)',
            fontFamily: 'var(--font-geist-mono), monospace',
          }}
        >
          {timeAgo(row.original.ultima_chamada)}
        </span>
      ),
    },
    {
      accessorKey: 'estado_pagamento',
      header: 'Pagamento',
      cell: ({ row }) => {
        const p = row.original.estado_pagamento as PaymentStatus | null
        if (!p) return <span style={{ color: 'var(--text-disabled)', fontSize: '12px' }}>—</span>
        return <StatusBadge variant={paymentVariantMap[p]}>{paymentLabels[p]}</StatusBadge>
      },
    },
  ], [])

  const table = useReactTable({
    data,
    columns,
    state: { sorting, columnFilters, globalFilter },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
  })

  const estadoOptions = [
    { value: 'all', label: 'Todos os estados' },
    { value: 'em_construcao', label: 'Em Construção' },
    { value: 'em_garantia', label: 'Em Garantia' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'pausado', label: 'Pausado' },
    { value: 'rescindido', label: 'Rescindido' },
  ]

  const filteredCount = table.getFilteredRowModel().rows.length

  return (
    <div
      style={{
        border: '1px solid var(--surface-border)',
        borderRadius: '16px',
        overflow: 'hidden',
        background: 'var(--surface-1)',
        boxShadow: 'var(--shadow-xs)',
      }}
    >
      {/* ── Toolbar ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--surface-border)',
          background: 'var(--surface-1)',
          flexWrap: 'wrap',
        }}
      >
        {/* Search */}
        <div style={{ position: 'relative', flexShrink: 0 }}>
          <Search
            style={{
              position: 'absolute',
              left: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              width: '14px',
              height: '14px',
              color: 'var(--text-muted)',
              pointerEvents: 'none',
            }}
          />
          <input
            type="text"
            placeholder="Pesquisar..."
            value={globalFilter}
            onChange={e => setGlobalFilter(e.target.value)}
            style={{
              height: '34px',
              paddingLeft: '32px',
              paddingRight: '12px',
              borderRadius: '8px',
              border: '1px solid var(--surface-border)',
              background: 'var(--bg-subtle)',
              fontSize: '13px',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-geist), sans-serif',
              outline: 'none',
              width: '220px',
              transition: 'border-color 150ms ease, box-shadow 150ms ease',
            }}
            onFocus={e => {
              e.currentTarget.style.borderColor = 'var(--blue-500)'
              e.currentTarget.style.boxShadow = '0 0 0 2px rgba(59,130,246,0.1)'
              e.currentTarget.style.background = 'var(--surface-1)'
            }}
            onBlur={e => {
              e.currentTarget.style.borderColor = 'var(--surface-border)'
              e.currentTarget.style.boxShadow = 'none'
              e.currentTarget.style.background = 'var(--bg-subtle)'
            }}
          />
        </div>

        {/* Estado filter */}
        <Select
          value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'all'}
          onValueChange={val => {
            table.getColumn('estado')?.setFilterValue(val === 'all' ? undefined : val)
          }}
        >
          <SelectTrigger
            style={{
              height: '34px',
              fontSize: '13px',
              width: '170px',
              background: 'var(--bg-subtle)',
              border: '1px solid var(--surface-border)',
              borderRadius: '8px',
              color: 'var(--text-primary)',
            }}
          >
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {estadoOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} style={{ fontSize: '13px' }}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Clear */}
        {!!(globalFilter || table.getColumn('estado')?.getFilterValue()) && (
          <button
            onClick={() => {
              setGlobalFilter('')
              table.getColumn('estado')?.setFilterValue(undefined)
            }}
            style={{
              fontSize: '12px',
              color: 'var(--text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px 8px',
              borderRadius: '6px',
              fontFamily: 'var(--font-geist), sans-serif',
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--text-primary)' }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--text-muted)' }}
          >
            Limpar filtros
          </button>
        )}

        <span style={{ marginLeft: 'auto', fontSize: '12px', color: 'var(--text-muted)' }}>
          {filteredCount} resultado{filteredCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* ── Table ── */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr
                key={headerGroup.id}
                style={{
                  background: 'var(--bg-subtle)',
                  borderBottom: '1px solid var(--surface-border)',
                }}
              >
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className={['ciclo', 'ultima_chamada', 'estado_pagamento'].includes(header.id) ? 'nc-col-hide-mobile' : undefined}
                    style={{
                      padding: '10px 16px',
                      textAlign: 'left',
                      fontSize: '11px',
                      fontWeight: 600,
                      textTransform: 'uppercase',
                      letterSpacing: '0.07em',
                      color: 'var(--text-muted)',
                      whiteSpace: 'nowrap',
                      userSelect: 'none',
                    }}
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        onClick={header.column.getToggleSortingHandler()}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px',
                          background: 'none',
                          border: 'none',
                          cursor: header.column.getCanSort() ? 'pointer' : 'default',
                          padding: 0,
                          color: 'inherit',
                          fontSize: 'inherit',
                          fontWeight: 'inherit',
                          textTransform: 'inherit',
                          letterSpacing: 'inherit',
                          fontFamily: 'var(--font-geist), sans-serif',
                        }}
                        onMouseEnter={e => {
                          if (header.column.getCanSort())
                            e.currentTarget.style.color = 'var(--text-secondary)'
                        }}
                        onMouseLeave={e => {
                          e.currentTarget.style.color = 'var(--text-muted)'
                        }}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span style={{ color: 'var(--text-disabled)', display: 'flex' }}>
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp style={{ width: '12px', height: '12px' }} />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown style={{ width: '12px', height: '12px' }} />
                            ) : (
                              <ChevronsUpDown style={{ width: '12px', height: '12px' }} />
                            )}
                          </span>
                        )}
                      </button>
                    )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  <EmptyState
                    icon={<Store style={{ width: '40px', height: '40px' }} />}
                    title="Nenhum restaurante encontrado"
                    description="Tenta ajustar os filtros de pesquisa."
                    action={
                      globalFilter || table.getColumn('estado')?.getFilterValue()
                        ? {
                            label: 'Limpar filtros',
                            onClick: () => {
                              setGlobalFilter('')
                              table.getColumn('estado')?.setFilterValue(undefined)
                            },
                          }
                        : undefined
                    }
                  />
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/restaurantes/${row.original.slug}`)}
                  style={{
                    borderBottom: '1px solid var(--surface-border)',
                    cursor: 'pointer',
                    transition: 'background 80ms ease',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-muted)' }}
                  onMouseLeave={e => { e.currentTarget.style.background = 'transparent' }}
                >
                  {row.getVisibleCells().map(cell => (
                    <td
                      key={cell.id}
                      className={['ciclo', 'ultima_chamada', 'estado_pagamento'].includes(cell.column.id) ? 'nc-col-hide-mobile' : undefined}
                      style={{
                        padding: '14px 16px',
                        fontSize: '14px',
                        color: 'var(--text-primary)',
                        verticalAlign: 'middle',
                      }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
