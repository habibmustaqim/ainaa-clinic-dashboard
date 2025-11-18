import React, { useState, useEffect, useMemo } from 'react'
import { ColumnDef, FilterFn } from '@tanstack/react-table'
import { FileDown, X, ChevronDown, ChevronUp } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageContainer, PageHeader } from '@/components/layout/index'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { Tooltip } from '@/components/ui/tooltip'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { exportData, ExportColumn } from '@/utils/exportUtils'
import { supabase } from '@/lib/supabase'

// Column Filter Components
import { TextColumnFilter } from '@/components/ui/filters/TextColumnFilter'
import { DateRangeColumnFilter } from '@/components/ui/filters/DateRangeColumnFilter'
import { BirthdayRangeColumnFilter } from '@/components/ui/filters/BirthdayRangeColumnFilter'
import { MultiSelectColumnFilter } from '@/components/ui/filters/MultiSelectColumnFilter'
import { NumberRangeColumnFilter } from '@/components/ui/filters/NumberRangeColumnFilter'

interface ReportRow {
  id: string
  type: 'service' | 'item'
  transactionId: string
  customerId: string // Added for accurate customer counting
  date: string
  customerName: string
  customerPhone: string
  customerBirthday: string | null
  items: string // Comma-separated list of services/items
  beautician: string // Comma-separated list of sales persons
  amount: number
  paymentMethod: string
  status: string
  discount: number
}

interface MultiSelectOption {
  value: string
  label: string
}

