import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, TrendingUp, DollarSign, Users, ShoppingCart } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  PieChart,
  Pie,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  Cell,
  ResponsiveContainer
} from 'recharts'
import { supabase, Transaction, Payment, Item } from '@/lib/supabase'
import { chartColors, chartConfig } from '@/lib/chartTheme'

interface ServiceCategoryData {
  category: string
  revenue: number
  count: number
}

interface PaymentMethodData {
  name: string
  value: number
  count: number
}

interface TopServiceData {
  name: string
  revenue: number
  count: number
}

interface PromotionData {
  month: string
  withPromotion: number
  withoutPromotion: number
}

interface TopItemData {
  name: string
  quantity: number
  revenue: number
}

const Analytics: React.FC = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTransactions: 0,
    totalCustomers: 0,
    averageTransaction: 0
  })

  // Chart data states
  const [serviceCategoryData, setServiceCategoryData] = useState<ServiceCategoryData[]>([])
  const [paymentMethodData, setPaymentMethodData] = useState<PaymentMethodData[]>([])
  const [topServicesData, setTopServicesData] = useState<TopServiceData[]>([])
  const [promotionData, setPromotionData] = useState<PromotionData[]>([])
  const [topSellingItems, setTopSellingItems] = useState<TopItemData[]>([])
  const [topRevenueItems, setTopRevenueItems] = useState<TopItemData[]>([])

  useEffect(() => {
    loadAnalyticsData()
  }, [])

  const loadAnalyticsData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        loadOverallStats(),
        loadServiceCategoryPerformance(),
        loadPaymentMethodDistribution(),
        loadTopServices(),
        loadPromotionEffectiveness(),
        loadTopSellingItems(),
        loadTopRevenueItems()
      ])
    } catch (error) {
      console.error('Error loading analytics:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadOverallStats = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('net_amount')

      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      const totalRevenue = transactions?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0
      const totalTransactions = transactions?.length || 0
      const averageTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

      setStats({
        totalRevenue,
        totalTransactions,
        totalCustomers: customerCount || 0,
        averageTransaction
      })
    } catch (error) {
      console.error('Error loading overall stats:', error)
    }
  }

  const loadServiceCategoryPerformance = async () => {
    try {
      const { data: items } = await supabase
        .from('items')
        .select('category, total_price, quantity')

      if (!items) return

      const categoryMap = new Map<string, { revenue: number; count: number }>()

      items.forEach(item => {
        const category = item.category || 'Uncategorized'
        const current = categoryMap.get(category) || { revenue: 0, count: 0 }
        categoryMap.set(category, {
          revenue: current.revenue + (item.total_price || 0),
          count: current.count + (item.quantity || 0)
        })
      })

      const data = Array.from(categoryMap.entries())
        .map(([category, stats]) => ({
          category,
          revenue: stats.revenue,
          count: stats.count
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setServiceCategoryData(data)
    } catch (error) {
      console.error('Error loading service categories:', error)
    }
  }

  const loadPaymentMethodDistribution = async () => {
    try {
      const { data: payments } = await supabase
        .from('payments')
        .select('payment_method, amount')

      if (!payments) return

      const methodMap = new Map<string, { value: number; count: number }>()

      payments.forEach(payment => {
        const method = payment.payment_method || 'Unknown'
        const current = methodMap.get(method) || { value: 0, count: 0 }
        methodMap.set(method, {
          value: current.value + (payment.amount || 0),
          count: current.count + 1
        })
      })

      const data = Array.from(methodMap.entries())
        .map(([name, stats]) => ({
          name,
          value: stats.value,
          count: stats.count
        }))
        .sort((a, b) => b.value - a.value)

      setPaymentMethodData(data)
    } catch (error) {
      console.error('Error loading payment methods:', error)
    }
  }

  const loadTopServices = async () => {
    try {
      const { data: items } = await supabase
        .from('items')
        .select('item_name, total_price, quantity')

      if (!items) return

      const serviceMap = new Map<string, { revenue: number; count: number }>()

      items.forEach(item => {
        const name = item.item_name || 'Unknown'
        const current = serviceMap.get(name) || { revenue: 0, count: 0 }
        serviceMap.set(name, {
          revenue: current.revenue + (item.total_price || 0),
          count: current.count + (item.quantity || 0)
        })
      })

      const data = Array.from(serviceMap.entries())
        .map(([name, stats]) => ({
          name,
          revenue: stats.revenue,
          count: stats.count
        }))
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setTopServicesData(data)
    } catch (error) {
      console.error('Error loading top services:', error)
    }
  }

  const loadPromotionEffectiveness = async () => {
    try {
      const { data: transactions } = await supabase
        .from('transactions')
        .select('transaction_date, total_discount, net_amount')
        .order('transaction_date')

      if (!transactions) return

      const monthlyMap = new Map<string, { withPromotion: number; withoutPromotion: number }>()

      transactions.forEach(transaction => {
        if (!transaction.transaction_date) return

        const date = new Date(transaction.transaction_date)
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`

        const current = monthlyMap.get(monthKey) || { withPromotion: 0, withoutPromotion: 0 }

        if (transaction.total_discount > 0) {
          current.withPromotion += transaction.net_amount || 0
        } else {
          current.withoutPromotion += transaction.net_amount || 0
        }

        monthlyMap.set(monthKey, current)
      })

      const data = Array.from(monthlyMap.entries())
        .map(([month, stats]) => ({
          month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
          withPromotion: stats.withPromotion,
          withoutPromotion: stats.withoutPromotion
        }))
        .sort((a, b) => a.month.localeCompare(b.month))
        .slice(-12)

      setPromotionData(data)
    } catch (error) {
      console.error('Error loading promotion effectiveness:', error)
    }
  }

  const loadTopSellingItems = async () => {
    try {
      const { data: items } = await supabase
        .from('items')
        .select('item_name, quantity, total_price')

      if (!items) return

      const itemMap = new Map<string, { quantity: number; revenue: number }>()

      items.forEach(item => {
        const name = item.item_name || 'Unknown'
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
        .slice(0, 10)

      setTopSellingItems(data)
    } catch (error) {
      console.error('Error loading top selling items:', error)
    }
  }

  const loadTopRevenueItems = async () => {
    try {
      const { data: items } = await supabase
        .from('items')
        .select('item_name, quantity, total_price')

      if (!items) return

      const itemMap = new Map<string, { quantity: number; revenue: number }>()

      items.forEach(item => {
        const name = item.item_name || 'Unknown'
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
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 10)

      setTopRevenueItems(data)
    } catch (error) {
      console.error('Error loading top revenue items:', error)
    }
  }

  const formatCurrency = (value: number) => {
    return `RM ${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{label}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {typeof entry.value === 'number' && entry.name.toLowerCase().includes('revenue') || entry.name.toLowerCase().includes('amount')
                ? formatCurrency(entry.value)
                : entry.value.toLocaleString()}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  const PieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload
      return (
        <div className="bg-white p-4 border rounded-lg shadow-lg">
          <p className="font-semibold mb-2">{data.name}</p>
          <p className="text-sm">Amount: {formatCurrency(data.value)}</p>
          <p className="text-sm">Count: {data.count}</p>
          <p className="text-sm">Percentage: {((data.value / paymentMethodData.reduce((sum, item) => sum + item.value, 0)) * 100).toFixed(1)}%</p>
        </div>
      )
    }
    return null
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="mb-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Home
          </Button>
          <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
          <p className="text-gray-600">Comprehensive insights into your clinic performance</p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.totalRevenue)}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <ShoppingCart className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Customers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalCustomers.toLocaleString()}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Transaction</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatCurrency(stats.averageTransaction)}</div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* 1. Service Category Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Service Category Performance</CardTitle>
              <CardDescription>Revenue by service category</CardDescription>
            </CardHeader>
            <CardContent>
              {serviceCategoryData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={serviceCategoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="category" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" fill={chartColors.primary} name="Revenue (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Payment Method Distribution */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Method Distribution</CardTitle>
              <CardDescription>Payment methods by transaction value</CardDescription>
            </CardHeader>
            <CardContent>
              {paymentMethodData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={paymentMethodData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => entry.name}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {paymentMethodData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={chartConfig.colors[index % chartConfig.colors.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* 3. Top Services */}
          <Card>
            <CardHeader>
              <CardTitle>Top Services by Revenue</CardTitle>
              <CardDescription>Best performing services</CardDescription>
            </CardHeader>
            <CardContent>
              {topServicesData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topServicesData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" fill={chartColors.success} name="Revenue (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* 4. Promotion Effectiveness */}
          <Card>
            <CardHeader>
              <CardTitle>Promotion Effectiveness</CardTitle>
              <CardDescription>Revenue comparison with and without promotions</CardDescription>
            </CardHeader>
            <CardContent>
              {promotionData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={promotionData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Line type="monotone" dataKey="withPromotion" stroke={chartColors.secondary} name="With Promotion" strokeWidth={2} />
                    <Line type="monotone" dataKey="withoutPromotion" stroke={chartColors.info} name="Without Promotion" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* 5. Top Selling Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Selling Items</CardTitle>
              <CardDescription>Items by quantity sold</CardDescription>
            </CardHeader>
            <CardContent>
              {topSellingItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topSellingItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="quantity" fill={chartColors.warning} name="Quantity" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* 6. Top Revenue Items */}
          <Card>
            <CardHeader>
              <CardTitle>Top Revenue Items</CardTitle>
              <CardDescription>Items by revenue generated</CardDescription>
            </CardHeader>
            <CardContent>
              {topRevenueItems.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topRevenueItems} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    <Bar dataKey="revenue" fill={chartColors.danger} name="Revenue (RM)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-[300px] text-gray-500">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default Analytics
