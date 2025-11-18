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
import { ColumnSelectionModal, ColumnOption } from '@/components/ui/ColumnSelectionModal'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { exportData, ExportColumn } from '@/utils/exportUtils'
import { supabase } from '@/lib/supabase'

// Column Filter Components
import { TextColumnFilter } from '@/components/ui/filters/TextColumnFilter'
import { DateRangeColumnFilter } from '@/components/ui/filters/DateRangeColumnFilter'
import { BirthdayRangeColumnFilter } from '@/components/ui/filters/BirthdayRangeColumnFilter'
import { MultiSelectColumnFilter } from '@/components/ui/filters/MultiSelectColumnFilter'
import { NumberRangeColumnFilter } from '@/components/ui/filters/NumberRangeColumnFilter'

interface CustomerReportRow {
  id: string
  customerId: string
  customerName: string
  customerPhone: string
  membershipNumber: string
  customerBirthday: string | null

  // Transaction Metrics
  totalTransactions: number
  totalRevenue: number
  totalDiscount: number
  avgTransactionAmount: number
  totalServices: number
  totalItems: number

  // Visit Metrics
  firstVisitDate: string | null
  lastVisitDate: string | null
  daysSinceLastVisit: number | null

  // Purchase Behavior
  topServices: string

  // Segmentation
  customerSegment: 'Active' | 'At Risk' | 'Dormant' | 'New'
}

interface MultiSelectOption {
  value: string
  label: string
}

