import React, { useState, useEffect, useMemo } from 'react'
import { ColumnDef } from '@tanstack/react-table'
import { FileDown, Filter, X } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageContainer, PageHeader } from '@/components/layout/index'
import { BentoGrid, StatCard } from '@/components/ui/bento-card'
import { DateRangeFilter } from '@/components/ui/DateRangeFilter'
import { MultiSelectFilter, MultiSelectOption } from '@/components/ui/MultiSelectFilter'
import { RangeFilter } from '@/components/ui/RangeFilter'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { STAT_CONFIGS } from '@/config/statsConfig'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { exportData, ExportColumn } from '@/utils/exportUtils'
import { DateRange, getPresetRange } from '@/utils/dateHelpers'
import { supabase } from '@/lib/supabase'

interface ReportRow {
  id: string
  date: string
  customerName: string
  service: string
  beautician: string
  amount: number
  paymentMethod: string
  status: string
  discount: number
}

const Reporting: React.FC = () => {
  // State - Filters
  const [dateRange, setDateRange] = useState<DateRange>(getPresetRange('month'))
  const [selectedBeauticians, setSelectedBeauticians] = useState<string[]>([])
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [purchaseRange, setPurchaseRange] = useState<{ min: number | null; max: number | null }>({
    min: null,
    max: null,
  })
  const [showFilters, setShowFilters] = useState(true)

  // State - Data
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<any[]>([])
  const [beauticiansOptions, setBeauticiansOptions] = useState<MultiSelectOption[]>([])
  const [servicesOptions, setServicesOptions] = useState<MultiSelectOption[]>([])

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const { data: serviceSales, error } = await supabase
          .from('service_sales')
          .select(`
            id,
            sale_date,
            customer_id,
            service_type,
            service_name,
            nett_amount,
            payment_mode,
            sales_person,
            is_cancelled,
            discount_amount,
            customers (
              name
            )
          `)
          .order('sale_date', { ascending: false })

        if (error) throw error

        // Process data
        const processed = (serviceSales || []).map((sale: any) => ({
          ...sale,
          customerName: sale.customers?.name || 'Unknown',
        }))

        setRawData(processed)

        // Extract unique beauticians
        const uniqueBeauticians = Array.from(
          new Set(processed.map((s: any) => s.sales_person).filter(Boolean))
        ).sort() as string[]
        setBeauticiansOptions(
          uniqueBeauticians.map(b => ({ value: b, label: b }))
        )

        // Extract unique services
        const uniqueServices = Array.from(
          new Set(processed.map((s: any) => s.service_name || s.service_type).filter(Boolean))
        ).sort() as string[]
        setServicesOptions(
          uniqueServices.map(s => ({ value: s, label: s }))
        )
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Filter data
  const filteredData = useMemo(() => {
    return rawData.filter(row => {
      // Date filter
      const saleDate = new Date(row.sale_date)
      if (dateRange.from && saleDate < dateRange.from) return false
      if (dateRange.to && saleDate > dateRange.to) return false

      // Beautician filter
      if (selectedBeauticians.length > 0 && !selectedBeauticians.includes(row.sales_person)) {
        return false
      }

      // Service filter
      const service = row.service_name || row.service_type
      if (selectedServices.length > 0 && !selectedServices.includes(service)) {
        return false
      }

      // Purchase range filter
      const amount = row.nett_amount || 0
      if (purchaseRange.min !== null && amount < purchaseRange.min) return false
      if (purchaseRange.max !== null && amount > purchaseRange.max) return false

      return true
    })
  }, [rawData, dateRange, selectedBeauticians, selectedServices, purchaseRange])

  // Transform to table rows
  const tableData: ReportRow[] = useMemo(() => {
    return filteredData.map(row => ({
      id: row.id,
      date: row.sale_date,
      customerName: row.customerName,
      service: row.service_name || row.service_type || '-',
      beautician: row.sales_person || '-',
      amount: row.nett_amount || 0,
      paymentMethod: row.payment_mode || '-',
      status: row.is_cancelled ? 'Cancelled' : 'Completed',
      discount: row.discount_amount || 0,
    }))
  }, [filteredData])

  // Calculate stats
  const stats = useMemo(() => {
    const totalRevenue = filteredData.reduce((sum, row) => sum + (row.nett_amount || 0), 0)
    const totalTransactions = filteredData.length
    const uniqueCustomers = new Set(filteredData.map(row => row.customer_id)).size
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    return {
      totalRevenue,
      totalTransactions,
      totalCustomers: uniqueCustomers,
      avgTransaction,
    }
  }, [filteredData])

  // Table columns
  const columns: ColumnDef<ReportRow>[] = [
    {
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('date')),
      enableSorting: true,
    },
    {
      accessorKey: 'customerName',
      header: 'Customer',
      enableSorting: true,
    },
    {
      accessorKey: 'service',
      header: 'Service',
      enableSorting: true,
    },
    {
      accessorKey: 'beautician',
      header: 'Beautician',
      enableSorting: true,
    },
    {
      accessorKey: 'amount',
      header: 'Amount',
      cell: ({ row }) => formatCurrency(row.getValue('amount')),
      enableSorting: true,
    },
    {
      accessorKey: 'discount',
      header: 'Discount',
      cell: ({ row }) => formatCurrency(row.getValue('discount')),
      enableSorting: true,
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment Method',
      enableSorting: true,
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('status') as string
        return (
          <Badge
            variant={status === 'Completed' ? 'default' : 'destructive'}
            className="text-xs"
          >
            {status}
          </Badge>
        )
      },
      enableSorting: true,
    },
  ]

  // Export columns
  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (row: ReportRow) => formatDate(row.date), width: 12 },
    { header: 'Customer', accessor: 'customerName', width: 20 },
    { header: 'Service', accessor: 'service', width: 25 },
    { header: 'Beautician', accessor: 'beautician', width: 15 },
    { header: 'Amount', accessor: (row: ReportRow) => formatCurrency(row.amount), width: 12 },
    { header: 'Discount', accessor: (row: ReportRow) => formatCurrency(row.discount), width: 12 },
    { header: 'Payment Method', accessor: 'paymentMethod', width: 15 },
    { header: 'Status', accessor: 'status', width: 10 },
  ]

  // Export handlers
  const handleExport = (format: 'csv' | 'excel' | 'pdf') => {
    const filename = `sales-report-${new Date().toISOString().split('T')[0]}`
    const title = 'Sales Report - Ainaa Clinic'

    exportData(format, {
      filename,
      title,
      columns: exportColumns,
      data: tableData,
    })
  }

  // Clear filters
  const clearFilters = () => {
    setDateRange(getPresetRange('month'))
    setSelectedBeauticians([])
    setSelectedServices([])
    setPurchaseRange({ min: null, max: null })
  }

  const hasActiveFilters =
    selectedBeauticians.length > 0 ||
    selectedServices.length > 0 ||
    purchaseRange.min !== null ||
    purchaseRange.max !== null

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
          title="Reporting"
          description="Generate comprehensive reports with advanced filtering and export options"
        />

        {/* Summary Stats */}
        <BentoGrid cols={4} gap="md" className="mb-6">
          <StatCard
            title="Total Revenue"
            value={formatCurrency(stats.totalRevenue)}
            icon={STAT_CONFIGS.revenue.icon}
            iconColor={STAT_CONFIGS.revenue.iconColor}
            variant="gradient"
          />
          <StatCard
            title="Total Transactions"
            value={stats.totalTransactions.toLocaleString()}
            icon={STAT_CONFIGS.transactions.icon}
            iconColor={STAT_CONFIGS.transactions.iconColor}
            variant="gradient"
          />
          <StatCard
            title="Unique Customers"
            value={stats.totalCustomers.toLocaleString()}
            icon={STAT_CONFIGS.customers.icon}
            iconColor={STAT_CONFIGS.customers.iconColor}
            variant="gradient"
          />
          <StatCard
            title="Avg Transaction"
            value={formatCurrency(stats.avgTransaction)}
            icon={STAT_CONFIGS.payments.icon}
            iconColor={STAT_CONFIGS.payments.iconColor}
            variant="gradient"
          />
        </BentoGrid>

        {/* Filters Section */}
        <div className="bg-card border border-border rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold">Filters</h2>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  {[
                    selectedBeauticians.length,
                    selectedServices.length,
                    purchaseRange.min !== null || purchaseRange.max !== null ? 1 : 0,
                  ].reduce((a, b) => a + b, 0)}{' '}
                  active
                </Badge>
              )}
            </div>
            <div className="flex gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  <X className="h-4 w-4 mr-2" />
                  Clear Filters
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowFilters(!showFilters)}
              >
                {showFilters ? 'Hide' : 'Show'} Filters
              </Button>
            </div>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <DateRangeFilter value={dateRange} onChange={setDateRange} />
              <MultiSelectFilter
                label="Beauticians"
                options={beauticiansOptions}
                selected={selectedBeauticians}
                onChange={setSelectedBeauticians}
                placeholder="Select beauticians..."
              />
              <MultiSelectFilter
                label="Services"
                options={servicesOptions}
                selected={selectedServices}
                onChange={setSelectedServices}
                placeholder="Select services..."
              />
              <RangeFilter
                label="Purchase Range"
                value={purchaseRange}
                onChange={setPurchaseRange}
                prefix="RM"
                placeholder={{ min: 'Min Amount', max: 'Max Amount' }}
                step={0.01}
              />
            </div>
          )}
        </div>

        {/* Export Actions */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">
            {tableData.length} {tableData.length === 1 ? 'record' : 'records'} found
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
          data={tableData}
          pageSize={20}
          pageSizeOptions={[10, 20, 50, 100]}
          emptyMessage="No data matches your filters"
        />
      </PageContainer>
    </Layout>
  )
}

export default Reporting
