import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  Package,
  Award,
  Users,
  ShoppingBag
} from 'lucide-react'
import { supabase, Customer } from '@/lib/supabase'
import { useCustomer } from '@/context/CustomerContext'
import { formatCurrency } from '@/utils/formatters'
import { DateRange, getPresetRange, toLocalDateString } from '@/utils/dateHelpers'
import { STAT_CONFIGS } from '@/config/statsConfig'

// UI Components
import { BentoGrid, StatCard, BentoCard } from '@/components/ui/bento-card'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { PageContainer, PageHeader } from '@/components/layout/index'
import { Layout } from '@/components/Layout'
import { SearchInput } from '@/components/ui/SearchInput'
import { RankedListCard, RankedItemData, SortToggle } from '@/components/ui/RankedListCard'
import { SalespersonLeaderboard } from '@/components/SalespersonLeaderboard'

interface TopCustomer {
  id: string
  name: string
  totalSpent: number
  transactionCount: number
  membershipType: string
  lastVisit: string | null
}

interface TopService {
  name: string
  quantity: number
  revenue: number
}

interface TopItem {
  name: string
  quantity: number
  revenue: number
}

interface SalespersonStats {
  name: string
  revenue: number
  transactionCount: number
  avgTransaction: number
  rank: number
}

// Helper function to generate sparkline data
const generateSparklineData = (transactions: any[], dataPoints: number = 12) => {
  if (transactions.length === 0) {
    return { revenue: [], transactions: [] }
  }

  // Sort transactions by date
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  // Get the full date range from first to last transaction
  const firstDate = new Date(sorted[0].transaction_date)
  const lastDate = new Date(sorted[sorted.length - 1].transaction_date)

  // Use time-bucket aggregation instead of uniform day sampling
  // This ensures each sparkline point represents actual volume in that time period
  const totalTimeMs = lastDate.getTime() - firstDate.getTime()
  const bucketSizeMs = totalTimeMs / dataPoints

  const revenueBuckets: number[] = new Array(dataPoints).fill(0)
  const countBuckets: number[] = new Array(dataPoints).fill(0)

  // Aggregate all transactions into time buckets
  sorted.forEach(t => {
    const transactionDate = new Date(t.transaction_date)
    const offsetMs = transactionDate.getTime() - firstDate.getTime()
    const bucketIndex = Math.min(
      Math.floor(offsetMs / bucketSizeMs),
      dataPoints - 1
    )
    revenueBuckets[bucketIndex] += t.payment_to_date || 0
    countBuckets[bucketIndex] += 1
  })

  return {
    revenue: revenueBuckets,
    transactions: countBuckets
  }
}

// Helper function to generate sparkline data for treatments
const generateTreatmentsSparkline = (serviceSales: any[], dataPoints: number = 12) => {
  if (serviceSales.length === 0) {
    return []
  }

  // Sort by date
  const sorted = [...serviceSales].sort((a, b) =>
    new Date(a.sale_date).getTime() - new Date(b.sale_date).getTime()
  )

  // Get the full date range from first to last sale
  const firstDate = new Date(sorted[0].sale_date)
  const lastDate = new Date(sorted[sorted.length - 1].sale_date)

  // Use time-bucket aggregation instead of uniform day sampling
  // This ensures each sparkline point represents actual volume in that time period
  const totalTimeMs = lastDate.getTime() - firstDate.getTime()
  const bucketSizeMs = totalTimeMs / dataPoints

  const buckets: number[] = new Array(dataPoints).fill(0)

  // Aggregate all service sales into time buckets
  sorted.forEach(s => {
    const saleDate = new Date(s.sale_date)
    const offsetMs = saleDate.getTime() - firstDate.getTime()
    const bucketIndex = Math.min(
      Math.floor(offsetMs / bucketSizeMs),
      dataPoints - 1
    )
    buckets[bucketIndex] += s.quantity || 0
  })

  // Diagnostic logging
  console.log('[generateTreatmentsSparkline] Data analysis:', {
    firstDate: firstDate.toISOString().split('T')[0],
    lastDate: lastDate.toISOString().split('T')[0],
    totalDays: Math.ceil(totalTimeMs / (1000 * 60 * 60 * 24)),
    totalRecords: sorted.length,
    bucketSizeDays: Math.ceil(bucketSizeMs / (1000 * 60 * 60 * 24)),
    sparklineLength: buckets.length,
    sparklineValues: buckets
  })

  return buckets
}

// Helper function to generate sparkline data for unique customers
const generateCustomersSparkline = (transactions: any[], dataPoints: number = 12) => {
  if (transactions.length === 0) {
    return []
  }

  // Sort transactions by date
  const sorted = [...transactions].sort((a, b) =>
    new Date(a.transaction_date).getTime() - new Date(b.transaction_date).getTime()
  )

  // Get the full date range from first to last transaction
  const firstDate = new Date(sorted[0].transaction_date)
  const lastDate = new Date(sorted[sorted.length - 1].transaction_date)

  // Use time-bucket aggregation
  const totalTimeMs = lastDate.getTime() - firstDate.getTime()
  const bucketSizeMs = totalTimeMs / dataPoints

  const buckets: Set<string>[] = new Array(dataPoints).fill(null).map(() => new Set())

  // Aggregate unique customer IDs into time buckets
  sorted.forEach(t => {
    if (!t.customer_id) return

    const transactionDate = new Date(t.transaction_date)
    const offsetMs = transactionDate.getTime() - firstDate.getTime()
    const bucketIndex = Math.min(
      Math.floor(offsetMs / bucketSizeMs),
      dataPoints - 1
    )
    buckets[bucketIndex].add(t.customer_id)
  })

  // Convert Set sizes to array of numbers (unique customer count per bucket)
  return buckets.map(bucket => bucket.size)
}

