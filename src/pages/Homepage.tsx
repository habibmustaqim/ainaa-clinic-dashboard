import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Upload, BarChart3, Search, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { supabase, Customer } from '@/lib/supabase'
import { useCustomer } from '@/context/CustomerContext'

const Homepage: React.FC = () => {
  const navigate = useNavigate()
  const { selectCustomer } = useCustomer()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalRevenue: 0,
    totalTransactions: 0
  })

  useEffect(() => {
    loadCustomers()
    loadStats()
  }, [])

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

  const loadCustomers = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .order('name')

      if (error) throw error
      setCustomers(data || [])
    } catch (error) {
      console.error('Error loading customers:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    try {
      const { count: customerCount } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })

      const { data: revenueData } = await supabase
        .from('transactions')
        .select('net_amount')

      const { count: transactionCount } = await supabase
        .from('transactions')
        .select('*', { count: 'exact', head: true })

      const totalRevenue = revenueData?.reduce((sum, t) => sum + (t.net_amount || 0), 0) || 0

      setStats({
        totalCustomers: customerCount || 0,
        totalRevenue,
        totalTransactions: transactionCount || 0
      })
    } catch (error) {
      console.error('Error loading stats:', error)
    }
  }

  const handleCustomerSelect = (customer: Customer) => {
    selectCustomer(customer)
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // File upload logic would go here
    console.log('File selected:', file.name)
    // You can integrate with your existing upload processor utils
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Ainaa Clinic Dashboard
          </h1>
          <p className="text-gray-600">
            Welcome to your comprehensive patient management system
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">RM {stats.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Transactions</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Data Upload Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Upload Data
              </CardTitle>
              <CardDescription>
                Import customer and transaction data from Excel or CSV files
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-500 transition-colors">
                  <input
                    type="file"
                    accept=".csv,.xlsx,.xls"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-sm text-gray-600 mb-2">
                      Click to upload or drag and drop
                    </p>
                    <p className="text-xs text-gray-500">
                      Excel (.xlsx, .xls) or CSV files
                    </p>
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Customer Search Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Customer
              </CardTitle>
              <CardDescription>
                Find and view customer details and transaction history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name, membership number, or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                {filteredCustomers.length > 0 && (
                  <div className="border rounded-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.map((customer) => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 transition-colors"
                      >
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-gray-500">
                          {customer.membership_number} • {customer.contact_number}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {searchQuery && filteredCustomers.length === 0 && (
                  <div className="text-center py-4 text-gray-500 text-sm">
                    No customers found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button
            onClick={() => navigate('/analytics')}
            size="lg"
            className="flex-1"
          >
            <BarChart3 className="mr-2 h-5 w-5" />
            View Analytics Dashboard
          </Button>
        </div>
      </div>
    </div>
  )
}

export default Homepage
