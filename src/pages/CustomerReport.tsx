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
import { ColumnSelectionModal, ColumnOption, FilenameToken } from '@/components/ui/ColumnSelectionModal'
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
  totalServices: { amount: number; count: number }
  totalItems: { amount: number; count: number }

  // Visit Metrics
  firstVisitDate: string | null
  lastVisitDate: string | null
  daysSinceLastVisit: number | null

  // Purchase Behavior
  topServices: string
  onboardingBeautician: string
  beauticians: string

  // Segmentation
  customerStatus: 'Active' | 'At Risk' | 'Dormant' | 'New'
  customerRank: 'CONSULTATION' | 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
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

  const getCustomerStatus = (lastVisitDate: string | null, totalTransactions: number): 'Active' | 'At Risk' | 'Dormant' | 'New' => {
    if (!lastVisitDate || totalTransactions === 0) return 'New'
    const daysSince = Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
    if (daysSince <= 90) return 'Active'
    if (daysSince <= 180) return 'At Risk'
    return 'Dormant'
  }

  const getCustomerRank = (totalRevenue: number): 'CONSULTATION' | 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' => {
    if (totalRevenue <= 50) return 'CONSULTATION'
    if (totalRevenue <= 499) return 'STARTER'
    if (totalRevenue <= 1999) return 'BRONZE'
    if (totalRevenue <= 4999) return 'SILVER'
    if (totalRevenue <= 7999) return 'GOLD'
    return 'PLATINUM'
  }

  const getDaysSinceLastVisit = (lastVisitDate: string | null) => {
    if (!lastVisitDate) return null
    return Math.floor((Date.now() - new Date(lastVisitDate).getTime()) / (1000 * 60 * 60 * 24))
  }

  const getOnboardingBeautician = (serviceSales: any[], items: any[]) => {
    // Combine all transactions from both service sales and items
    const allEntries = [
      ...(serviceSales?.map(s => ({
        name: s.sales_person,
        date: s.sale_date
      })) || []),
      ...(items?.map(i => ({
        name: i.sales_person,
        date: i.sale_date
      })) || [])
    ]

    // Filter out entries without valid names or dates
    const validEntries = allEntries.filter(e => e.name?.trim() && e.date)

    if (validEntries.length === 0) return '-'

    // Count frequency per beautician and track earliest date
    const frequencyMap = new Map<string, { count: number; earliestDate: Date }>()

    validEntries.forEach(entry => {
      const name = entry.name.trim()
      const date = new Date(entry.date)
      const current = frequencyMap.get(name)

      if (!current) {
        frequencyMap.set(name, { count: 1, earliestDate: date })
      } else {
        current.count++
        if (date < current.earliestDate) {
          current.earliestDate = date
        }
      }
    })

    // Find beautician(s) with highest transaction frequency
    let maxCount = 0
    let winners: Array<{ name: string; earliestDate: Date }> = []

    frequencyMap.forEach((stats, name) => {
      if (stats.count > maxCount) {
        maxCount = stats.count
        winners = [{ name, earliestDate: stats.earliestDate }]
      } else if (stats.count === maxCount) {
        winners.push({ name, earliestDate: stats.earliestDate })
      }
    })

    // If tie in frequency, fallback to earliest first transaction date
    if (winners.length === 1) {
      return winners[0].name
    }

    winners.sort((a, b) => a.earliestDate.getTime() - b.earliestDate.getTime())
    return winners[0].name
  }

  const getBeauticians = (serviceSales: any[], items: any[], topN = 10) => {
    if ((!serviceSales || serviceSales.length === 0) && (!items || items.length === 0)) {
      return '-'
    }

    const beauticiansSet = new Set<string>()

    // Collect beauticians from service_sales
    serviceSales?.forEach(s => {
      if (s.sales_person && s.sales_person.trim()) {
        beauticiansSet.add(s.sales_person.trim())
      }
    })

    // Collect beauticians from items
    items?.forEach(i => {
      if (i.sales_person && i.sales_person.trim()) {
        beauticiansSet.add(i.sales_person.trim())
      }
    })

    if (beauticiansSet.size === 0) return '-'

    return Array.from(beauticiansSet)
      .slice(0, topN)
      .join(', ')
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
        let debugCustomerCount = 0
        const customerReportRows: CustomerReportRow[] = allCustomers?.map(customer => {
          const customerTransactions = transactionsByCustomer[customer.id] || []
          const customerServiceSales = serviceSalesByCustomer[customer.id] || []
          const customerItems = itemsByCustomer[customer.id] || []

          // Calculate metrics
          const totalTransactions = customerTransactions.length

          // Calculate service sales total and count
          const totalServicesAmount = customerServiceSales.reduce((sum, s) => sum + (s.payment_amount || 0), 0)
          const totalServicesCount = customerServiceSales.length

          // Calculate items total and count
          const totalItemsAmount = customerItems.reduce((sum, i) => sum + (i.total_price || 0), 0)
          const totalItemsCount = customerItems.length

          // Total revenue comes from transactions only (payment_to_date already includes services and items)
          const totalRevenue = customerTransactions.reduce((sum, t) => sum + (t.payment_to_date || 0), 0)

          const totalDiscount = customerTransactions.reduce((sum, t) => sum + (t.total_discount || 0), 0)
          const avgTransactionAmount = totalTransactions > 0 ? totalRevenue / totalTransactions : 0
          const totalServices = { amount: totalServicesAmount, count: totalServicesCount }
          const totalItems = { amount: totalItemsAmount, count: totalItemsCount }

          // Debug first 5 customers to investigate revenue calculation
          if (debugCustomerCount < 5) {
            console.log(`\n━━━ CUSTOMER #${debugCustomerCount + 1}: ${customer.name} ━━━`)
            console.log(`Customer ID: ${customer.id}`)
            debugCustomerCount++

            console.log(`\n📋 TRANSACTIONS (${customerTransactions.length}):`)
            customerTransactions.forEach((t, i) => {
              console.log(`  ${i+1}. ID: ${t.id?.slice(0,8)}... | payment_to_date: ${t.payment_to_date}`)
            })
            console.log(`  ➜ Transactions Revenue: RM ${totalRevenue.toFixed(2)}`)

            console.log(`\n💆 SERVICE SALES (${customerServiceSales.length}):`)
            customerServiceSales.forEach((s, i) => {
              console.log(`  ${i+1}. ID: ${s.id?.slice(0,8)}... | payment_amount: ${s.payment_amount}`)
            })
            console.log(`  ➜ Services Amount: RM ${totalServicesAmount.toFixed(2)}`)

            console.log(`\n🛍️  ITEMS (${customerItems.length}):`)
            customerItems.forEach((item, i) => {
              console.log(`  ${i+1}. ID: ${item.id?.slice(0,8)}... | total_price: ${item.total_price}`)
            })
            console.log(`  ➜ Items Amount: RM ${totalItemsAmount.toFixed(2)}`)

            console.log(`\n💰 REVENUE CALCULATION:`)
            console.log(`  Total Revenue (from transactions): RM ${totalRevenue.toFixed(2)}`)
            console.log(`  `)
            console.log(`  Breakdown (already included in total):`)
            console.log(`    - Services:     RM ${totalServicesAmount.toFixed(2)} (${totalServicesCount})`)
            console.log(`    - Items:        RM ${totalItemsAmount.toFixed(2)} (${totalItemsCount})`)
            console.log(`  `)
            console.log(`  Note: Services and items are breakdowns, not additive!`)
          }

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
          const onboardingBeautician = getOnboardingBeautician(customerServiceSales, customerItems)
          const beauticians = getBeauticians(customerServiceSales, customerItems)

          // Segmentation
          const customerStatus = getCustomerStatus(lastVisitDate, totalTransactions)
          const customerRank = getCustomerRank(totalRevenue)

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
            onboardingBeautician,
            beauticians,

            customerStatus,
            customerRank
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

  // Status options
  const statusOptions: MultiSelectOption[] = [
    { value: 'Active', label: 'Active' },
    { value: 'At Risk', label: 'At Risk' },
    { value: 'Dormant', label: 'Dormant' },
    { value: 'New', label: 'New' }
  ]

  // Rank options
  const rankOptions: MultiSelectOption[] = [
    { value: 'CONSULTATION', label: 'Consultation' },
    { value: 'STARTER', label: 'Starter' },
    { value: 'BRONZE', label: 'Bronze' },
    { value: 'SILVER', label: 'Silver' },
    { value: 'GOLD', label: 'Gold' },
    { value: 'PLATINUM', label: 'Platinum' }
  ]

  // Onboarding Beauticians options - dynamically generated from data
  const onboardingBeauticiansOptions: MultiSelectOption[] = useMemo(() => {
    const uniqueBeauticians = new Set<string>()

    rawData.forEach(row => {
      if (row.onboardingBeautician && row.onboardingBeautician !== '-') {
        uniqueBeauticians.add(row.onboardingBeautician.trim())
      }
    })

    return Array.from(uniqueBeauticians)
      .sort()
      .map(name => ({ value: name, label: name }))
  }, [rawData])

  // Beauticians options - dynamically generated from data
  const beauticiansOptions: MultiSelectOption[] = useMemo(() => {
    const uniqueBeauticians = new Set<string>()

    rawData.forEach(row => {
      if (row.beauticians && row.beauticians !== '-') {
        // Split by comma and extract individual beautician names
        const names = row.beauticians.split(',').map(n => n.trim())
        names.forEach(name => {
          if (name) uniqueBeauticians.add(name)
        })
      }
    })

    return Array.from(uniqueBeauticians)
      .sort()
      .map(name => ({ value: name, label: name }))
  }, [rawData])


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
        <div className="w-28 whitespace-nowrap">{row.getValue('customerPhone')}</div>
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
    {
      accessorKey: 'onboardingBeautician',
      header: () => (
        <Tooltip content="First beautician/sales person who served this customer" side="bottom">
          <div className="cursor-help">Onboarding Beautician</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const beautician = row.getValue('onboardingBeautician') as string
        return (
          <div className="w-[150px] whitespace-nowrap">
            {beautician}
          </div>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: onboardingBeauticiansOptions
      }
    },
    {
      accessorKey: 'beauticians',
      header: () => (
        <Tooltip content="All beauticians/sales persons who served this customer" side="bottom">
          <div className="cursor-help">All Beauticians</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const beauticians = row.getValue('beauticians') as string
        return (
          <Tooltip content={beauticians}>
            <div className="max-w-[250px] truncate cursor-help">
              {beauticians}
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
    // Visit Metrics
    {
      accessorKey: 'totalTransactions',
      header: () => (
        <Tooltip content="Total count of transactions/visits by this customer" side="bottom">
          <div className="cursor-help">Total Visits</div>
        </Tooltip>
      ),
      cell: ({ row }) => (
        <div className="w-20 whitespace-nowrap text-center">{row.getValue('totalTransactions')}</div>
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
        <div className="w-20 whitespace-nowrap text-right">{formatCurrency(row.getValue('totalRevenue'))}</div>
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
        <div className="w-20 whitespace-nowrap text-right">{formatCurrency(row.getValue('avgTransactionAmount'))}</div>
      ),
      enableSorting: true,
    },
    // Purchase Behavior
    {
      accessorKey: 'totalServices',
      accessorFn: (row) => {
        const data = row.totalServices as { amount: number; count: number }
        return `${formatCurrency(data.amount)} (${data.count})`
      },
      header: () => (
        <Tooltip content="Total amount from service sales (count of services)" side="bottom">
          <div className="cursor-help">Total Services</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const data = row.original.totalServices as { amount: number; count: number }
        return (
          <div className="w-20 whitespace-nowrap text-right">
            {formatCurrency(data.amount)} ({data.count})
          </div>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'inNumberRange',
      meta: {
        filterComponent: NumberRangeColumnFilter
      }
    },
    {
      accessorKey: 'totalItems',
      accessorFn: (row) => {
        const data = row.totalItems as { amount: number; count: number }
        return `${formatCurrency(data.amount)} (${data.count})`
      },
      header: () => (
        <Tooltip content="Total amount from product purchases (count of items)" side="bottom">
          <div className="cursor-help">Total Items</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const data = row.original.totalItems as { amount: number; count: number }
        return (
          <div className="w-24 whitespace-nowrap text-right">
            {formatCurrency(data.amount)} ({data.count})
          </div>
        )
      },
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
      accessorKey: 'customerStatus',
      header: () => (
        <Tooltip content="Active (≤90 days), At Risk (91-180 days), Dormant (>180 days), New (no visits)" side="bottom">
          <div className="cursor-help">Status</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const status = row.getValue('customerStatus') as string
        const colorMap: Record<string, string> = {
          'Active': 'bg-green-100 text-green-800 border-green-200 dark:bg-green-950 dark:text-green-200 dark:border-green-800',
          'At Risk': 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-950 dark:text-yellow-200 dark:border-yellow-800',
          'Dormant': 'bg-red-100 text-red-800 border-red-200 dark:bg-red-950 dark:text-red-200 dark:border-red-800',
          'New': 'bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
        }
        return (
          <div className="w-24">
            <Badge
              variant="outline"
              className={`text-xs whitespace-nowrap ${colorMap[status] || ''}`}
            >
              {status}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: statusOptions
      }
    },
    {
      accessorKey: 'customerRank',
      header: () => (
        <Tooltip content="Customer tier based on lifetime spending" side="bottom">
          <div className="cursor-help">Rank</div>
        </Tooltip>
      ),
      cell: ({ row }) => {
        const rank = row.getValue('customerRank') as string
        const rankStyles: Record<string, { className: string }> = {
          'CONSULTATION': { className: 'border-slate-400 text-slate-600 bg-slate-50' },
          'STARTER': { className: 'border-green-500 text-green-700 bg-green-50' },
          'BRONZE': { className: 'border-amber-600 text-amber-700 bg-amber-50' },
          'SILVER': { className: 'border-gray-500 text-gray-700 bg-gray-50' },
          'GOLD': { className: 'border-yellow-600 text-yellow-700 bg-yellow-50' },
          'PLATINUM': { className: 'border-blue-600 text-blue-700 bg-blue-50' }
        }
        return (
          <div className="w-28">
            <Badge
              variant="outline"
              className={`text-xs whitespace-nowrap ${rankStyles[rank]?.className || ''}`}
            >
              {rank}
            </Badge>
          </div>
        )
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'arrIncludesSome',
      meta: {
        filterComponent: MultiSelectColumnFilter,
        filterOptions: rankOptions
      }
    },
  ], [expandedRows, onboardingBeauticiansOptions, beauticiansOptions])

  // Export columns (all available columns)
  // Using proportional widths that auto-scale to fit page width
  // Grouped by category: Customer Info → Visit Metrics → Transaction Metrics → Purchase Behavior → Segmentation
  const exportColumns: ExportColumn[] = useMemo(() => [
    // Customer Info
    { header: 'Membership ID', accessor: 'membershipNumber', type: 'text' },
    { header: 'Customer Name', accessor: 'customerName', type: 'text' },
    { header: 'Phone', accessor: 'customerPhone', type: 'text' },
    { header: 'Birthday', accessor: (row: CustomerReportRow) => row.customerBirthday ? formatDate(row.customerBirthday) : '-', type: 'date' },
    { header: 'Onboarding Beautician', accessor: 'onboardingBeautician', type: 'text' },
    { header: 'All Beauticians', accessor: 'beauticians', type: 'text' },
    // Visit Metrics
    { header: 'Total Visits', accessor: 'totalTransactions', type: 'number' },
    { header: 'First Visit', accessor: (row: CustomerReportRow) => row.firstVisitDate ? formatDate(row.firstVisitDate) : '-', type: 'date' },
    { header: 'Last Visit', accessor: (row: CustomerReportRow) => row.lastVisitDate ? formatDate(row.lastVisitDate) : '-', type: 'date' },
    { header: 'Days Since Visit', accessor: (row: CustomerReportRow) => row.daysSinceLastVisit !== null ? row.daysSinceLastVisit.toString() : '-', type: 'number' },
    // Transaction Metrics
    { header: 'Total Revenue', accessor: (row: CustomerReportRow) => formatCurrency(row.totalRevenue), type: 'currency' },
    { header: 'Avg Transaction', accessor: (row: CustomerReportRow) => formatCurrency(row.avgTransactionAmount), type: 'currency' },
    // Purchase Behavior
    {
      header: 'Total Services',
      accessor: (row: CustomerReportRow) => {
        const data = row.totalServices as { amount: number; count: number }
        return `${formatCurrency(data.amount)} (${data.count})`
      },
      type: 'text'
    },
    {
      header: 'Total Items',
      accessor: (row: CustomerReportRow) => {
        const data = row.totalItems as { amount: number; count: number }
        return `${formatCurrency(data.amount)} (${data.count})`
      },
      type: 'text'
    },
    { header: 'Top Services', accessor: 'topServices', width: 28, type: 'text' },
    // Segmentation
    { header: 'Status', accessor: 'customerStatus', type: 'text' },
    { header: 'Rank', accessor: 'customerRank', width: 26, type: 'text' },
  ], [])

  // Column options for selection modal
  const columnOptions: ColumnOption[] = useMemo(() =>
    exportColumns.map((col, index) => ({
      id: index.toString(),
      label: col.header,
      required: col.header === 'Customer Name' // Make customer name required
    })),
    [exportColumns]
  )

  // Default selected columns (exclude: Membership ID, Onboarding Beautician, All Beautician, Avg Transaction, Days Since Visit)
  const defaultSelectedColumnIds = useMemo(() => {
    const excludeHeaders = ['Membership ID', 'Onboarding Beautician', 'All Beauticians', 'Avg Transaction', 'Days Since Visit']
    return columnOptions
      .filter(col => !excludeHeaders.includes(col.label))
      .map(col => col.id)
  }, [columnOptions])

  // Available filename tokens
  const availableFilenameTokens: FilenameToken[] = [
    // Date tokens
    { value: '[Current Date]', label: 'Current Date', type: 'date' },
    { value: '[Year]', label: 'Year', type: 'date' },
    { value: '[Month]', label: 'Month', type: 'date' },
    // Static tokens
    { value: '[Report Type]', label: 'Report Type (Customer Report)', type: 'static' },
    // Column tokens - all exportable columns
    ...exportColumns.map(col => ({
      value: `[${col.header}]`,
      label: col.header,
      type: 'column' as const
    }))
  ]

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

  const handleColumnSelectionConfirm = (selectedColumnIds: string[], customFilename: string) => {
    if (!pendingExportFormat) return

    // Get filtered and sorted data first to extract column values
    const filteredData = tableInstance
      ? tableInstance.getSortedRowModel().rows.map((row: any) => row.original)
      : rawData

    // Process filename with token replacements
    const now = new Date()
    const year = now.getFullYear().toString()
    const month = (now.getMonth() + 1).toString().padStart(2, '0')
    const currentDate = now.toISOString().split('T')[0]

    let processedFilename = customFilename

    // Replace column tokens with actual values from filtered data
    exportColumns.forEach((col) => {
      const columnHeader = col.header
      if (processedFilename.includes(columnHeader)) {
        const accessor = col.accessor
        const uniqueValues = new Set<string>()

        filteredData.forEach((row: CustomerReportRow) => {
          let value
          if (typeof accessor === 'function') {
            value = accessor(row)
          } else {
            value = row[accessor as keyof CustomerReportRow]
          }
          if (value && value !== '-' && value !== 'N/A' && value !== '') {
            uniqueValues.add(value.toString())
          }
        })

        // Limit to 5 unique values to prevent extremely long filenames
        const values = Array.from(uniqueValues).slice(0, 5)
        if (values.length > 0) {
          processedFilename = processedFilename.replace(columnHeader, values.join('-'))
        } else {
          // If no values found, remove the token
          processedFilename = processedFilename.replace(columnHeader, 'All')
        }
      }
    })

    // Replace date and static tokens
    processedFilename = processedFilename
      .replace(/Current Date/g, currentDate)
      .replace(/Year/g, year)
      .replace(/Month/g, month)
      .replace(/Report Type \(Customer Report\)/g, 'Customer-Report')
      .replace(/Report Type/g, 'Customer-Report')
      // Sanitize filename
      .replace(/[\/\\:*?"<>|]/g, '')

    // Use processed filename as title (replace hyphens with spaces for readability)
    const title = processedFilename.replace(/-/g, ' ')

    // Filter columns based on selection
    const selectedColumns = exportColumns.filter((_, index) =>
      selectedColumnIds.includes(index.toString())
    )

    exportData(pendingExportFormat, {
      filename: processedFilename,
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
              <MultiSelectColumnFilter
                key={`onboarding-beautician-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('onboardingBeautician')!}
                options={onboardingBeauticiansOptions}
                placeholder="Onboarding Beautician"
              />
              <MultiSelectColumnFilter
                key={`beauticians-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('beauticians')!}
                options={beauticiansOptions}
                placeholder="All Beauticians"
              />
              <BirthdayRangeColumnFilter
                key={`birthday-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerBirthday')!}
                placeholder="Birthday"
              />
              <MultiSelectColumnFilter
                key={`status-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerStatus')!}
                options={statusOptions}
                placeholder="Customer Status"
              />
              <MultiSelectColumnFilter
                key={`rank-filter-${tableInstance.id}`}
                column={tableInstance.getColumn('customerRank')!}
                options={rankOptions}
                placeholder="Customer Rank"
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
        availableTokens={availableFilenameTokens}
        tableInstance={tableInstance}
        defaultSelectedIds={defaultSelectedColumnIds}
        defaultFilenameTokens={['Onboarding Beautician', 'Rank', 'Current Date']}
      />
    </Layout>
  )
}

export default CustomerReport
