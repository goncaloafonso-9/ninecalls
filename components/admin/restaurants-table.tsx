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
import { cn, formatEuro, paymentColors, paymentLabels, timeAgo, clampPercent } from '@/lib/utils'
import type { AdminRestaurantRow, RestaurantEstado } from '@/types'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

interface RestaurantsTableProps {
  data: AdminRestaurantRow[]
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
          <p className="font-medium text-slate-900 text-sm">{row.original.nome}</p>
          <p className="text-xs text-slate-400 mt-0.5">{row.original.cliente_nome}</p>
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
        if (numero_ciclo == null || dia_ciclo == null) return <span className="text-slate-300 text-xs">—</span>
        const pct = clampPercent((dia_ciclo / 30) * 100)
        return (
          <div className="min-w-[100px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">
                Ciclo {numero_ciclo === 0 ? 'G' : numero_ciclo} · Dia {dia_ciclo}/30
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-slate-400 rounded-full transition-all"
                style={{ width: `${pct}%` }}
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
          return <span className="text-slate-300 text-xs">—</span>
        }
        const pct = clampPercent(garantia_pct ?? 0)
        const urgente = pct < 50 && (row.original.dia_ciclo ?? 0) >= 20

        return (
          <div className="min-w-[110px]">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-slate-500">{contagem_actual}/{objetivo} px</span>
              <span className={cn('text-xs font-semibold tabular-nums', urgente ? 'text-red-500' : 'text-slate-600')}>
                {pct}%
              </span>
            </div>
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className={cn('h-full rounded-full transition-all', urgente ? 'bg-red-400' : pct >= 75 ? 'bg-green-500' : 'bg-blue-400')}
                style={{ width: `${pct}%` }}
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
        <span className="text-xs text-slate-500">{timeAgo(row.original.ultima_chamada)}</span>
      ),
    },
    {
      accessorKey: 'estado_pagamento',
      header: 'Pagamento',
      cell: ({ row }) => {
        const p = row.original.estado_pagamento
        if (!p) return <span className="text-slate-300 text-xs">—</span>
        return (
          <span className={cn('text-xs px-2 py-0.5 rounded-full border font-medium', paymentColors[p])}>
            {paymentLabels[p]}
          </span>
        )
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

  const estadoOptions: { value: string; label: string }[] = [
    { value: 'all', label: 'Todos os estados' },
    { value: 'em_construcao', label: 'Em Construção' },
    { value: 'em_garantia', label: 'Em Garantia' },
    { value: 'ativo', label: 'Ativo' },
    { value: 'pausado', label: 'Pausado' },
    { value: 'rescindido', label: 'Rescindido' },
  ]

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      {/* Filters */}
      <div className="flex items-center gap-3 p-4 border-b border-slate-100">
        <Input
          placeholder="Pesquisar restaurante ou cliente..."
          value={globalFilter}
          onChange={e => setGlobalFilter(e.target.value)}
          className="h-8 text-sm max-w-xs bg-slate-50 border-slate-200 placeholder:text-slate-300"
        />
        <Select
          value={(table.getColumn('estado')?.getFilterValue() as string) ?? 'all'}
          onValueChange={val => {
            table.getColumn('estado')?.setFilterValue(val === 'all' ? undefined : val)
          }}
        >
          <SelectTrigger className="h-8 text-sm w-[180px] bg-slate-50 border-slate-200">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            {estadoOptions.map(opt => (
              <SelectItem key={opt.value} value={opt.value} className="text-sm">
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <span className="ml-auto text-xs text-slate-400">
          {table.getFilteredRowModel().rows.length} resultados
        </span>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            {table.getHeaderGroups().map(headerGroup => (
              <tr key={headerGroup.id} className="border-b border-slate-100 bg-slate-50/60">
                {headerGroup.headers.map(header => (
                  <th
                    key={header.id}
                    className="text-left px-4 py-2.5 text-xs font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap select-none"
                  >
                    {header.isPlaceholder ? null : (
                      <button
                        className={cn('flex items-center gap-1', header.column.getCanSort() && 'cursor-pointer hover:text-slate-700')}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {flexRender(header.column.columnDef.header, header.getContext())}
                        {header.column.getCanSort() && (
                          <span className="text-slate-300">
                            {header.column.getIsSorted() === 'asc' ? (
                              <ChevronUp className="w-3 h-3" />
                            ) : header.column.getIsSorted() === 'desc' ? (
                              <ChevronDown className="w-3 h-3" />
                            ) : (
                              <ChevronsUpDown className="w-3 h-3" />
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
                <td colSpan={columns.length} className="py-12 text-center text-slate-400 text-sm">
                  Nenhum restaurante encontrado
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map(row => (
                <tr
                  key={row.id}
                  onClick={() => router.push(`/admin/restaurantes/${row.original.slug}`)}
                  className="border-b border-slate-50 hover:bg-slate-50/80 cursor-pointer transition-colors"
                >
                  {row.getVisibleCells().map(cell => (
                    <td key={cell.id} className="px-4 py-3 align-middle">
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
