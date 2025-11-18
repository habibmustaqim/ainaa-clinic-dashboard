import React, { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import CountUp from 'react-countup'
import { chartEntrance, cardEntrance } from '@/lib/animationVariants'
import { Layout } from '@/components/Layout'
import {
  ArrowLeft,
  User,
  Calendar,
  Phone,
  Mail,
  MapPin,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Activity,
  Heart,
  AlertCircle,
  Shield,
  Award,
  Clock,
  CreditCard,
  FileText,
  UserCheck,
  AlertTriangle,
  Cigarette,
  Globe,
  Briefcase,
  Users,
  ChevronDown,
  ChevronUp,
  Download,
  Search,
  ClipboardList,
  Sparkles,
  Crown,
  Gem
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  BentoCard,
  BentoGrid,
  StatCard
} from '@/components/ui/bento-card'
import {
  GradientAreaChart,
  GradientLineChart,
  GradientBarChart,
  GradientPieChart
} from '@/components/ui/gradient-chart'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { formatCurrency, formatDate, getInitials } from '@/utils/formatters'
import { STAT_CONFIGS } from '@/config/statsConfig'
import { supabase, Customer, Transaction, Payment, CustomerVisitFrequency, ServiceSales } from '@/lib/supabase'
import { useCustomer } from '@/context/CustomerContext'

const CustomerDashboard: React.FC = () => {
  const { customerIdentifier } = useParams<{ customerIdentifier: string }>()
  const navigate = useNavigate()
  const { selectedCustomer, setSelectedCustomer } = useCustomer()

  const [customer, setCustomer] = useState<Customer | null>(selectedCustomer)
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [visitFrequency, setVisitFrequency] = useState<CustomerVisitFrequency | null>(null)
  const [serviceSales, setServiceSales] = useState<ServiceSales[]>([])
  const [loading, setLoading] = useState(true)
  const [showFullHistory, setShowFullHistory] = useState(false)

  // Search states
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<Customer[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)

  // Chart data states
  const [visitChartData, setVisitChartData] = useState<any[]>([])
  const [spendingChartData, setSpendingChartData] = useState<any[]>([])
  const [serviceBreakdown, setServiceBreakdown] = useState<any[]>([])
  const [paymentMethodData, setPaymentMethodData] = useState<any[]>([])

  // Sparkline data (will be calculated from actual data)
  const [lifetimeSparkline, setLifetimeSparkline] = useState<number[]>([])
  const [visitSparkline, setVisitSparkline] = useState<number[]>([])
  const [loyaltySparkline, setLoyaltySparkline] = useState<number[]>([])
  const [outstandingSparkline, setOutstandingSparkline] = useState<number[]>([])

  useEffect(() => {
    if (customerIdentifier) {
      loadCustomerByIdentifier()
    } else {
      // No identifier provided, stop loading
      setLoading(false)
    }
  }, [customerIdentifier])

  // Search with debounce
  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    const timer = setTimeout(async () => {
      await searchCustomers(searchQuery)
    }, 300)

    return () => clearTimeout(timer)
  }, [searchQuery])

  const loadCustomerByIdentifier = async () => {
    if (!customerIdentifier) {
      console.log('[CustomerDashboard] No customer identifier provided')
      return
    }

    console.log('[CustomerDashboard] Loading customer with identifier:', customerIdentifier)
    setLoading(true)

    try {
      let customerData: Customer | null = null

      // Check if it's a prefixed ID (starts with 'id-')
      if (customerIdentifier.startsWith('id-')) {
        // It's a UUID, load by ID
        const uuid = customerIdentifier.substring(3)
        console.log('[CustomerDashboard] Loading by UUID:', uuid)

        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .eq('id', uuid)
          .single()

        if (!error && data) {
          console.log('[CustomerDashboard] Found customer by UUID:', data.name)
          customerData = data
          setCustomerId(data.id)
        } else {
          console.error('[CustomerDashboard] Error loading by UUID:', error)
        }
      } else {
        // Try to load by membership number first
        console.log('[CustomerDashboard] Loading by membership number:', customerIdentifier)

        const { data: memberData, error: memberError } = await supabase
          .from('customers')
          .select('*')
          .eq('membership_number', customerIdentifier)
          .single()

        if (!memberError && memberData) {
          console.log('[CustomerDashboard] Found customer by membership number:', memberData.name)
          customerData = memberData
          setCustomerId(memberData.id)
        } else {
          console.log('[CustomerDashboard] Not found by membership number, trying by IC number for backward compatibility')

          // If not found by membership number, try by IC number (for backward compatibility)
          const { data: icData, error: icError } = await supabase
            .from('customers')
            .select('*')
            .eq('ic_number', customerIdentifier)
            .single()

          if (!icError && icData) {
            console.log('[CustomerDashboard] Found customer by IC number:', icData.name)
            customerData = icData
            setCustomerId(icData.id)
          } else {
            console.log('[CustomerDashboard] Not found by IC, trying by ID for backward compatibility')

            // If still not found, try by ID (for backward compatibility)
            const { data: idData, error: idError } = await supabase
              .from('customers')
              .select('*')
              .eq('id', customerIdentifier)
              .single()

            if (!idError && idData) {
              console.log('[CustomerDashboard] Found customer by ID:', idData.name)
              customerData = idData
              setCustomerId(idData.id)
            } else {
              console.error('[CustomerDashboard] Customer not found by any method')
            }
          }
        }
      }

      if (customerData) {
        console.log('[CustomerDashboard] Customer loaded successfully:', customerData.id, customerData.name)
        setCustomer(customerData)
        setSelectedCustomer(customerData)
        setCustomerId(customerData.id)
        // Now load all related data
        await loadAllData(customerData.id)
      } else {
        console.error('[CustomerDashboard] Customer not found with identifier:', customerIdentifier)
        setLoading(false)
      }
    } catch (error) {
      console.error('[CustomerDashboard] Error loading customer:', error)
      setLoading(false)
    }
  }

  const loadAllData = async (custId: string) => {
    if (!custId) return

    try {
      await Promise.all([
        loadTransactions(custId),
        loadVisitFrequency(custId),
        loadServiceSales(custId)
      ])
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadTransactions = async (custId: string) => {
    if (!custId) return

    const { data: transactionsData, error: transError } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', custId)
      .order('transaction_date', { ascending: false })

    if (transError) throw transError
    setTransactions(transactionsData || [])

    // Load payments for these transactions
    if (transactionsData && transactionsData.length > 0) {
      const transactionIds = transactionsData.map(t => t.id)
      const { data: paymentsData, error: payError } = await supabase
        .from('payments')
        .select('*')
        .in('transaction_id', transactionIds)
        .order('payment_date', { ascending: false })

      if (payError) throw payError
      setPayments(paymentsData || [])

      // Process payment methods
      processPaymentMethods(paymentsData || [])
    }

    // Process monthly spending trends
    processSpendingTrends(transactionsData || [])
  }

  const loadVisitFrequency = async (custId: string) => {
    if (!custId) return

    try {
      const { data: visitData, error } = await supabase
        .from('customer_visit_frequency')
        .select('*')
        .eq('customer_id', custId)
        .single()

      if (error) {
        // Check if it's a 404 (table doesn't exist) or just no data
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('[CustomerDashboard] customer_visit_frequency table not found')
        } else {
          console.log('[CustomerDashboard] No visit frequency data for customer')
        }
        return
      }

      setVisitFrequency(visitData)
      processVisitChartData(visitData)
      generateSparklines(visitData)
    } catch (err) {
      console.log('[CustomerDashboard] Error loading visit frequency:', err)
    }
  }

  const loadServiceSales = async (custId: string) => {
    if (!custId) return

    try {
      const { data: salesData, error } = await supabase
        .from('service_sales')
        .select('*')
        .eq('customer_id', custId)
        .order('sale_date', { ascending: false })

      if (error) {
        // Check if it's a 404 (table doesn't exist) or just no data
        if (error.code === 'PGRST116' || error.code === '42P01') {
          console.log('[CustomerDashboard] service_sales table not found')
        } else {
          console.log('[CustomerDashboard] No service sales data for customer')
        }
        return
      }

      setServiceSales(salesData || [])
      processServiceBreakdown(salesData || [])
    } catch (err) {
      console.log('[CustomerDashboard] Error loading service sales:', err)
    }
  }

  const searchCustomers = async (query: string) => {
    try {
      // Load all customers with select('*') then filter client-side
      // This approach works consistently regardless of column naming
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')
        .limit(10000) // Load all customers

      if (error) throw error

      // Filter on client side using the mapped field names
      const filtered = (data || []).filter(customer => {
        const searchLower = query.toLowerCase()
        // Search by name
        if (customer.name?.toLowerCase().includes(searchLower)) return true
        // Search by membership number/customer code
        if (customer.membership_number?.toLowerCase().includes(searchLower)) return true
        // Search by IC number
        if (customer.ic_number?.toLowerCase().includes(searchLower)) return true
        // Search by email
        if (customer.email?.toLowerCase().includes(searchLower)) return true
        // Search by phone
        if (customer.phone?.toLowerCase().includes(searchLower)) return true
        return false
      })

      // Limit results to 20 for display
      setSearchResults(filtered.slice(0, 20))
      setShowSearchResults(true)
      console.log(`[CustomerDashboard] Search found ${filtered.length} results for "${query}"`)
    } catch (error) {
      console.error('Error searching customers:', error)
      setSearchResults([])
    }
  }

  const handleSelectCustomer = (selectedCustomer: Customer) => {
    setSearchQuery('')
    setShowSearchResults(false)
    // Use membership number if available, otherwise use prefixed ID
    const identifier = selectedCustomer.membership_number || `id-${selectedCustomer.id}`
    navigate(`/customer/${identifier}`)
  }

  const processVisitChartData = (data: CustomerVisitFrequency) => {
    const chartData = [
      { month: 'Nov 24', visits: data.visits_nov_2024 },
      { month: 'Dec 24', visits: data.visits_dec_2024 },
      { month: 'Jan 25', visits: data.visits_jan_2025 },
      { month: 'Feb 25', visits: data.visits_feb_2025 },
      { month: 'Mar 25', visits: data.visits_mar_2025 },
      { month: 'Apr 25', visits: data.visits_apr_2025 },
      { month: 'May 25', visits: data.visits_may_2025 },
      { month: 'Jun 25', visits: data.visits_jun_2025 },
      { month: 'Jul 25', visits: data.visits_jul_2025 },
      { month: 'Aug 25', visits: data.visits_aug_2025 },
      { month: 'Sep 25', visits: data.visits_sep_2025 },
      { month: 'Oct 25', visits: data.visits_oct_2025 }
    ]
    setVisitChartData(chartData)
  }

  const processSpendingTrends = (trans: Transaction[]) => {
    const monthlySpending = new Map<string, { gross: number; net: number }>()

    trans.forEach(t => {
      if (t.transaction_date) {
        const date = new Date(t.transaction_date)
        const monthKey = `${date.getMonth() + 1}/${date.getFullYear().toString().slice(-2)}`

        const current = monthlySpending.get(monthKey) || { gross: 0, net: 0 }
        monthlySpending.set(monthKey, {
          gross: current.gross + (t.total_amount || 0),
          net: current.net + (t.net_amount || 0)
        })
      }
    })

    const data = Array.from(monthlySpending.entries())
      .map(([month, values]) => ({
        month,
        gross: values.gross,
        net: values.net
      }))
      .slice(-12)

    setSpendingChartData(data)
  }

  const processServiceBreakdown = (sales: ServiceSales[]) => {
    const serviceMap = new Map<string, number>()

    sales.forEach(sale => {
      const type = sale.service_type || 'Other'
      serviceMap.set(type, (serviceMap.get(type) || 0) + sale.nett_amount)
    })

    const data = Array.from(serviceMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6)

    setServiceBreakdown(data)
  }

  const processPaymentMethods = (paymentData: Payment[]) => {
    const methodMap = new Map<string, number>()

    paymentData.forEach(payment => {
      const method = payment.payment_method || 'Unknown'
      methodMap.set(method, (methodMap.get(method) || 0) + payment.amount)
    })

    const data = Array.from(methodMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)

    setPaymentMethodData(data)
  }

  const generateSparklines = (data: CustomerVisitFrequency) => {
    // Generate sparklines from monthly data
    const visits = [
      data.visits_nov_2024,
      data.visits_dec_2024,
      data.visits_jan_2025,
      data.visits_feb_2025,
      data.visits_mar_2025,
      data.visits_apr_2025,
      data.visits_may_2025,
      data.visits_jun_2025,
      data.visits_jul_2025,
      data.visits_aug_2025,
      data.visits_sep_2025,
      data.visits_oct_2025
    ]

    setVisitSparkline(visits)

    // Generate other sparklines (mock data for now, would be calculated from real data)
    setLifetimeSparkline([45, 52, 48, 65, 72, 68, 75, 82, 79, 88, 92, 95])
    setLoyaltySparkline([30, 32, 35, 33, 38, 40, 42, 45, 43, 48, 50, 52])
    setOutstandingSparkline([100, 95, 90, 85, 80, 75, 70, 65, 60, 55, 50, 45])
  }

  const getPaymentStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'Paid': { variant: 'default', label: 'Paid' },
      'Partially Paid': { variant: 'secondary', label: 'Partial' },
      'Unpaid': { variant: 'destructive', label: 'Unpaid' }
    }
    const statusInfo = statusMap[status || 'Unpaid'] || { variant: 'outline' as const, label: status || 'Unknown' }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const getCustomerRank = (totalSpent: number): 'CONSULTATION' | 'STARTER' | 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM' => {
    if (totalSpent <= 50) return 'CONSULTATION'
    if (totalSpent <= 499) return 'STARTER'
    if (totalSpent <= 1999) return 'BRONZE'
    if (totalSpent <= 4999) return 'SILVER'
    if (totalSpent <= 7999) return 'GOLD'
    return 'PLATINUM'
  }

  const getRankBadge = (rank: string) => {
    const rankConfig: Record<string, { icon: any, className: string }> = {
      'CONSULTATION': { icon: ClipboardList, className: 'border-slate-400 text-slate-600 bg-slate-50' },
      'STARTER': { icon: Sparkles, className: 'border-green-500 text-green-600 bg-green-50' },
      'BRONZE': { icon: Award, className: 'border-amber-600 text-amber-700 bg-amber-50' },
      'SILVER': { icon: Award, className: 'border-gray-500 text-gray-700 bg-gray-50' },
      'GOLD': { icon: Crown, className: 'border-yellow-600 text-yellow-700 bg-yellow-50' },
      'PLATINUM': { icon: Gem, className: 'border-blue-600 text-blue-700 bg-blue-50' }
    }
    const config = rankConfig[rank] || rankConfig['CONSULTATION']
    const Icon = config.icon
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {rank}
      </Badge>
    )
  }

  // Calculate stats from data with fallbacks
  const calculateTotalSpent = () => {
    if (visitFrequency?.total_spent) return visitFrequency.total_spent
    // Fallback: Calculate from transactions
    return transactions.reduce((sum, t) => sum + (t.net_amount || 0), 0)
  }

  const calculateTotalVisits = () => {
    if (visitFrequency?.total_visits) return visitFrequency.total_visits
    // Fallback: Count unique transaction dates
    const uniqueDates = new Set(transactions.map(t => t.transaction_date?.split('T')[0]))
    return uniqueDates.size
  }

  const calculateLastVisitDays = () => {
    if (visitFrequency?.last_visit_date) {
      return Math.floor((new Date().getTime() - new Date(visitFrequency.last_visit_date).getTime()) / (1000 * 60 * 60 * 24))
    }
    // Fallback: Use most recent transaction date
    if (transactions.length > 0) {
      const sortedTransactions = [...transactions].sort((a, b) =>
        new Date(b.transaction_date || 0).getTime() - new Date(a.transaction_date || 0).getTime()
      )
      const lastDate = sortedTransactions[0]?.transaction_date
      if (lastDate) {
        return Math.floor((new Date().getTime() - new Date(lastDate).getTime()) / (1000 * 60 * 60 * 24))
      }
    }
    return 0
  }

  const stats = {
    totalSpent: calculateTotalSpent(),
    totalVisits: calculateTotalVisits(),
    customerLifetimeDays: visitFrequency?.customer_lifetime_days || 0,
    outstandingBalance: transactions.reduce((sum, t) => sum + (t.outstanding_amount || 0), 0),
    averageTransaction: visitFrequency?.average_transaction_value || (calculateTotalSpent() / Math.max(calculateTotalVisits(), 1)),
    lastVisitDays: calculateLastVisitDays()
  }

  if (loading) {
    return <LoadingSpinner message="Loading customer data..." fullscreen />
  }

  if (!customer) {
    return (
      <Layout>
        <PageContainer>
          <EmptyState
            icon={Users}
            title="No Customer Selected"
            description="Please select a customer from the homepage to view their dashboard, or search for a customer using the search bar."
            size="lg"
            action={{
              label: 'Back to Home',
              onClick: () => navigate('/')
            }}
          />
        </PageContainer>
      </Layout>
    )
  }

  return (
    <Layout>
      <PageContainer>
        <PageHeader
          title=""
          subtitle=""
          size="lg"
          showBackButton
          onBackClick={() => navigate('/')}
          animation="fade-in"
        />

        {/* Customer Search */}
        <div className="mb-6 relative">
          <div className="relative max-w-md">
            <SearchInput
              value={searchQuery}
              onChange={setSearchQuery}
              placeholder="Search customers by name, IC #, customer code, or email..."
              onFocus={() => searchQuery.length >= 2 && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
            />
          </div>

          {/* Autocomplete Dropdown */}
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute z-50 mt-1 w-full max-w-md bg-card border border-border rounded-lg shadow-lg max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => handleSelectCustomer(result)}
                  className="w-full px-4 py-3 hover:bg-accent/50 text-left border-b border-border/50 last:border-b-0 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-foreground">
                        {result.name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {result.membership_number} {result.email && `• ${result.email}`}
                      </p>
                    </div>
                    <User className="h-4 w-4 text-muted-foreground/70" />
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Customer Hero Card */}
        <BentoCard
          variant="gradient"
          className="mb-8 animate-fade-in"
          colSpan={4}
        >
          <div className="flex items-start gap-6">
            <Avatar className="h-24 w-24 border-4 border-background shadow-xl">
              <AvatarFallback className="text-2xl bg-primary dark:bg-primary/30 text-primary-foreground">
                {getInitials(customer.name)}
              </AvatarFallback>
            </Avatar>

            <div className="flex-1">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-primary">
                    {customer.name}
                  </h1>
                  <p className="text-muted-foreground mt-1 flex items-center gap-2">
                    <Shield className="h-4 w-4" />
                    Member ID: {customer.membership_number}
                    {customer.ic_number && (
                      <>
                        <span className="text-muted-foreground/70">•</span>
                        IC: {customer.ic_number}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex gap-2">
                  {getRankBadge(getCustomerRank(stats.totalSpent))}
                  {visitFrequency?.is_active && (
                    <Badge variant="outline" className="border-green-500 text-green-600">
                      Active
                    </Badge>
                  )}
                  {visitFrequency?.is_at_risk && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      At Risk
                    </Badge>
                  )}
                  {visitFrequency?.is_dormant && (
                    <Badge variant="outline" className="border-red-500 text-red-600">
                      Dormant
                    </Badge>
                  )}
                  <Badge variant="outline">
                    {customer.gender || 'N/A'}
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/80">{customer.phone || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/80">{customer.email || 'N/A'}</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/80">
                    {customer.age ? `${customer.age} years` : formatDate(customer.birth_date)}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/80">{customer.city || 'N/A'}, {customer.state || 'N/A'}</span>
                </div>
              </div>

              {/* Medical Alerts */}
              {(customer.drug_allergies || customer.medical_conditions || customer.alerts || customer.smoker) && (
                <div className="mt-4 p-3 rounded-lg bg-red-50 border border-red-200">
                  <div className="flex items-center gap-2 text-red-700 font-medium mb-2">
                    <AlertCircle className="h-4 w-4" />
                    Medical Information
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    {customer.drug_allergies && (
                      <div className="text-red-600">
                        <strong>Allergies:</strong> {customer.drug_allergies}
                      </div>
                    )}
                    {customer.medical_conditions && (
                      <div className="text-red-600">
                        <strong>Conditions:</strong> {customer.medical_conditions}
                      </div>
                    )}
                    {customer.alerts && (
                      <div className="text-red-600">
                        <strong>Alerts:</strong> {customer.alerts}
                      </div>
                    )}
                    {customer.smoker && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <Cigarette className="h-3 w-3" />
                        <strong>Smoker</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </BentoCard>

        {/* Key Metrics */}
        <motion.div
          className="mb-8"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: {
              opacity: 1,
              transition: {
                staggerChildren: 0.1,
              },
            },
          }}
        >
          <BentoGrid cols={4} gap="md">
            <StatCard
              title="Lifetime Value"
              subtitle="Total spent"
              icon={STAT_CONFIGS.lifetime.icon}
              iconColor={STAT_CONFIGS.lifetime.iconColor}
              value={
                <CountUp
                  end={stats.totalSpent}
                  duration={2}
                  decimals={2}
                  prefix="RM "
                  separator=","
                />
              }
              change={23.5}
              changeLabel="vs avg customer"
              trend="up"
              sparkline={lifetimeSparkline}
              sparklineColor={STAT_CONFIGS.lifetime.sparklineColor}
              variant="gradient"
              className="animate-scale-in"
              style={{ animationDelay: '0ms' }}
            />

            <StatCard
              title="Visit Frequency"
              subtitle="Total visits"
              icon={STAT_CONFIGS.visits.icon}
              iconColor={STAT_CONFIGS.visits.iconColor}
              value={
                <CountUp
                  end={stats.totalVisits}
                  duration={2}
                  decimals={0}
                  separator=","
                />
              }
              change={visitFrequency?.avg_visit_month || 0}
              changeLabel="per month avg"
              trend="up"
              sparkline={visitSparkline}
              sparklineColor={STAT_CONFIGS.visits.sparklineColor}
              variant="gradient"
              className="animate-scale-in"
              style={{ animationDelay: '100ms' }}
            />

            <StatCard
              title="Customer Loyalty"
              subtitle={`${stats.customerLifetimeDays} days`}
              icon={STAT_CONFIGS.loyalty.icon}
              iconColor={STAT_CONFIGS.loyalty.iconColor}
              value={
                <CountUp
                  end={stats.lastVisitDays}
                  duration={2}
                  decimals={0}
                  suffix="d ago"
                />
              }
              change={stats.lastVisitDays > 30 ? -1 : 1}
              changeLabel="last visit"
              trend={stats.lastVisitDays > 30 ? "down" : "up"}
              sparkline={loyaltySparkline}
              sparklineColor={STAT_CONFIGS.loyalty.sparklineColor}
              variant="gradient"
              className="animate-scale-in"
              style={{ animationDelay: '200ms' }}
            />

            <StatCard
              title="Outstanding"
              subtitle="Balance due"
              icon={STAT_CONFIGS.payments.icon}
              iconColor={stats.outstandingBalance > 0 ? "danger" : "success"}
              value={
                <CountUp
                  end={stats.outstandingBalance}
                  duration={2}
                  decimals={2}
                  prefix="RM "
                  separator=","
                />
              }
              change={stats.outstandingBalance > 0 ? (stats.outstandingBalance / stats.totalSpent * 100) : 0}
              changeLabel="of total"
              trend={stats.outstandingBalance > 0 ? "up" : "neutral"}
              sparkline={outstandingSparkline}
              sparklineColor={STAT_CONFIGS.payments.sparklineColor}
              variant="gradient"
              className="animate-scale-in"
              style={{ animationDelay: '300ms' }}
            />
          </BentoGrid>
        </motion.div>

        {/* Analytics Section */}
        <BentoGrid cols={4} gap="lg" className="mb-8">
          {/* Visit Frequency Chart */}
          {visitChartData.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={chartEntrance}
            >
              <BentoCard
                title="Visit Frequency Analysis"
                subtitle="Monthly visit patterns"
                icon={Activity}
                iconColor="primary"
                variant="gradient"
                colSpan={3}
                rowSpan={2}
                className="animate-fade-in"
              >
                <GradientAreaChart
                  data={visitChartData}
                  dataKey="visits"
                  xAxisKey="month"
                  height={300}
                  color="primary"
                />
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-border">
                  <div>
                    <p className="text-xs text-muted-foreground">Avg per week</p>
                    <p className="text-lg font-semibold">{visitFrequency?.avg_visit_week.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg per month</p>
                    <p className="text-lg font-semibold">{visitFrequency?.avg_visit_month.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Avg per year</p>
                    <p className="text-lg font-semibold">{visitFrequency?.avg_visit_year.toFixed(2)}</p>
                  </div>
                </div>
              </BentoCard>
            </motion.div>
          )}

          {/* Spending Trends */}
          {spendingChartData.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={chartEntrance}
            >
              <BentoCard
                title="Spending Trends"
                subtitle="Gross vs Net"
                icon={TrendingUp}
                iconColor="success"
                variant="gradient"
                colSpan={1}
                rowSpan={2}
                className="animate-fade-in"
              >
                <GradientLineChart
                  data={spendingChartData}
                  lines={[
                    { dataKey: 'gross', color: 'primary', name: 'Gross' },
                    { dataKey: 'net', color: 'accent', name: 'Net' }
                  ]}
                  xAxisKey="month"
                  height={300}
                />
              </BentoCard>
            </motion.div>
          )}
        </BentoGrid>

        {/* Information Row */}
        <BentoGrid cols={4} gap="md" className="mb-8">
          {/* Medical Information */}
          <BentoCard
            title="Medical Profile"
            subtitle="Health information"
            icon={Heart}
            iconColor={customer.drug_allergies || customer.medical_conditions ? "danger" : "success"}
            variant="glass"
            colSpan={2}
            className="animate-fade-in"
          >
            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Drug Allergies</p>
                <p className={`font-medium ${customer.drug_allergies ? 'text-red-600' : 'text-foreground/70'}`}>
                  {customer.drug_allergies || 'None recorded'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Medical Conditions</p>
                <p className={`font-medium ${customer.medical_conditions ? 'text-amber-600' : 'text-foreground/70'}`}>
                  {customer.medical_conditions || 'None recorded'}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <p className="text-xs text-muted-foreground mb-1">Alerts</p>
                <p className={`font-medium ${customer.alerts ? 'text-red-600' : 'text-foreground/70'}`}>
                  {customer.alerts || 'No alerts'}
                </p>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                <span className="text-sm text-foreground/70">Smoker Status</span>
                {customer.smoker ? (
                  <Badge variant="destructive">
                    <Cigarette className="h-3 w-3 mr-1" />
                    Smoker
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-green-600 border-green-500">
                    Non-smoker
                  </Badge>
                )}
              </div>
            </div>
          </BentoCard>

          {/* Demographics */}
          <BentoCard
            title="Demographics"
            subtitle="Personal details"
            icon={Users}
            iconColor="secondary"
            variant="gradient"
            colSpan={1}
            className="animate-fade-in"
          >
            <div className="space-y-2 text-sm">
              {customer.occupation && (
                <div className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/70">{customer.occupation}</span>
                </div>
              )}
              {customer.marital_status && (
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/70">{customer.marital_status}</span>
                </div>
              )}
              {customer.income_range && (
                <div className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/70">{customer.income_range}</span>
                </div>
              )}
              {customer.preferred_language && (
                <div className="flex items-center gap-2">
                  <Globe className="h-4 w-4 text-muted-foreground/70" />
                  <span className="text-foreground/70">{customer.preferred_language}</span>
                </div>
              )}
              {customer.race && (
                <div className="text-foreground/70">Race: {customer.race}</div>
              )}
              {customer.religion && (
                <div className="text-foreground/70">Religion: {customer.religion}</div>
              )}
            </div>
          </BentoCard>

          {/* Referral Info */}
          {customer.referrer && (
            <BentoCard
              title="Referral"
              subtitle="Source"
              icon={UserCheck}
              iconColor="info"
              variant="gradient"
              colSpan={1}
              className="animate-fade-in"
            >
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-muted-foreground">Referred by</p>
                  <p className="font-medium">{customer.referrer}</p>
                </div>
                {customer.referrer_relationship && (
                  <div>
                    <p className="text-xs text-muted-foreground">Relationship</p>
                    <p className="font-medium">{customer.referrer_relationship}</p>
                  </div>
                )}
                {customer.referrer_contact && (
                  <div>
                    <p className="text-xs text-muted-foreground">Contact</p>
                    <p className="font-medium">{customer.referrer_contact}</p>
                  </div>
                )}
              </div>
            </BentoCard>
          )}
        </BentoGrid>

        {/* Service & Payment Analytics */}
        <BentoGrid cols={3} gap="lg" className="mb-8">
          {/* Service Breakdown */}
          {serviceBreakdown.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={chartEntrance}
            >
              <BentoCard
                title="Service Preferences"
                subtitle="By revenue"
                icon={FileText}
                iconColor="warning"
                variant="gradient"
                colSpan={2}
                className="animate-fade-in"
              >
                <GradientPieChart
                  data={serviceBreakdown}
                  height={250}
                />
              </BentoCard>
            </motion.div>
          )}

          {/* Payment Methods */}
          {paymentMethodData.length > 0 && (
            <motion.div
              initial="hidden"
              animate="visible"
              variants={chartEntrance}
            >
              <BentoCard
                title="Payment Methods"
                subtitle="Distribution"
                icon={CreditCard}
                iconColor="accent"
                variant="gradient"
                colSpan={1}
                className="animate-fade-in"
              >
                <div className="space-y-3">
                  {paymentMethodData.map((method, index) => {
                    const total = paymentMethodData.reduce((sum, m) => sum + m.value, 0)
                    const percentage = (method.value / total * 100).toFixed(1)
                    return (
                      <div key={index} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-foreground/70">{method.name}</span>
                          <span className="font-medium">{percentage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div
                            className="bg-primary h-2 rounded-full"
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {formatCurrency(method.value)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </BentoCard>
            </motion.div>
          )}
        </BentoGrid>

        {/* Recent Activity */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={chartEntrance}
        >
          <BentoCard
            title="Recent Activity"
            subtitle="Last 5 transactions"
            icon={Activity}
            iconColor="primary"
            variant="outlined"
            colSpan={4}
            className="animate-fade-in mb-8"
          >
            {transactions.slice(0, 5).map((transaction, index) => (
              <div key={index} className="flex items-center justify-between p-3 hover:bg-accent/50/50 rounded-lg transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                  <div>
                    <p className="font-medium text-sm">{transaction.so_number}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(transaction.transaction_date)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-medium text-sm">{formatCurrency(transaction.net_amount)}</p>
                    <p className="text-xs text-muted-foreground">{transaction.transaction_type || 'Sale'}</p>
                  </div>
                  {getPaymentStatusBadge(transaction.payment_status)}
                </div>
              </div>
            ))}
          </BentoCard>
        </motion.div>

        {/* Transaction History */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={chartEntrance}
        >
          <BentoCard
            title="Complete Transaction History"
            subtitle={`${transactions.length} transactions`}
            icon={FileText}
            iconColor="secondary"
            variant="gradient"
            colSpan={4}
            className="animate-fade-in"
          >
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowFullHistory(!showFullHistory)}
            >
              {showFullHistory ? (
                <>
                  <ChevronUp className="h-4 w-4 mr-2" />
                  Show Less
                </>
              ) : (
                <>
                  <ChevronDown className="h-4 w-4 mr-2" />
                  Show All ({transactions.length})
                </>
              )}
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={() => console.log('Export transactions')}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>

          {transactions.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No transactions found
            </div>
          ) : (
            <div className="rounded-lg border border-border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead>Date</TableHead>
                    <TableHead>SO Number</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-right">Discount</TableHead>
                    <TableHead className="text-right">Net Amount</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(showFullHistory ? transactions : transactions.slice(0, 10)).map((transaction) => (
                    <TableRow key={transaction.id} className="hover:bg-accent/50/30">
                      <TableCell>{formatDate(transaction.transaction_date)}</TableCell>
                      <TableCell className="font-medium">{transaction.so_number}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {transaction.transaction_type || 'Sale'}
                        </Badge>
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(transaction.payment_status)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(transaction.total_amount)}</TableCell>
                      <TableCell className="text-right">
                        {transaction.total_discount && transaction.total_discount > 0 && (
                          <span className="text-green-600">-{formatCurrency(transaction.total_discount)}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right font-medium">{formatCurrency(transaction.net_amount)}</TableCell>
                      <TableCell className="text-right">
                        {transaction.outstanding_amount && transaction.outstanding_amount > 0 ? (
                          <span className="text-red-600 font-medium">{formatCurrency(transaction.outstanding_amount)}</span>
                        ) : (
                          <Badge variant="outline" className="text-green-600">
                            Paid
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
          </BentoCard>
        </motion.div>
      </PageContainer>
    </Layout>
  )
}

export default CustomerDashboard