const TransactionReport: React.FC = () => {
  // State - Data
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<ReportRow[]>([])
  const [beauticiansOptions, setBeauticiansOptions] = useState<MultiSelectOption[]>([])
  const [servicesOptions, setServicesOptions] = useState<MultiSelectOption[]>([])
  const [tableInstance, setTableInstance] = useState<any>(null)
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // Toggle row expansion
  const toggleRowExpansion = (rowId: string) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev)
      if (newSet.has(rowId)) {
        newSet.delete(rowId)
      } else {
        newSet.add(rowId)
      }
      return newSet
    })
  }

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const pageSize = 1000

        // ===== FETCH ALL TRANSACTIONS =====
        let allTransactions: any[] = []
        let start = 0
        let hasMore = true

        while (hasMore) {
          const { data: transactions, error } = await supabase
            .from('transactions')
            .select(`
              id,
              so_number,
              transaction_date,
              payment_to_date,
              is_cancelled,
              customer_id,
              customers!inner (
                name,
                phone,
                date_of_birth
              )
            `)
            .order('transaction_date', { ascending: false })
            .range(start, start + pageSize - 1)

          if (error) throw error

          if (transactions && transactions.length > 0) {
            allTransactions = [...allTransactions, ...transactions]
            start += pageSize
            hasMore = transactions.length === pageSize
          } else {
            hasMore = false
          }
        }

        console.log('📊 REPORTING DEBUG:')
        console.log(`  - Fetched ${allTransactions.length} transactions`)

        // ===== FETCH SERVICE SALES (for linking to transactions) =====
        let allServiceSales: any[] = []
        start = 0
        hasMore = true

        while (hasMore) {
          const { data: serviceSales, error } = await supabase
            .from('service_sales')
            .select(`
              transaction_id,
              service_type,
              service_name,
              sales_person,
              discount_amount,
              payment_method,
              is_cancelled
            `)
            .range(start, start + pageSize - 1)

          if (error) throw error

          if (serviceSales && serviceSales.length > 0) {
            allServiceSales = [...allServiceSales, ...serviceSales]
            start += pageSize
            hasMore = serviceSales.length === pageSize
          } else {
            hasMore = false
          }
        }

        console.log(`  - Fetched ${allServiceSales.length} service sales`)

        // ===== FETCH ITEMS (for linking to transactions) =====
        let allItems: any[] = []
        start = 0
        hasMore = true

        while (hasMore) {
          const { data: items, error } = await supabase
            .from('items')
            .select(`
              transaction_id,
              item_name,
              sales_person,
              payment_method
            `)
            .range(start, start + pageSize - 1)

          if (error) throw error

          if (items && items.length > 0) {
            allItems = [...allItems, ...items]
            start += pageSize
            hasMore = items.length === pageSize
          } else {
            hasMore = false
          }
        }

        console.log(`  - Fetched ${allItems.length} items`)
        if (allItems.length > 0) {
          console.log('🔍 Sample item data:', allItems[0])
          const itemsWithSalesPerson = allItems.filter(i => i.sales_person)
          console.log(`🔍 Items with sales_person: ${itemsWithSalesPerson.length} / ${allItems.length}`)
          if (itemsWithSalesPerson.length > 0) {
            console.log('🔍 Sample item with sales_person:', itemsWithSalesPerson[0])
          }
        }

        // ===== FETCH ALL PAYMENTS (OPTIONAL - table may not exist yet) =====
        let allPayments: any[] = []
        start = 0
        hasMore = true

        try {
          while (hasMore) {
            const { data: payments, error } = await supabase
              .from('payments')
              .select(`
                transaction_id,
                payment_method,
                payment_amount
              `)
              .range(start, start + pageSize - 1)

            if (error) {
              console.warn('⚠️ Payments table not accessible (table may not exist yet):', error.message)
              break
            }

            if (payments && payments.length > 0) {
              allPayments = [...allPayments, ...payments]
              start += pageSize
              hasMore = payments.length === pageSize
            } else {
              hasMore = false
            }
          }

          console.log(`  - Fetched ${allPayments.length} payments`)
        } catch (err) {
          console.warn('⚠️ Could not fetch payments (table may not exist yet)')
          allPayments = []
        }

        // ===== GROUP SERVICE SALES BY TRANSACTION =====
        const serviceSalesByTx = new Map<string, any[]>()
        allServiceSales.forEach((sale) => {
          const txId = sale.transaction_id
          if (txId) {
            if (!serviceSalesByTx.has(txId)) {
              serviceSalesByTx.set(txId, [])
            }
            serviceSalesByTx.get(txId)!.push(sale)
          }
        })

        // ===== GROUP ITEMS BY TRANSACTION =====
        const itemsByTx = new Map<string, any[]>()
        allItems.forEach((item) => {
          const txId = item.transaction_id
          if (txId) {
            if (!itemsByTx.has(txId)) {
              itemsByTx.set(txId, [])
            }
            itemsByTx.get(txId)!.push(item)
          }
        })

        // ===== GROUP PAYMENTS BY TRANSACTION =====
        const paymentsByTx = new Map<string, any[]>()
        allPayments.forEach((payment) => {
          const txId = payment.transaction_id
          if (txId) {
            if (!paymentsByTx.has(txId)) {
              paymentsByTx.set(txId, [])
            }
            paymentsByTx.get(txId)!.push(payment)
          }
        })

        // ===== BUILD REPORT ROWS FROM TRANSACTIONS =====
        const reportRows: ReportRow[] = allTransactions.map((tx) => {
          const services = serviceSalesByTx.get(tx.id) || []
          const items = itemsByTx.get(tx.id) || []
          const payments = paymentsByTx.get(tx.id) || []

          // Determine type: has both, only services, or only items
          let type: 'service' | 'item' = 'service'
          if (items.length > 0 && services.length === 0) {
            type = 'item'
          }

          // Aggregate service names
          const serviceNames = services.map(s => s.service_name || s.service_type).filter(Boolean)
          const itemNames = items.map(i => i.item_name).filter(Boolean)
          const allItemsAndServices = [...serviceNames, ...itemNames]

          // Aggregate sales persons from both services and items
          const serviceSalesPersons = services.map(s => s.sales_person).filter(Boolean)
          const itemSalesPersons = items.map(i => i.sales_person).filter(Boolean)
          const allSalesPersons = [...new Set([...serviceSalesPersons, ...itemSalesPersons])]

          // Debug: Log if this is an item-only transaction
          if (items.length > 0 && services.length === 0 && itemSalesPersons.length === 0) {
            console.log('⚠️ Item transaction without sales_person:', {
              txId: tx.id,
              itemCount: items.length,
              items: items
            })
          }

          // Get payment method with fallback: service_sales.payment_method → items.payment_method → payments.payment_method → '-'
          const paymentMethod =
            (services.length > 0 && services[0].payment_method)
              ? services[0].payment_method
              : (items.length > 0 && items[0].payment_method)
                ? items[0].payment_method
                : (payments.length > 0 && payments[0].payment_method)
                  ? payments[0].payment_method
                  : '-'
          const totalDiscount = services.reduce((sum, s) => sum + (s.discount_amount || 0), 0)

          // Check if any service is cancelled
          const isCancelled = services.some(s => s.is_cancelled) || tx.is_cancelled

          return {
            id: tx.id,
            type,
            transactionId: tx.id,
            customerId: tx.customer_id || '',
            date: tx.transaction_date || '',
            customerName: tx.customers?.name || 'Unknown',
            customerPhone: tx.customers?.phone || '-',
            customerBirthday: tx.customers?.date_of_birth || null,
            items: allItemsAndServices.join(', ') || '-',
            beautician: allSalesPersons.join(', ') || '-',
            amount: tx.payment_to_date || 0, // USE PAYMENT_TO_DATE from transactions
            paymentMethod,
            status: isCancelled ? 'Cancelled' : 'Completed',
            discount: totalDiscount,
          }
        })

        console.log(`  - Built ${reportRows.length} report rows`)
        if (reportRows.length > 0) {
          console.log('  - Sample row:', reportRows[0])
          console.log('  - Total revenue (should match Homepage):', reportRows.reduce((sum, r) => sum + r.amount, 0))
        }

        setRawData(reportRows)

        // Extract unique beauticians
        const allBeauticians = new Set<string>()
        reportRows.forEach(row => {
          row.beautician.split(',').forEach(b => {
            const trimmed = b.trim()
            if (trimmed && trimmed !== '-') allBeauticians.add(trimmed)
          })
        })
        setBeauticiansOptions(
          Array.from(allBeauticians).sort().map(b => ({ value: b, label: b }))
        )

        // Extract unique items/services
        const allServices = new Set<string>()
        reportRows.forEach(row => {
          row.items.split(',').forEach(s => {
            const trimmed = s.trim()
            if (trimmed && trimmed !== '-') allServices.add(trimmed)
          })
        })
        setServicesOptions(
          Array.from(allServices).sort().map(s => ({ value: s, label: s }))
        )
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Custom filter functions
  const filterFns: Record<string, FilterFn<ReportRow>> = {
    dateBetween: (row, columnId, filterValue) => {
      const date = new Date(row.getValue(columnId) as string)
      const [min, max] = filterValue as [string | null, string | null]
      if (!min && !max) return true
      if (min && date < new Date(min)) return false
      if (max && date > new Date(max)) return false
      return true
    },
    birthdayBetween: (row, columnId, filterValue) => {
      const birthday = row.getValue(columnId) as string | null

      // If no birthday data, exclude from results
      if (!birthday) {
        console.log('🔍 Birthday filter: No birthday data for row')
        return false
      }

      const [minMMDD, maxMMDD] = filterValue as [string | null, string | null]

      // If no filter applied, include all
      if (!minMMDD && !maxMMDD) return true

      console.log('🔍 Birthday filter debug:', {
        birthday,
        minMMDD,
        maxMMDD
      })

      // Extract month-day from birthday
      // Handle multiple formats: YYYY-MM-DD, MM/DD/YYYY, etc.
      let month: string
      let day: string

      if (birthday.includes('-')) {
        // YYYY-MM-DD format
        const parts = birthday.split('-')
        if (parts.length === 3) {
          month = parts[1].padStart(2, '0')
          day = parts[2].padStart(2, '0')
        } else {
          console.warn('Invalid date format:', birthday)
          return false
        }
      } else if (birthday.includes('/')) {
        // MM/DD/YYYY format
        const parts = birthday.split('/')
        if (parts.length === 3) {
          month = parts[0].padStart(2, '0')
          day = parts[1].padStart(2, '0')
        } else {
          console.warn('Invalid date format:', birthday)
          return false
        }
      } else {
        // Try parsing as Date object
        const date = new Date(birthday)
        if (isNaN(date.getTime())) {
          console.warn('Could not parse date:', birthday)
          return false
        }
        month = String(date.getMonth() + 1).padStart(2, '0')
        day = String(date.getDate()).padStart(2, '0')
      }

      const birthdayMMDD = `${month}-${day}`
      console.log('🔍 Extracted birthday MM-DD:', birthdayMMDD)

      // Compare month-day strings
      let result = false
      if (minMMDD && maxMMDD) {
        // Handle year-spanning ranges (e.g., 12-15 to 01-15)
        if (minMMDD > maxMMDD) {
          result = birthdayMMDD >= minMMDD || birthdayMMDD <= maxMMDD
        } else {
          // Normal range
          result = birthdayMMDD >= minMMDD && birthdayMMDD <= maxMMDD
        }
      } else if (minMMDD) {
        result = birthdayMMDD >= minMMDD
      } else if (maxMMDD) {
        result = birthdayMMDD <= maxMMDD
      }

      console.log('🔍 Filter result:', result)
      return result
    },
    arrIncludesSome: (row, columnId, filterValue: string[]) => {
      if (!filterValue || filterValue.length === 0) return true
      return filterValue.includes(row.getValue(columnId) as string)
    },
    inNumberRange: (row, columnId, filterValue) => {
      const value = row.getValue(columnId) as number
      const [min, max] = filterValue as [number | null, number | null]
      if (min !== null && value < min) return false
      if (max !== null && value > max) return false
      return true
    }
  }

  // Table columns
  const columns: ColumnDef<ReportRow>[] = useMemo(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => {
        const isExpanded = expandedRows.has(row.original.id)
        return (
          <button
            onClick={() => toggleRowExpansion(row.original.id)}
            className="p-1 hover:bg-accent rounded transition-colors"
          >
            {isExpanded ? (
              <ChevronUp className="h-4 w-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            )}
          </button>
        )
      },
      size: 40,
    },
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => (
        <div className="w-24 whitespace-nowrap">{formatDate(row.getValue('date'))}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'dateBetween',
      meta: {
        filterComponent: DateRangeColumnFilter
      }
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      cell: ({ row }) => {
        const name = row.getValue('customerName') as string
        return (
          <Tooltip content={name}>
            <div className="max-w-[150px] truncate cursor-help">
              {name}
            </div>
          </Tooltip>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      meta: {
        filterComponent: TextColumnFilter
      }
    },
    {
      accessorKey: 'customerPhone',
      header: 'Phone',
      cell: ({ row }) => (
        <div className="w-32 whitespace-nowrap">{row.getValue('customerPhone')}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      meta: {
        filterComponent: TextColumnFilter
      }
    },
    {
      accessorKey: 'customerBirthday',
      header: 'Birthday',
      cell: ({ row }) => {
        const birthday = row.getValue('customerBirthday') as string | null
        return <div className="w-24 whitespace-nowrap">{birthday ? formatDate(birthday) : '-'}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'birthdayBetween',
      meta: {
        filterComponent: BirthdayRangeColumnFilter
      }
    },
    {
      accessorKey: 'type',
      header: 'Type',
      cell: ({ row }) => {
        const type = row.getValue('type') as string
        return <div className="w-16 whitespace-nowrap">{type === 'service' ? 'Service' : 'Item'}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: [
          { value: 'service', label: 'Service' },
          { value: 'item', label: 'Item' }
        ]
      }
    },
    {
      accessorKey: 'items',
      header: 'Services/Items',
      cell: ({ row }) => {
        const items = row.getValue('items') as string
        return (
          <Tooltip content={items}>
            <div className="max-w-[250px] truncate cursor-help">
              {items}
            </div>
          </Tooltip>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: servicesOptions
      }
    },
    {
      accessorKey: 'beautician',
      header: 'Beautician',
      cell: ({ row }) => {
        const beautician = row.getValue('beautician') as string
        return (
          <Tooltip content={beautician}>
            <div className="max-w-[120px] truncate cursor-help">
              {beautician}
            </div>
          </Tooltip>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: beauticiansOptions
      }
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => (
        <div className="w-28 whitespace-nowrap text-right">{formatCurrency(row.getValue('amount'))}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'inNumberRange',
      meta: {
        filterComponent: NumberRangeColumnFilter,
        filterPrefix: 'RM'
      }
    },
    {
      accessorKey: 'discount',
      header: 'Discount',
      cell: ({ row }) => (
        <div className="w-24 whitespace-nowrap text-right">{formatCurrency(row.getValue('discount'))}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment',
      cell: ({ row }) => (
        <div className="w-20 whitespace-nowrap">{row.getValue('paymentMethod')}</div>
      ),
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <div className="w-24">
            <Badge
              variant={status === 'Completed' ? 'default' : 'destructive'}
              className="text-xs whitespace-nowrap"
            >
              {status}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
    },
  ], [beauticiansOptions, servicesOptions, expandedRows])

  // Export columns
  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (row: ReportRow) => formatDate(row.date), width: 12 },
    { header: 'Customer', accessor: 'customerName', width: 20 },
    { header: 'Phone', accessor: 'customerPhone', width: 15 },
    { header: 'Birthday', accessor: (row: ReportRow) => row.customerBirthday ? formatDate(row.customerBirthday) : '-', width: 12 },
    { header: 'Type', accessor: (row: ReportRow) => row.type === 'service' ? 'Service' : 'Item', width: 10 },
    { header: 'Services/Items', accessor: 'items', width: 30 },
    { header: 'Beautician', accessor: 'beautician', width: 15 },
    { header: 'Amount', accessor: (row: ReportRow) => formatCurrency(row.amount), width: 12 },
    { header: 'Discount', accessor: (row: ReportRow) => formatCurrency(row.discount), width: 12 },
    { header: 'Payment Method', accessor: 'paymentMethod', width: 15 },
    { header: 'Status', accessor: 'status', width: 10 },
  ]

  // Expanded row renderer
  const renderExpandedRow = (row: ReportRow) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Customer Name</div>
          <div className="text-sm text-foreground">{row.customerName}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Phone Number</div>
          <div className="text-sm text-foreground">{row.customerPhone || '-'}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Birthday</div>
          <div className="text-sm text-foreground">
            {row.customerBirthday ? formatDate(row.customerBirthday) : '-'}
          </div>
        </div>
        <div className="md:col-span-2">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Services/Items</div>
          <div className="text-sm text-foreground">{row.items}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Beautician/Sales Person</div>
          <div className="text-sm text-foreground">{row.beautician || '-'}</div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Transaction ID</div>
          <div className="text-xs text-muted-foreground font-mono">{row.transactionId}</div>
        </div>
      </div>
    )
  }

  // Export handlers
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const filename = `sales-report-${new Date().toISOString().split('T')[0]}`
    const title = 'Sales Report - Ainaa Clinic'

    const filteredData = tableInstance
      ? tableInstance.getFilteredRowModel().rows.map((row: any) => row.original)
      : rawData

    exportData(format, {
      filename,
      title,
      columns: exportColumns,
      data: filteredData,
    })
  }

  if (loading) {
    return (
      <Layout>
        <PageContainer>
          <div className="flex items-center justify-center h-96">
            <LoadingSpinner size="lg" />
          </div>
        </PageContainer>
      </Layout>
    )
  }

  return (
    <Layout>
      <PageContainer>
        <PageHeader
          title="Transaction Report"
          description="Generate comprehensive transaction reports with advanced filtering and export options"
        />

        {/* Filter Section */}
        {tableInstance && (
          <div className="bg-card border border-border rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-foreground">Filters</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => tableInstance.resetColumnFilters()}
                className="h-8 text-xs"
              >
                <X className="h-3.5 w-3.5 mr-1.5" />
                Clear All Filters
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              <MultiSelectColumnFilter
                key={`type-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('type')!}
                options={[
                  { value: 'service', label: 'Service' },
                  { value: 'item', label: 'Item' }
                ]}
                placeholder="Type"
              />
              <DateRangeColumnFilter
                key={`date-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('date')!}
                placeholder="Visit Date"
              />
              <BirthdayRangeColumnFilter
                key={`birthday-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerBirthday')!}
                placeholder="Customer Birthday"
              />
              <TextColumnFilter
                key={`customer-name-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerName')!}
                placeholder="Customer Name"
              />
              <TextColumnFilter
                key={`customer-phone-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerPhone')!}
                placeholder="Phone Number"
              />
              <MultiSelectColumnFilter
                key={`items-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('items')!}
                options={servicesOptions}
                placeholder="Services/Items"
              />
              <MultiSelectColumnFilter
                key={`beautician-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('beautician')!}
                options={beauticiansOptions}
                placeholder="Beautician"
              />
              <NumberRangeColumnFilter
                key={`amount-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('amount')!}
                placeholder="Amount Range"
              />
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {tableInstance
              ? `${tableInstance.getFilteredRowModel().rows.length} of ${rawData.length} records`
              : `${rawData.length} records`}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleExport('csv')}>
              <FileDown className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('excel')}>
              <FileDown className="h-4 w-4 mr-2" />
              Export Excel
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleExport('pdf')}>
              <FileDown className="h-4 w-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        {/* Data Table */}
        <DataTable
          columns={columns}
          data={rawData}
          pageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No data matches your filters"
          showColumnFilters={false}
          filterFns={filterFns}
          onTableChange={setTableInstance}
          renderExpandedRow={renderExpandedRow}
          expandedRows={expandedRows}
          getRowId={(row) => row.id}
        />
      </PageContainer>
    </Layout>
  )
}

export default TransactionReport