// Helper function to get dynamic comparison label based on date preset
const getComparisonLabel = (preset?: 'week' | 'month' | 'year' | 'lifetime' | 'custom'): string | undefined => {
  switch (preset) {
    case 'week':
      return 'vs last week'
    case 'month':
      return 'vs last month'
    case 'year':
      return 'vs last year'
    case 'custom':
      return 'vs previous period'
    case 'lifetime':
    default:
      return undefined // Hide comparison for lifetime/all time
  }
}

const Homepage: React.FC = () => {
  const navigate = useNavigate()
  const { selectCustomer } = useCustomer()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)

  // Date range state
  const [dateRange, setDateRange] = useState<DateRange>(() => getPresetRange('lifetime'))

  // Stats state
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalTransactions: 0,
    totalTreatments: 0,
    revenueChange: 0,
    transactionsChange: 0,
    customersChange: 0,
    treatmentsChange: 0,
    revenueSparkline: [] as number[],
    transactionsSparkline: [] as number[],
    treatmentsSparkline: [] as number[],
    customersSparkline: [] as number[],
    prevRevenueSparkline: [] as number[],
    prevTransactionsSparkline: [] as number[],
    prevTreatmentsSparkline: [] as number[],
    prevCustomersSparkline: [] as number[]
  })

  // Dashboard data state
  const [topCustomers, setTopCustomers] = useState<TopCustomer[]>([])
  const [topServices, setTopServices] = useState<TopService[]>([])
  const [topItems, setTopItems] = useState<TopItem[]>([])
  const [salespersonStats, setSalespersonStats] = useState<SalespersonStats[]>([])

  // Loading states
  const [loadingStats, setLoadingStats] = useState(false)
  const [loadingCustomers, setLoadingCustomers] = useState(false)
  const [loadingServices, setLoadingServices] = useState(false)
  const [loadingItems, setLoadingItems] = useState(false)
  const [loadingSalespeople, setLoadingSalespeople] = useState(false)

  // Load all customers for search
  useEffect(() => {
    loadAllCustomers()
  }, [])

  // Load dashboard data when date range changes
  useEffect(() => {
    loadStats()
    loadTopSpendingCustomers()
    loadTopSellingServices()
    loadTopSellingItems()
    loadSalespersonRanking()
  }, [dateRange])

  // Handle search filtering
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers([])
    } else {
      const filtered = customers.filter(customer =>
        customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.membership_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
        customer.contact_number?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      setFilteredCustomers(filtered.slice(0, 10))
    }
  }, [searchQuery, customers])

  const loadAllCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('[Homepage] Error loading customers:', error)
    }
  }

  // Load main statistics
  const loadStats = async () => {
    setLoadingStats(true)
    try {
      console.log('[Homepage] Loading stats...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined,
        preset: dateRange.preset
      })

      // Fetch all transactions with pagination to avoid limits (will count unique customers from this)
      let allTransactions: any[] = []
      let pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('payment_to_date, transaction_date, customer_id')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply date range filter
        if (dateRange.from) {
          query = query.gte('transaction_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          query = query.lte('transaction_date', toLocalDateString(dateRange.to))
        }

        const { data, error } = await query

        if (error) {
          console.error('[Homepage] Error fetching transactions page:', page, error)
          break
        }

        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allTransactions = allTransactions.concat(data)
          console.log(`[Homepage] Stats: Loaded ${allTransactions.length} transactions so far...`)

          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }

      console.log('[Homepage] Stats: Total transactions loaded:', allTransactions.length)

      // Count unique customers in the date range
      const uniqueCustomerIds = new Set(allTransactions.filter(t => t.customer_id).map(t => t.customer_id))
      const totalCustomers = uniqueCustomerIds.size

      const totalRevenue = allTransactions.reduce((sum, t) => sum + (t.payment_to_date || 0), 0)

      // Fetch total treatments (service sales) within date range
      console.log('[Homepage] Stats: Fetching service sales for treatments...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined
      })

      let allServiceSales: any[] = []
      let servicePage = 0
      let serviceHasMore = true

      while (serviceHasMore) {
        let serviceQuery = supabase
          .from('service_sales')
          .select('quantity, sale_date')
          .range(servicePage * pageSize, (servicePage + 1) * pageSize - 1)

        if (dateRange.from) {
          serviceQuery = serviceQuery.gte('sale_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          serviceQuery = serviceQuery.lte('sale_date', toLocalDateString(dateRange.to))
        }

        const { data, error } = await serviceQuery

        if (error) {
          console.error('[Homepage] Error fetching service_sales page:', servicePage, error)
          serviceHasMore = false
        } else if (!data || data.length === 0) {
          serviceHasMore = false
        } else {
          allServiceSales = allServiceSales.concat(data)
          console.log(`[Homepage] Stats: Loaded ${allServiceSales.length} service sales so far...`)
          if (data.length < pageSize) {
            serviceHasMore = false
          } else {
            servicePage++
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }

      console.log('[Homepage] Stats: Total service sales loaded:', allServiceSales.length)

      // Log sample service sales data
      if (allServiceSales.length > 0) {
        console.log('[Homepage] Sample service sales (first 3):', allServiceSales.slice(0, 3).map(s => ({
          quantity: s.quantity,
          sale_date: s.sale_date
        })))
      }

      const totalTreatments = allServiceSales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      console.log('[Homepage] Stats: Total treatments calculated:', totalTreatments)

      // Calculate previous period for comparison
      let prevRevenue = 0
      let prevTransactions = 0
      let prevCustomers = 0
      let prevTreatments = 0
      let prevPeriodTransactions: any[] = []
      let prevServiceSales: any[] = []

      if (dateRange.from && dateRange.to) {
        let prevFrom: Date
        let prevTo: Date

        // Calculate previous period based on preset type
        if (dateRange.preset === 'week') {
          // Previous week = full week before current week start
          prevFrom = new Date(dateRange.from)
          prevFrom.setDate(prevFrom.getDate() - 7) // Start of previous week
          prevTo = new Date(dateRange.from)
          prevTo.setDate(prevTo.getDate() - 1) // Day before current week starts
        } else if (dateRange.preset === 'month') {
          // Previous month = full previous calendar month
          const currentMonth = dateRange.from.getMonth()
          const currentYear = dateRange.from.getFullYear()

          // First day of previous month
          prevFrom = new Date(currentYear, currentMonth - 1, 1)
          // Last day of previous month
          prevTo = new Date(currentYear, currentMonth, 0)
        } else if (dateRange.preset === 'year') {
          // Previous year = full previous calendar year
          const currentYear = dateRange.from.getFullYear()

          // Jan 1 of previous year
          prevFrom = new Date(currentYear - 1, 0, 1)
          // Dec 31 of previous year
          prevTo = new Date(currentYear - 1, 11, 31)
        } else {
          // Custom range or lifetime = same duration shifted back
          const daysDiff = Math.ceil((dateRange.to.getTime() - dateRange.from.getTime()) / (1000 * 60 * 60 * 24))
          prevFrom = new Date(dateRange.from)
          prevFrom.setDate(prevFrom.getDate() - daysDiff - 1)
          prevTo = new Date(dateRange.from)
          prevTo.setDate(prevTo.getDate() - 1)
        }

        console.log('[Homepage] Previous period calculation:', {
          preset: dateRange.preset,
          current: {
            from: toLocalDateString(dateRange.from),
            to: toLocalDateString(dateRange.to)
          },
          previous: {
            from: toLocalDateString(prevFrom),
            to: toLocalDateString(prevTo)
          }
        })

        // Fetch previous period transactions
        let prevPage = 0
        let prevHasMore = true

        while (prevHasMore) {
          const { data, error } = await supabase
            .from('transactions')
            .select('payment_to_date, customer_id, transaction_date')
            .gte('transaction_date', toLocalDateString(prevFrom))
            .lte('transaction_date', toLocalDateString(prevTo))
            .range(prevPage * pageSize, (prevPage + 1) * pageSize - 1)

          if (error || !data || data.length === 0) {
            prevHasMore = false
          } else {
            prevPeriodTransactions = prevPeriodTransactions.concat(data)
            if (data.length < pageSize) {
              prevHasMore = false
            } else {
              prevPage++
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }
        }

        prevRevenue = prevPeriodTransactions.reduce((sum, t) => sum + (t.payment_to_date || 0), 0)
        prevTransactions = prevPeriodTransactions.length
        const prevUniqueCustomers = new Set(prevPeriodTransactions.filter(t => t.customer_id).map(t => t.customer_id))
        prevCustomers = prevUniqueCustomers.size

        // Fetch previous period service sales for treatments
        let prevServicePage = 0
        let prevServiceHasMore = true

        while (prevServiceHasMore) {
          const { data, error} = await supabase
            .from('service_sales')
            .select('quantity, sale_date')
            .gte('sale_date', toLocalDateString(prevFrom))
            .lte('sale_date', toLocalDateString(prevTo))
            .range(prevServicePage * pageSize, (prevServicePage + 1) * pageSize - 1)

          if (error || !data || data.length === 0) {
            prevServiceHasMore = false
          } else {
            prevServiceSales = prevServiceSales.concat(data)
            if (data.length < pageSize) {
              prevServiceHasMore = false
            } else {
              prevServicePage++
              await new Promise(resolve => setTimeout(resolve, 50))
            }
          }
        }

        prevTreatments = prevServiceSales.reduce((sum, s) => sum + (s.quantity || 0), 0)
      }

      // Calculate percentage changes
      const revenueChange = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0
      const transactionsChange = prevTransactions > 0 ? ((allTransactions.length - prevTransactions) / prevTransactions) * 100 : 0
      const customersChange = prevCustomers > 0 ? ((totalCustomers - prevCustomers) / prevCustomers) * 100 : 0
      const treatmentsChange = prevTreatments > 0 ? ((totalTreatments - prevTreatments) / prevTreatments) * 100 : 0

      // Generate sparkline data (last 12 data points)
      const sparklineData = generateSparklineData(allTransactions, 12)
      const treatmentsSparklineData = generateTreatmentsSparkline(allServiceSales, 12)
      const customersSparklineData = generateCustomersSparkline(allTransactions, 12)

      // Generate previous period sparkline data (if we have previous period data)
      let prevSparklineData = { revenue: [] as number[], transactions: [] as number[] }
      let prevTreatmentsSparklineData = [] as number[]
      let prevCustomersSparklineData = [] as number[]

      if (dateRange.from && dateRange.to && prevPeriodTransactions.length > 0) {
        prevSparklineData = generateSparklineData(prevPeriodTransactions, 12)
        prevCustomersSparklineData = generateCustomersSparkline(prevPeriodTransactions, 12)
        console.log('[Homepage] Previous period sparklines generated:', {
          revenue: prevSparklineData.revenue.length,
          transactions: prevSparklineData.transactions.length,
          customers: prevCustomersSparklineData.length
        })
      }

      if (dateRange.from && dateRange.to && prevServiceSales.length > 0) {
        prevTreatmentsSparklineData = generateTreatmentsSparkline(prevServiceSales, 12)
        console.log('[Homepage] Previous treatments sparkline generated:', prevTreatmentsSparklineData.length)
      }

      console.log('[Homepage] Sparkline data summary:', {
        current: {
          revenue: sparklineData.revenue.length,
          transactions: sparklineData.transactions.length,
          treatments: treatmentsSparklineData.length
        },
        previous: {
          revenue: prevSparklineData.revenue.length,
          transactions: prevSparklineData.transactions.length,
          treatments: prevTreatmentsSparklineData.length
        }
      })

      setStats({
        totalCustomers,
        totalRevenue,
        totalTransactions: allTransactions.length,
        totalTreatments,
        revenueChange,
        transactionsChange,
        customersChange,
        treatmentsChange,
        revenueSparkline: sparklineData.revenue,
        transactionsSparkline: sparklineData.transactions,
        treatmentsSparkline: treatmentsSparklineData,
        customersSparkline: customersSparklineData,
        prevRevenueSparkline: prevSparklineData.revenue,
        prevTransactionsSparkline: prevSparklineData.transactions,
        prevTreatmentsSparkline: prevTreatmentsSparklineData,
        prevCustomersSparkline: prevCustomersSparklineData
      })
    } catch (error) {
      console.error('[Homepage] Error loading stats:', error)
    } finally {
      setLoadingStats(false)
    }
  }

  // Load top spending customers
  const loadTopSpendingCustomers = async () => {
    setLoadingCustomers(true)
    try {
      console.log('[Homepage] Loading Top Spending Customers...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined,
        preset: dateRange.preset
      })

      // Fetch ALL transactions with pagination
      let allTransactions: any[] = []
      let pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('transactions')
          .select('customer_id, payment_to_date, transaction_date')
          .not('payment_to_date', 'is', null)
          .gt('payment_to_date', 0)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply date range filter
        if (dateRange.from) {
          query = query.gte('transaction_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          query = query.lte('transaction_date', toLocalDateString(dateRange.to))
        }

        const { data, error } = await query

        if (error) {
          console.error('[Homepage] Error fetching transactions page:', page, error)
          break
        }

        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allTransactions = allTransactions.concat(data)
          console.log(`[Homepage] Loaded ${allTransactions.length} transactions for top customers so far...`)

          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }

      console.log('[Homepage] Top Customers: Total transactions loaded:', allTransactions.length)

      // Show sample transactions
      if (allTransactions.length > 0) {
        console.log('[Homepage] Sample transactions (first 3):', allTransactions.slice(0, 3).map(t => ({
          customer_id: t.customer_id?.substring(0, 8) + '...' || 'NULL',
          payment_to_date: t.payment_to_date,
          transaction_date: t.transaction_date
        })))
      }

      // Aggregate spending by customer
      const spendingMap = new Map<string, { total: number; count: number; lastDate: string | null }>()
      let transactionsWithoutCustomerId = 0

      allTransactions.forEach(t => {
        const customerId = t.customer_id
        if (!customerId) {
          transactionsWithoutCustomerId++
          return
        }

        const current = spendingMap.get(customerId) || { total: 0, count: 0, lastDate: null }
        spendingMap.set(customerId, {
          total: current.total + (t.payment_to_date || 0),
          count: current.count + 1,
          lastDate: !current.lastDate || t.transaction_date > current.lastDate
            ? t.transaction_date
            : current.lastDate
        })
      })

      console.log('[Homepage] Unique customers with spending:', spendingMap.size)
      console.log('[Homepage] Transactions without customer_id:', transactionsWithoutCustomerId)

      // Show sample spending data
      if (spendingMap.size > 0) {
        const topSpenders = Array.from(spendingMap.entries())
          .sort((a, b) => b[1].total - a[1].total)
          .slice(0, 3)
        console.log('[Homepage] Top 3 spenders from aggregation:', topSpenders.map(([id, data]) => ({
          customer_id: id.substring(0, 8) + '...',
          total_spent: data.total,
          transaction_count: data.count
        })))
      }

      // Sort by total spending and get top customers
      const topSpenderIds = Array.from(spendingMap.entries())
        .sort((a, b) => b[1].total - a[1].total)
        .slice(0, 30) // Top 30 for pagination
        .map(([id]) => id)

      if (topSpenderIds.length === 0) {
        console.log('[Homepage] No customer IDs to fetch')
        setTopCustomers([])
        return
      }

      console.log('[Homepage] Top spender IDs (first 5):', topSpenderIds.slice(0, 5).map(id => id.substring(0, 8) + '...'))

      // Fetch customer details in batches
      const customerIds = topSpenderIds

      // Chunk customer IDs into batches to avoid Supabase IN clause limit
      // Using 100 items per batch to stay well under Supabase's limits
      const batchSize = 100
      const customerBatches: string[][] = []
      for (let i = 0; i < customerIds.length; i += batchSize) {
        customerBatches.push(customerIds.slice(i, i + batchSize))
      }

      console.log('[Homepage] Fetching customers in', customerBatches.length, 'batches')

      // Fetch customers in batches
      let customers: any[] = []
      for (let i = 0; i < customerBatches.length; i++) {
        const batch = customerBatches[i]
        console.log(`[Homepage] Fetching batch ${i + 1}/${customerBatches.length} (${batch.length} customers)`)
        console.log(`[Homepage] Sample customer IDs from batch ${i + 1}:`, batch.slice(0, 5))

        try {
          const { data, error } = await supabase
            .from('customers')
            .select('id, name, membership_number, phone, membership_type')
            .in('id', batch)

          if (error) {
            console.error(`[Homepage] Error in batch ${i + 1}:`, {
              message: error.message,
              code: error.code,
              details: error.details,
              hint: error.hint,
              batchSize: batch.length
            })
            throw error
          }

          if (data) {
            console.log(`[Homepage] Batch ${i + 1} returned ${data.length} customers`)
            customers = customers.concat(data)
          }

          // Add delay between batches to avoid rate limiting
          if (i < customerBatches.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        } catch (batchError: any) {
          console.error(`[Homepage] Failed to fetch batch ${i + 1}/${customerBatches.length}:`, batchError)
          throw batchError
        }
      }

      console.log('[Homepage] Total customers fetched:', customers.length)

      // Map customer details to spending data
      const topCustomersData: TopCustomer[] = customers
        .map(customer => {
          const spending = spendingMap.get(customer.id)
          if (!spending) return null

          return {
            id: customer.id,
            name: customer.name,
            totalSpent: spending.total,
            transactionCount: spending.count,
            membershipType: customer.membership_type || 'Regular',
            lastVisit: spending.lastDate
          }
        })
        .filter((c): c is TopCustomer => c !== null)
        .sort((a, b) => b.totalSpent - a.totalSpent)

      console.log('[Homepage] Top customers data processed:', topCustomersData.length, 'customers')
      if (topCustomersData.length > 0) {
        console.log('[Homepage] Sample top customer:', {
          name: topCustomersData[0].name,
          totalSpent: topCustomersData[0].totalSpent,
          transactionCount: topCustomersData[0].transactionCount
        })
      }

      setTopCustomers(topCustomersData)
    } catch (error) {
      console.error('[Homepage] Error loading top customers:', error)
    } finally {
      setLoadingCustomers(false)
    }
  }

  // Load top selling services
  const loadTopSellingServices = async () => {
    setLoadingServices(true)
    try {
      console.log('[Homepage] Loading Top Selling Services...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined
      })

      // Fetch ALL service sales with pagination
      let allServices: any[] = []
      let pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('service_sales')
          .select('service_name, quantity, nett_amount, sale_date')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply date range filter
        if (dateRange.from) {
          query = query.gte('sale_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          query = query.lte('sale_date', toLocalDateString(dateRange.to))
        }

        const { data: services, error } = await query

        if (error) {
          console.error('[Homepage] Error fetching services page:', page, error)
          break
        }

        if (!services || services.length === 0) {
          hasMore = false
        } else {
          allServices = allServices.concat(services)
          console.log(`[Homepage] Loaded ${allServices.length} services for top sellers so far...`)

          if (services.length < pageSize) {
            hasMore = false
          } else {
            page++
            // Add delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }

      console.log('[Homepage] Top Selling Services total loaded:', allServices.length)

      if (allServices.length === 0) return

      // Aggregate by service name
      const serviceMap = new Map<string, { quantity: number; revenue: number }>()

      allServices.forEach(service => {
        const name = (service.service_name || 'Unknown').slice(0, 30) // Truncate long names
        const current = serviceMap.get(name) || { quantity: 0, revenue: 0 }
        serviceMap.set(name, {
          quantity: current.quantity + (service.quantity || 0),
          revenue: current.revenue + (service.nett_amount || 0)
        })
      })

      const data = Array.from(serviceMap.entries())
        .map(([name, stats]) => ({
          name,
          quantity: stats.quantity,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 30) // Top 30 services for pagination

      console.log('[Homepage] Top Selling Services data processed:', data.length, 'services')
      if (data.length > 0) {
        console.log('[Homepage] Sample top service:', data[0])
      }
      setTopServices(data)
    } catch (error) {
      console.error('[Homepage] Error loading top services:', error)
    } finally {
      setLoadingServices(false)
    }
  }

  // Load top selling items
  const loadTopSellingItems = async () => {
    setLoadingItems(true)
    try {
      console.log('[Homepage] Loading Top Selling Items...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined,
        preset: dateRange.preset
      })

      // Fetch ALL items with pagination
      let allItems: any[] = []
      let pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('items')
          .select('item_name, total_price, quantity, sale_date')
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply date range filter on sale_date
        if (dateRange.from) {
          query = query.gte('sale_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          query = query.lte('sale_date', toLocalDateString(dateRange.to))
        }

        const { data: items, error } = await query

        if (error) {
          console.error('[Homepage] Error fetching items page:', page, error)
          break
        }

        if (!items || items.length === 0) {
          hasMore = false
        } else {
          allItems = allItems.concat(items)
          console.log(`[Homepage] Loaded ${allItems.length} items for top sellers so far...`)

          if (items.length < pageSize) {
            hasMore = false
          } else {
            page++
            // Add delay between pagination requests to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 50))
          }
        }
      }

      console.log('[Homepage] Top Selling Items total items loaded:', allItems.length)

      // Log sample items with sale_date to verify data
      if (allItems.length > 0) {
        console.log('[Homepage] Sample items with sale_date (first 5):', allItems.slice(0, 5).map(item => ({
          item_name: item.item_name?.substring(0, 20) || 'Unknown',
          sale_date: item.sale_date,
          quantity: item.quantity,
          total_price: item.total_price
        })))

        // Count items without sale_date
        const itemsWithoutDate = allItems.filter(item => !item.sale_date).length
        console.log('[Homepage] Items without sale_date:', itemsWithoutDate, 'out of', allItems.length)

        if (itemsWithoutDate > 0) {
          console.log('[Homepage] Sample items WITHOUT sale_date:',
            allItems.filter(item => !item.sale_date).slice(0, 3).map(item => ({
              item_name: item.item_name?.substring(0, 20) || 'Unknown',
              sale_date: item.sale_date,
              quantity: item.quantity
            }))
          )
        }
      }

      if (allItems.length === 0) return

      const itemMap = new Map<string, { quantity: number; revenue: number }>()

      allItems.forEach(item => {
        const name = (item.item_name || 'Unknown').slice(0, 30) // Truncate long names
        const current = itemMap.get(name) || { quantity: 0, revenue: 0 }
        itemMap.set(name, {
          quantity: current.quantity + (item.quantity || 0),
          revenue: current.revenue + (item.total_price || 0)
        })
      })

      const data = Array.from(itemMap.entries())
        .map(([name, stats]) => ({
          name,
          quantity: stats.quantity,
          revenue: stats.revenue
        }))
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, 30) // Top 30 items for pagination

      console.log('[Homepage] Top Selling Items data processed:', data.length, 'items')
      if (data.length > 0) {
        console.log('[Homepage] Sample top item:', data[0])
      }
      setTopItems(data)
    } catch (error) {
      console.error('[Homepage] Error loading top selling items:', error)
    } finally {
      setLoadingItems(false)
    }
  }

  // Load salesperson ranking
  const loadSalespersonRanking = async () => {
    setLoadingSalespeople(true)
    try {
      console.log('[Homepage] Loading Salesperson Ranking...', {
        from: dateRange.from ? toLocalDateString(dateRange.from) : undefined,
        to: dateRange.to ? toLocalDateString(dateRange.to) : undefined
      })

      // Fetch ALL service sales with pagination (beautician data is in service_sales table)
      let allServiceSales: any[] = []
      let pageSize = 1000
      let page = 0
      let hasMore = true

      while (hasMore) {
        let query = supabase
          .from('service_sales')
          .select('sales_person, payment_amount, sale_date')
          .not('sales_person', 'is', null)
          .not('payment_amount', 'is', null)
          .range(page * pageSize, (page + 1) * pageSize - 1)

        // Apply date range filter
        if (dateRange.from) {
          query = query.gte('sale_date', toLocalDateString(dateRange.from))
        }
        if (dateRange.to) {
          query = query.lte('sale_date', toLocalDateString(dateRange.to))
        }

        const { data, error } = await query

        if (error) {
          console.error('[Homepage] Error fetching service sales page:', page, error)
          break
        }

        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allServiceSales = allServiceSales.concat(data)
          console.log(`[Homepage] Loaded ${allServiceSales.length} service sales for salesperson ranking so far...`)

          if (data.length < pageSize) {
            hasMore = false
          } else {
            page++
          }
        }
      }

      console.log('[Homepage] Salesperson Ranking total service sales loaded:', allServiceSales.length)

      if (allServiceSales.length === 0) return

      // Aggregate by sales person
      const salesMap = new Map<string, { revenue: number; count: number }>()

      allServiceSales.forEach(s => {
        const name = s.sales_person
        const current = salesMap.get(name) || { revenue: 0, count: 0 }
        salesMap.set(name, {
          revenue: current.revenue + (s.payment_amount || 0),
          count: current.count + 1
        })
      })

      const data = Array.from(salesMap.entries())
        .map(([name, stats]) => ({
          name,
          revenue: stats.revenue,
          transactionCount: stats.count,
          avgTransaction: stats.revenue / stats.count,
          rank: 0 // Will be set after sorting
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .map((person, index) => ({
          ...person,
          rank: index + 1
        }))

      console.log('[Homepage] Salesperson data processed:', data.length, 'salespeople')
      if (data.length > 0) {
        console.log('[Homepage] Sample top salesperson:', data[0])
      }
      setSalespersonStats(data)
    } catch (error) {
      console.error('[Homepage] Error loading salesperson ranking:', error)
    } finally {
      setLoadingSalespeople(false)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    console.log('[Homepage] Customer selected:', customer.id, customer.name)
    selectCustomer(customer)
    // Don't navigate here - let CustomerContext handle navigation
    setSearchQuery('') // Clear search after selection
  }

  return (
    <Layout>
      <PageContainer>
        {/* Header with Date Filter in Actions */}
        <PageHeader
          title="Ainaa Clinic Dashboard"
          subtitle="Welcome to your comprehensive customer management system"
          icon={BarChart3}
          iconVariant="gradient"
          iconColor="primary"
          size="xl"
          actions={
            <DateRangeFilter
              value={dateRange}
              onChange={setDateRange}
              presets={['week', 'month', 'year', 'lifetime']}
              showCustomRange={true}
              variant="compact"
              size="sm"
            />
          }
        />

        {/* Search Bar */}
        <div className="mb-6">
          <SearchInput
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder="Search customers by name, membership number, or phone..."
            results={filteredCustomers}
            onSelectResult={handleCustomerSelect}
            renderResult={(customer) => (
              <div>
                <div className="font-medium text-foreground">{customer.name}</div>
                <div className="text-sm text-muted-foreground">
                  {customer.membership_number} • {customer.contact_number}
                </div>
              </div>
            )}
          />
        </div>

        {/* Main Statistics Grid */}
        <BentoGrid cols={4} gap="md" className="mb-6">
          <StatCard
            title="Total Customers"
            value={stats.totalCustomers.toLocaleString()}
            icon={STAT_CONFIGS.customers.icon}
            iconColor={STAT_CONFIGS.customers.iconColor}
            variant="gradient"
            loading={loadingStats}
            sparkline={stats.customersSparkline}
            previousSparkline={stats.prevCustomersSparkline}
            sparklineColor={STAT_CONFIGS.customers.sparklineColor}
            change={stats.customersChange}
            changeLabel={getComparisonLabel(dateRange.preset)}
            trend={stats.customersChange > 0 ? 'up' : stats.customersChange < 0 ? 'down' : 'neutral'}
          />

          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={STAT_CONFIGS.revenue.icon}
            iconColor={STAT_CONFIGS.revenue.iconColor}
            variant="gradient"
            loading={loadingStats}
            sparkline={stats.revenueSparkline}
            previousSparkline={stats.prevRevenueSparkline}
            sparklineColor={STAT_CONFIGS.revenue.sparklineColor}
            change={stats.revenueChange}
            changeLabel={getComparisonLabel(dateRange.preset)}
            trend={stats.revenueChange > 0 ? 'up' : stats.revenueChange < 0 ? 'down' : 'neutral'}
          />

          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            icon={STAT_CONFIGS.transactions.icon}
            iconColor={STAT_CONFIGS.transactions.iconColor}
            variant="gradient"
            loading={loadingStats}
            sparkline={stats.transactionsSparkline}
            previousSparkline={stats.prevTransactionsSparkline}
            sparklineColor={STAT_CONFIGS.transactions.sparklineColor}
            change={stats.transactionsChange}
            changeLabel={getComparisonLabel(dateRange.preset)}
            trend={stats.transactionsChange > 0 ? 'up' : stats.transactionsChange < 0 ? 'down' : 'neutral'}
          />

          <StatCard
            title="Total Treatments"
            value={stats.totalTreatments.toLocaleString()}
            icon={STAT_CONFIGS.treatments.icon}
            iconColor={STAT_CONFIGS.treatments.iconColor}
            variant="gradient"
            loading={loadingStats}
            sparkline={stats.treatmentsSparkline}
            previousSparkline={stats.prevTreatmentsSparkline}
            sparklineColor={STAT_CONFIGS.treatments.sparklineColor}
            change={stats.treatmentsChange}
            changeLabel={getComparisonLabel(dateRange.preset)}
            trend={stats.treatmentsChange > 0 ? 'up' : stats.treatmentsChange < 0 ? 'down' : 'neutral'}
          />
        </BentoGrid>

        {/* Dashboard Cards Grid */}
        <BentoGrid cols={2} gap="md">
          {/* Beauticians Leaderboard */}
          <SalespersonLeaderboard
            data={salespersonStats}
            loading={loadingSalespeople}
            itemsPerPage={5}
            showPagination={true}
          />

          {/* Top Spending Customers */}
          <TopSpendingCustomersCard
            data={topCustomers}
            loading={loadingCustomers}
          />

          {/* Top Selling Items */}
          <TopSellingItemsCard
            data={topItems}
            loading={loadingItems}
          />

          {/* Top Selling Services */}
          <TopSellingServicesCard
            data={topServices}
            loading={loadingServices}
          />
        </BentoGrid>
      </PageContainer>
    </Layout>
  )
}

// Top Spending Customers Card Component
interface TopSpendingCustomersCardProps {
  data: TopCustomer[]
  loading: boolean
}

const TopSpendingCustomersCard: React.FC<TopSpendingCustomersCardProps> = ({ data, loading }) => {
  const [sortBy, setSortBy] = useState<'quantity' | 'amount'>('amount')

  const handleSortToggle = () => {
    setSortBy(prev => prev === 'amount' ? 'quantity' : 'amount')
  }

  // Transform and sort data
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.transactionCount - a.transactionCount
    } else {
      return b.totalSpent - a.totalSpent
    }
  })

  const rankedItems: RankedItemData[] = sortedData.map((customer, index) => ({
    rank: index + 1,
    title: customer.name,
    primaryValue: formatCurrency(customer.totalSpent),
    sortableQuantity: customer.transactionCount,
    sortableAmount: customer.totalSpent,
    metrics: [
      {
        icon: ShoppingBag,
        label: `${customer.transactionCount} visits`
      },
      {
        label: customer.membershipType
      }
    ]
  }))

  return (
    <BentoCard
      title="Top Spending Customers"
      icon={Users}
      iconColor="primary"
      variant="gradient"
      colSpan={1}
      className="animate-fade-in"
      headerAction={<SortToggle sortBy={sortBy} onToggle={handleSortToggle} />}
    >
      <RankedListCard
        items={rankedItems}
        density="compact"
        rankStyle="colored"
        showLeftBorder={true}
        loading={loading}
        emptyMessage="No customer data available"
        itemsPerPage={5}
        showPagination={true}
        enableSort={false}
      />
    </BentoCard>
  )
}

// Top Selling Services Card Component
interface TopSellingServicesCardProps {
  data: TopService[]
  loading: boolean
}

const TopSellingServicesCard: React.FC<TopSellingServicesCardProps> = ({ data, loading }) => {
  const [sortBy, setSortBy] = useState<'quantity' | 'amount'>('amount')

  const handleSortToggle = () => {
    setSortBy(prev => prev === 'amount' ? 'quantity' : 'amount')
  }

  // Transform and sort data
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.quantity - a.quantity
    } else {
      return b.revenue - a.revenue
    }
  })

  const rankedItems: RankedItemData[] = sortedData.map((service, index) => ({
    rank: index + 1,
    title: service.name,
    primaryValue: formatCurrency(service.revenue),
    sortableQuantity: service.quantity,
    sortableAmount: service.revenue,
    metrics: [
      {
        icon: Package,
        label: `${service.quantity} sold`
      }
    ]
  }))

  return (
    <BentoCard
      title="Top Selling Services"
      icon={Award}
      iconColor="secondary"
      variant="gradient"
      colSpan={1}
      className="animate-fade-in"
      headerAction={<SortToggle sortBy={sortBy} onToggle={handleSortToggle} />}
    >
      <RankedListCard
        items={rankedItems}
        density="compact"
        rankStyle="colored"
        showLeftBorder={true}
        loading={loading}
        emptyMessage="No service data available"
        itemsPerPage={5}
        showPagination={true}
        enableSort={false}
      />
    </BentoCard>
  )
}