const CustomerReport: React.FC = () => {
  // State - Data
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<CustomerReportRow[]>([])
  const [tableInstance, setTableInstance] = useState<any>(null)

  // State - Expanded Rows
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

  // State - Column Selection Modal
  const [isColumnModalOpen, setIsColumnModalOpen] = useState(false)
  const [pendingExportFormat, setPendingExportFormat] = useState<'csv' | 'excel' | 'pdf' | null>(null)

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

  // Helper Functions
  const getTopServices = (serviceSales: any[], topN = 3) => {
    if (!serviceSales || serviceSales.length === 0) return '-'
    const frequency: Record<string, number> = {}
    serviceSales.forEach(s => {
      const name = s.service_type || 'Unknown'
      frequency[name] = (frequency[name] || 0) + 1
    })
    return Object.entries(frequency)
      .sort((a, b) => b[1] - a[1])
      .slice(0, topN)
      .map(([name]) => name)
      .join(', ')
  }

  const getCustomerSegment = (lastVisitDate: string | null, totalTransactions: number): 'Active' | 'At Risk' | 'Dormant' | 'New' => {
    if (!lastVisitDate || totalTransactions === 0) return 'New'
    const daysSince = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince <= 90) return 'Active'
    if (daysSince <= 180) return 'At Risk'
    return 'Dormant'
  }

  const getDaysSinceLastVisit = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return null
    return Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
  }

  // Data Fetching
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      console.log('📊 CUSTOMER REPORT DEBUG:')

      try {
        const pageSize = 1000

        // Fetch all customers
        let allCustomers: any[] = []
        let start = 0
        let hasMore = true

        while (hasMore) {
          const { data: customers, error: customersError } = await supabase
            .from('customers')
            .select('*')
            .order('name')
            .range(start, start + pageSize - 1)

          if (customersError) throw customersError

          if (customers && customers.length > 0) {
            allCustomers = [...allCustomers, ...customers]
            start += pageSize
            hasMore = customers.length === pageSize
          } else {
            hasMore = false
          }
        }
        console.log(`  - Fetched ${allCustomers.length} customers`)

        // Fetch all transactions
        let allTransactions: any[] = []
        start = 0
        hasMore = true

        while (hasMore) {
          const { data: transactions, error: transactionsError } = await supabase
            .from('transactions')
            .select('*')
            .range(start, start + pageSize - 1)

          if (transactionsError) throw transactionsError

          if (transactions && transactions.length > 0) {
            allTransactions = [...allTransactions, ...transactions]
            start += pageSize
            hasMore = transactions.length === pageSize
          } else {
            hasMore = false
          }
        }
        console.log(`  - Fetched ${allTransactions.length} transactions`)

        // Fetch all service sales
        let allServiceSales: any[] = []
        start = 0
        hasMore = true

        while (hasMore) {
          const { data: serviceSales, error: serviceSalesError } = await supabase
            .from('service_sales')
            .select('*')
            .range(start, start + pageSize - 1)

          if (serviceSalesError) throw serviceSalesError

          if (serviceSales && serviceSales.length > 0) {
            allServiceSales = [...allServiceSales, ...serviceSales]
            start += pageSize
            hasMore = serviceSales.length === pageSize
          } else {
            hasMore = false
          }
        }
        console.log(`  - Fetched ${allServiceSales.length} service sales`)

        // Fetch all items
        let allItems: any[] = []
        start = 0
        hasMore = true

        while (hasMore) {
          const { data: items, error: itemsError } = await supabase
            .from('items')
            .select('*')
            .range(start, start + pageSize - 1)

          if (itemsError) throw itemsError

          if (items && items.length > 0) {
            allItems = [...allItems, ...items]
            start += pageSize
            hasMore = items.length === pageSize
          } else {
            hasMore = false
          }
        }
        console.log(`  - Fetched ${allItems.length} items`)

        // Group transactions by customer
        const transactionsByCustomer: Record<string, any[]> = {}
        allTransactions?.forEach(t => {
          if (!transactionsByCustomer[t.customer_id]) {
            transactionsByCustomer[t.customer_id] = []
          }
          transactionsByCustomer[t.customer_id].push(t)
        })

        // Group service sales by customer
        const serviceSalesByCustomer: Record<string, any[]> = {}
        allServiceSales?.forEach(s => {
          if (s.customer_id) {
            if (!serviceSalesByCustomer[s.customer_id]) {
              serviceSalesByCustomer[s.customer_id] = []
            }
            serviceSalesByCustomer[s.customer_id].push(s)
          }
        })

        // Group items by customer (via transaction join)
        const itemsByCustomer: Record<string, any[]> = {}
        allItems?.forEach(item => {
          const transaction = allTransactions?.find(t => t.id === item.transaction_id)
          if (transaction?.customer_id) {
            if (!itemsByCustomer[transaction.customer_id]) {
              itemsByCustomer[transaction.customer_id] = []
            }
            itemsByCustomer[transaction.customer_id].push(item)
          }
        })

        // Build customer report rows
        const customerReportRows: CustomerReportRow[] = allCustomers?.map(customer => {
          const customerTransactions = transactionsByCustomer[customer.id] || []
          const customerServiceSales = serviceSalesByCustomer[customer.id] || []
          const customerItems = itemsByCustomer[customer.id] || []

          // Calculate metrics
          const totalTransactions = customerTransactions.length
          const totalRevenue = customerTransactions.reduce((sum, t) => sum + (t.payment_to_date || 0), 0)
          const totalDiscount = customerTransactions.reduce((sum, t) => sum + (t.total_discount || 0), 0)
          const avgTransactionAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
          const totalServices = customerServiceSales.length
          const totalItems = customerItems.length

          // Visit dates
          const sortedDates = customerTransactions
            .map(t => t.transaction_date)
            .filter(d => d)
            .sort()
          const firstVisitDate = sortedDates.length > 0 ? sortedDates[0] : null
          const lastVisitDate = sortedDates.length > 0 ? sortedDates[sortedDates.length - 1] : null
          const daysSinceLastVisit = getDaysSinceLastVisit(lastVisitDate)

          // Purchase behavior
          const topServices = getTopServices(customerServiceSales)

          // Segmentation
          const customerSegment = getCustomerSegment(lastVisitDate, totalTransactions)

          return {
            id: customer.id,
            customerId: customer.id,
            customerName: customer.name || 'Unknown',
            customerPhone: customer.phone || '',
            membershipNumber: customer.membership_number || 'N/A',
            customerBirthday: customer.date_of_birth || null,

            totalTransactions,
            totalRevenue,
            totalDiscount,
            avgTransactionAmount,
            totalServices,
            totalItems,

            firstVisitDate,
            lastVisitDate,
            daysSinceLastVisit,

            topServices,

            customerSegment
          }
        }) || []

        console.log(`  - Built ${customerReportRows.length} customer report rows`)
        console.log(`  - Sample row:`, customerReportRows[0])

        setRawData(customerReportRows)

      } catch (error) {
        console.error('Error fetching customer report data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Custom filter functions
  const filterFns: Record<string, FilterFn<CustomerReportRow>> = {
    includesString: (row, columnId, filterValue) => {
      const value = row.getValue(columnId) as string
      return value?.toLowerCase().includes(filterValue.toLowerCase()) || false
    },
    dateBetween: (row, columnId, filterValue) => {
      const dateStr = row.getValue(columnId) as string
      const [min, max] = filterValue as [string | null, string | null]

      // No filter applied - show all rows including nulls
      if (!min && !max) return true

      // Filter applied but value is null - exclude
      if (!dateStr) return false

      // Check if date matches filter
      const date = new Date(dateStr)
      if (min && date < new Date(min)) return false
      if (max && date > new Date(max)) return false
      return true
    },
    birthdayBetween: (row, columnId, filterValue) => {
      const birthdayStr = row.getValue(columnId) as string | null
      const [minMMDD, maxMMDD] = filterValue as [string | null, string | null]

      // No filter applied - show all rows including nulls
      if (!minMMDD && !maxMMDD) return true

      // Filter applied but value is null - exclude
      if (!birthdayStr) return false

      // Check if birthday matches filter
      const birthday = new Date(birthdayStr)
      const month = birthday.getMonth() + 1
      const day = birthday.getDate()
      const mmdd = `${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

      if (minMMDD && maxMMDD) {
        if (minMMDD <= maxMMDD) {
          return mmdd >= minMMDD && mmdd <= maxMMDD
        } else {
          return mmdd >= minMMDD || mmdd <= maxMMDD
        }
      } else if (minMMDD) {
        return mmdd >= minMMDD
      } else if (maxMMDD) {
        return mmdd <= maxMMDD
      }
      return true
    },
    arrIncludesSome: (row, columnId, filterValue) => {
      if (!filterValue || filterValue.length === 0) return true
      const value = row.getValue(columnId) as string
      return filterValue.some((filter: string) => value?.includes(filter))
    },
    inNumberRange: (row, columnId, filterValue) => {
      const value = row.getValue(columnId) as number
      const [min, max] = filterValue as [string | null, string | null]

      // No filter applied - show all rows including nulls/zeros
      if (!min && !max) return true

      // Filter applied but value is null/undefined - exclude
      if (value === null || value === undefined) return false

      // Check if number matches filter
      const minNum = min ? parseFloat(min) : -Infinity
      const maxNum = max ? parseFloat(max) : Infinity
      return value >= minNum && value <= maxNum
    }
  }

  // Segment options
  const segmentOptions: MultiSelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'At Risk', label: 'At Risk' },
    { value: 'Dormant', label: 'Dormant' },
    { value: 'New', label: 'New' }
  ]

  // Table columns
  const columns: ColumnDef<CustomerReportRow>[] = useMemo(() => [
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
      accessorKey: 'membershipNumber',
      header: () => (
        <Tooltip content="Unique customer membership/clinic ID" side="bottom">
          <div className="cursor-help">Membership ID</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const membershipNumber = row.getValue('membershipNumber') as string
        return <div className="w-[100px] text-center whitespace-nowrap">{membershipNumber}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'includesString',
      meta: {
        filterComponent: TextColumnFilter
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
        return <div className="w-[90px] whitespace-nowrap">{birthday ? formatDate(birthday) : '-'}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'birthdayBetween',
      meta: {
        filterComponent: BirthdayRangeColumnFilter
      }
    },
    // Visit Metrics
    {
      accessorKey: 'totalTransactions',
      header: () => (
        <Tooltip content="Total count of transactions/visits by this customer" side="bottom">
          <div className="cursor-help">Total Visits</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-24 whitespace-nowrap text-center">{row.getValue('totalTransactions')}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'inNumberRange',
      meta: {
        filterComponent: NumberRangeColumnFilter
      }
    },
    {
      accessorKey: 'firstVisitDate',
      header: () => (
        <Tooltip content="Date of customer's first transaction" side="bottom">
          <div className="cursor-help">First Visit</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const date = row.getValue('firstVisitDate') as string | null
        return <div className="w-[90px] whitespace-nowrap">{date ? formatDate(date) : '-'}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'dateBetween',
      meta: {
        filterComponent: DateRangeColumnFilter
      }
    },
    {
      accessorKey: 'lastVisitDate',
      header: () => (
        <Tooltip content="Most recent transaction date" side="bottom">
          <div className="cursor-help">Last Visit</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const date = row.getValue('lastVisitDate') as string | null
        return <div className="w-[90px] whitespace-nowrap">{date ? formatDate(date) : '-'}</div>
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'dateBetween',
      meta: {
        filterComponent: DateRangeColumnFilter
      }
    },
    {
      accessorKey: 'daysSinceLastVisit',
      header: () => (
        <Tooltip content="Days elapsed since last transaction" side="bottom">
          <div className="cursor-help">Days Since Visit</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const days = row.getValue('daysSinceLastVisit') as number | null
        return <div className="w-28 whitespace-nowrap text-center">{days !== null ? days : '-'}</div>
      },
      enableSorting: true,
    },
    // Transaction Metrics
    {
      accessorKey: 'totalRevenue',
      header: () => (
        <Tooltip content="Sum of all payments from customer transactions" side="bottom">
          <div className="cursor-help">Total Revenue</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-32 whitespace-nowrap text-right">{formatCurrency(row.getValue('totalRevenue'))}</div>
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
      accessorKey: 'avgTransactionAmount',
      header: () => (
        <Tooltip content="Average value per transaction (Total Revenue ÷ Total Visits)" side="bottom">
          <div className="cursor-help">Avg Transaction</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-32 whitespace-nowrap text-right">{formatCurrency(row.getValue('avgTransactionAmount'))}</div>
      ),
      enableSorting: true,
    },
    // Purchase Behavior
    {
      accessorKey: 'totalServices',
      header: () => (
        <Tooltip content="Count of services purchased by this customer" side="bottom">
          <div className="cursor-help">Total Services</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-24 whitespace-nowrap text-center">{row.getValue('totalServices')}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'inNumberRange',
      meta: {
        filterComponent: NumberRangeColumnFilter
      }
    },
    {
      accessorKey: 'totalItems',
      header: () => (
        <Tooltip content="Count of product items purchased by this customer" side="bottom">
          <div className="cursor-help">Total Items</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-24 whitespace-nowrap text-center">{row.getValue('totalItems')}</div>
      ),
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'inNumberRange',
      meta: {
        filterComponent: NumberRangeColumnFilter
      }
    },
    {
      accessorKey: 'topServices',
      header: () => (
        <Tooltip content="Top 3 services by purchase frequency" side="bottom">
          <div className="cursor-help">Top Services</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const services = row.getValue('topServices') as string
        return (
          <Tooltip content={services}>
            <div className="max-w-[200px] truncate cursor-help">
              {services}
            </div>
          </Tooltip>
        )
      },
      enableSorting: true,
    },
    {
      accessorKey: 'customerSegment',
      header: () => (
        <Tooltip content="Active (≤90 days), At Risk (91-180 days), Dormant (>180 days), New (no visits)" side="bottom">
          <div className="cursor-help">Segment</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const segment = row.getValue('customerSegment') as string
        const variantMap: Record<string, 'default' | 'secondary' | 'destructive' | 'outline'> = {
          'Active': 'default',
          'At Risk': 'secondary',
          'Dormant': 'destructive',
          'New': 'outline'
        }
        return (
          <div className="w-24">
            <Badge
              variant={variantMap[segment] || 'outline'}
              className="text-xs whitespace-nowrap"
            >
              {segment}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: segmentOptions
      }
    },
  ], [expandedRows])

  // Export columns (all available columns)
  // Using proportional widths that auto-scale to fit page width
  // Grouped by category: Customer Info → Visit Metrics → Transaction Metrics → Purchase Behavior → Segmentation
  const exportColumns: ExportColumn[] = [
    // Customer Info
    { header: 'Membership ID', accessor: 'membershipNumber', width: 20 },
    { header: 'Customer Name', accessor: 'customerName', width: 55 },
    { header: 'Phone', accessor: 'customerPhone', width: 35 },
    { header: 'Birthday', accessor: (row: CustomerReportRow) => row.customerBirthday ? formatDate(row.customerBirthday) : '-', width: 25 },
    // Visit Metrics
    { header: 'Total Visits', accessor: 'totalTransactions', width: 22 },
    { header: 'First Visit', accessor: (row: CustomerReportRow) => row.firstVisitDate ? formatDate(row.firstVisitDate) : '-', width: 25 },
    { header: 'Last Visit', accessor: (row: CustomerReportRow) => row.lastVisitDate ? formatDate(row.lastVisitDate) : '-', width: 25 },
    { header: 'Days Since Visit', accessor: (row: CustomerReportRow) => row.daysSinceLastVisit !== null ? row.daysSinceLastVisit.toString() : '-', width: 28 },
    // Transaction Metrics
    { header: 'Total Revenue', accessor: (row: CustomerReportRow) => formatCurrency(row.totalRevenue), width: 30 },
    { header: 'Avg Transaction', accessor: (row: CustomerReportRow) => formatCurrency(row.avgTransactionAmount), width: 30 },
    // Purchase Behavior
    { header: 'Total Services', accessor: 'totalServices', width: 22 },
    { header: 'Total Items', accessor: 'totalItems', width: 22 },
    { header: 'Top Services', accessor: 'topServices', width: 70 },
    // Segmentation
    { header: 'Segment', accessor: 'customerSegment', width: 25 },
  ]

  // Column options for selection modal
  const columnOptions: ColumnOption[] = exportColumns.map((col, index) => ({
    id: index.toString(),
    label: col.header,
    required: col.header === 'Customer Name' // Make customer name required
  }))

  // Expanded row renderer
  const renderExpandedRow = (row: CustomerReportRow) => {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 py-2">
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Customer ID</div>
          <div className="text-xs text-muted-foreground font-mono">{row.customerId}</div>
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
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">First Visit</div>
          <div className="text-sm text-foreground">
            {row.firstVisitDate ? formatDate(row.firstVisitDate) : '-'}
          </div>
        </div>
        <div>
          <div className="text-xs font-semibold text-muted-foreground mb-1">Total Discount Given</div>
          <div className="text-sm text-foreground">{formatCurrency(row.totalDiscount)}</div>
        </div>
        <div className="md:col-span-3">
          <div className="text-xs font-semibold text-muted-foreground mb-1">Top Services Purchased</div>
          <div className="text-sm text-foreground">{row.topServices || 'None'}</div>
        </div>
      </div>
    )
  }

  // Export handlers
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    setPendingExportFormat(format)
    setIsColumnModalOpen(true)
  }

  const handleColumnSelectionConfirm = (selectedColumnIds: string[]) => {
    if (!pendingExportFormat) return

    const filename = `customer-report-${new Date().toISOString().split('T')[0]}`
    const title = 'Customer Report - Ainaa Clinic'

    const filteredData = tableInstance
      ? tableInstance.getFilteredRowModel().rows.map((row: any) => row.original)
      : rawData

    // Filter columns based on selection
    const selectedColumns = exportColumns.filter((_, index) =>
      selectedColumnIds.includes(index.toString())
    )

    exportData(pendingExportFormat, {
      filename,
      title,
      columns: selectedColumns,
      data: filteredData,
    })

    setPendingExportFormat(null)
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
          title="Customer Report"
          description="Customer analytics and lifetime value reports with advanced filtering"
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
              <BirthdayRangeColumnFilter
                key={`birthday-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerBirthday')!}
                placeholder="Birthday"
              />
              <MultiSelectColumnFilter
                key={`segment-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerSegment')!}
                options={segmentOptions}
                placeholder="Customer Segment"
              />
              <NumberRangeColumnFilter
                key={`revenue-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('totalRevenue')!}
                placeholder="Revenue Range"
              />
              <NumberRangeColumnFilter
                key={`visits-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('totalTransactions')!}
                placeholder="Visit Count"
              />
              <DateRangeColumnFilter
                key={`last-visit-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('lastVisitDate')!}
                placeholder="Last Visit Date"
              />
            </div>
          </div>
        )}

        {/* Export Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {tableInstance
              ? `${tableInstance.getFilteredRowModel().rows.length} of ${rawData.length} customers`
              : `${rawData.length} customers`}
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
          emptyMessage="No customers match your filters"
          showColumnFilters={false}
          filterFns={filterFns}
          onTableChange={setTableInstance}
          renderExpandedRow={renderExpandedRow}
          expandedRows={expandedRows}
          getRowId={(row) => row.id}
        />
      </PageContainer>

      {/* Column Selection Modal */}
      <ColumnSelectionModal
        isOpen={isColumnModalOpen}
        onClose={() => setIsColumnModalOpen(false)}
        onConfirm={handleColumnSelectionConfirm}
        columns={columnOptions}
        title="Select Columns to Export"
      />
    </Layout>
  )
}

export default CustomerReport
