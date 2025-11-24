import React, { useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  getFilteredRowModel,
  useReactTable,
  SortingState,
  ColumnDef,
  PaginationState,
  ColumnFiltersState,
  FilterFn,
} from '@tanstack/react-table'
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './table'

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[]
  data: TData[]
  pageSize?: number
  pageSizeOptions?: number[]
  className?: string
  emptyMessage?: string
  showPagination?: boolean
  showColumnFilters?: boolean
  filterFns?: Record<string, FilterFn<TData>>
  onTableChange?: (table: any) => void
  renderExpandedRow?: (row: TData) => React.ReactNode
  expandedRows?: Set<string>
  getRowId?: (row: TData) => string
}

export function DataTable<TData>({
  columns,
  data,
  pageSize = 10,
  pageSizeOptions = [10, 20, 50, 100],
  className,
  emptyMessage = 'No data available',
  showPagination = true,
  showColumnFilters = false,
  filterFns,
  onTableChange,
  renderExpandedRow,
  expandedRows,
  getRowId,
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>([])
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([])
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: pageSize,
  })

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      pagination,
      columnFilters,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    filterFns: filterFns as any,
  })

  // Notify parent of table changes (for stats, export, etc.)
  React.useEffect(() => {
    if (onTableChange) {
      onTableChange(table)
    }
  }, [table, onTableChange, columnFilters, sorting, pagination])

  const getSortIcon = (isSorted: false | 'asc' | 'desc') => {
    if (isSorted === 'asc') {
      return <ArrowUp className="ml-2 h-4 w-4" />
    }
    if (isSorted === 'desc') {
      return <ArrowDown className="ml-2 h-4 w-4" />
    }
    return <ArrowUpDown className="ml-2 h-4 w-4 opacity-50" />
  }

  return (
    <div className={cn('space-y-4', className)}>
      {/* Table */}
      <div className="rounded-md border border-border bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <React.Fragment key={headerGroup.id}>
                  <TableRow>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={cn(
                          'bg-muted/50 font-semibold',
                          header.column.getCanSort() && 'cursor-pointer select-none'
                        )}
                        style={{
                          width: `${header.getSize()}px`,
                          minWidth: `${header.column.columnDef.minSize ?? 20}px`,
                          maxWidth: `${header.column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER}px`
                        }}
                        onClick={header.column.getToggleSortingHandler()}
                      >
                        {header.isPlaceholder ? null : (
                          <div className="flex items-center">
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {header.column.getCanSort() && (
                              <span className="ml-auto">
                                {getSortIcon(header.column.getIsSorted())}
                              </span>
                            )}
                          </div>
                        )}
                      </TableHead>
                    ))}
                  </TableRow>
                  {showColumnFilters && (
                    <TableRow>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          className="p-2 bg-muted/30"
                          style={{
                            width: `${header.getSize()}px`,
                            minWidth: `${header.column.columnDef.minSize ?? 20}px`,
                            maxWidth: `${header.column.columnDef.maxSize ?? Number.MAX_SAFE_INTEGER}px`
                          }}
                        >
                          {header.column.getCanFilter() ? (
                            <div onClick={(e) => e.stopPropagation()}>
                              {header.column.columnDef.meta?.filterComponent
                                ? React.createElement(header.column.columnDef.meta.filterComponent as any, {
                                    column: header.column,
                                    ...(header.column.columnDef.meta?.filterOptions && {
                                      options: header.column.columnDef.meta.filterOptions
                                    }),
                                    ...(header.column.columnDef.meta?.filterPrefix && {
                                      prefix: header.column.columnDef.meta.filterPrefix
                                    })
                                  })
                                : null}
                            </div>
                          ) : null}
                        </TableHead>
                      ))}
                    </TableRow>
                  )}
                </React.Fragment>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => {
                  const rowId = getRowId ? getRowId(row.original) : row.id
                  const isExpanded = expandedRows?.has(rowId)

                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        className="hover:bg-muted/50 transition-colors"
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell key={cell.id}>
                            {flexRender(
                              cell.column.columnDef.cell,
                              cell.getContext()
                            )}
                          </TableCell>
                        ))}
                      </TableRow>
                      {isExpanded && renderExpandedRow && (
                        <TableRow className="bg-muted/30 hover:bg-muted/30">
                          <TableCell colSpan={columns.length} className="p-4">
                            {renderExpandedRow(row.original)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Pagination */}
      {showPagination && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 px-2">
          {/* Results Info */}
          <div className="text-sm text-muted-foreground">
            Showing{' '}
            <span className="font-medium text-foreground">
              {table.getState().pagination.pageIndex *
                table.getState().pagination.pageSize +
                1}
            </span>{' '}
            to{' '}
            <span className="font-medium text-foreground">
              {Math.min(
                (table.getState().pagination.pageIndex + 1) *
                  table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )}
            </span>{' '}
            of{' '}
            <span className="font-medium text-foreground">
              {table.getFilteredRowModel().rows.length}
            </span>{' '}
            results
          </div>

          <div className="flex items-center gap-2">
            {/* Page Size Selector */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground whitespace-nowrap">
                Rows per page:
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => {
                  table.setPageSize(Number(e.target.value))
                }}
                className="h-9 rounded-md border border-input bg-background px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>

            {/* Pagination Buttons */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(0)}
                disabled={!table.getCanPreviousPage()}
                className="h-9 w-9 p-0"
              >
                <ChevronsLeft className="h-4 w-4" />
                <span className="sr-only">First page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                className="h-9 w-9 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
                <span className="sr-only">Previous page</span>
              </Button>

              {/* Page Info */}
              <div className="flex items-center justify-center text-sm font-medium px-3">
                Page {table.getState().pagination.pageIndex + 1} of{' '}
                {table.getPageCount()}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                className="h-9 w-9 p-0"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Next page</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                disabled={!table.getCanNextPage()}
                className="h-9 w-9 p-0"
              >
                <ChevronsRight className="h-4 w-4" />
                <span className="sr-only">Last page</span>
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