// Top Selling Items Card Component
interface TopSellingItemsCardProps {
  data: TopItem[]
  loading: boolean
}

const TopSellingItemsCard: React.FC<TopSellingItemsCardProps> = ({ data, loading }) => {
  const [sortBy, setSortBy] = useState<'quantity' | 'amount'>('amount')

  const handleSortToggle = () => {
    setSortBy(prev => prev === 'amount' ? 'quantity' : 'amount')
  }

  // Transform and sort data
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.quantity - a.quantity
    } else {
      return b.revenue - a.revenue
    }
  })

  const rankedItems: RankedItemData[] = sortedData.map((item, index) => ({
    rank: index + 1,
    title: item.name,
    primaryValue: formatCurrency(item.revenue),
    sortableQuantity: item.quantity,
    sortableAmount: item.revenue,
    metrics: [
      {
        icon: Package,
        label: `${item.quantity} sold`
      }
    ]
  }))

  return (
    <BentoCard
      title="Top Selling Items"
      icon={Package}
      iconColor="accent"
      variant="gradient"
      colSpan={1}
      className="animate-fade-in"
      headerAction={<SortToggle sortBy={sortBy} onToggle={handleSortToggle} />}
    >
      <RankedListCard
        items={rankedItems}
        density="compact"
        rankStyle="colored"
        showLeftBorder={true}
        loading={loading}
        emptyMessage="No item data available"
        itemsPerPage={5}
        showPagination={true}
        enableSort={false}
      />
    </BentoCard>
  )
}

export default Homepage
