import React, { useState, useEffect, useMemo } from 'react'
import { ColumnDef, FilterFn } from '@tanstack/react-table'
import { FileDown, X } from 'lucide-react'
import { Layout } from '@/components/Layout'
import { PageContainer, PageHeader } from '@/components/layout/index'
import { BentoGrid, StatCard } from '@/components/ui/bento-card'
import { DataTable } from '@/components/ui/DataTable'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { STAT_CONFIGS } from '@/config/statsConfig'
import { formatCurrency, formatDate } from '@/utils/formatters'
import { exportData, ExportColumn } from '@/utils/exportUtils'
import { supabase } from '@/lib/supabase'

// Column Filter Components
import { TextColumnFilter } from '@/components/ui/filters/TextColumnFilter'
import { DateRangeColumnFilter } from '@/components/ui/filters/DateRangeColumnFilter'
import { MultiSelectColumnFilter } from '@/components/ui/filters/MultiSelectColumnFilter'
import { NumberRangeColumnFilter } from '@/components/ui/filters/NumberRangeColumnFilter'

interface ReportRow {
  id: string
  date: string
  customerName: string
  customerPhone: string
  customerBirthday: string | null
  service: string
  beautician: string
  amount: number
  paymentMethod: string
  status: string
  discount: number
}

interface MultiSelectOption {
  value: string
  label: string
}

const Reporting: React.FC = () => {
  // State - Data
  const [loading, setLoading] = useState(true)
  const [rawData, setRawData] = useState<ReportRow[]>([])
  const [beauticiansOptions, setBeauticiansOptions] = useState<MultiSelectOption[]>([])
  const [servicesOptions, setServicesOptions] = useState<MultiSelectOption[]>([])
  const [tableInstance, setTableInstance] = useState<any>(null)

  // Fetch data
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        let allServiceSales: any[] = []
        let pageSize = 1000
        let start = 0
        let hasMore = true

        // Fetch all service sales using pagination (Supabase has 1000 row limit per query)
        while (hasMore) {
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
                name,
                contact_number,
                date_of_birth
              )
            `)
            .order('sale_date', { ascending: false })
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

        // Process data
        const processed: ReportRow[] = allServiceSales.map((sale: any) => ({
          id: sale.id,
          date: sale.sale_date,
          customerName: sale.customers?.name || 'Unknown',
          customerPhone: sale.customers?.contact_number || '-',
          customerBirthday: sale.customers?.date_of_birth || null,
          service: sale.service_name || sale.service_type || '-',
          beautician: sale.sales_person || '-',
          amount: sale.nett_amount || 0,
          paymentMethod: sale.payment_mode || '-',
          status: sale.is_cancelled ? 'Cancelled' : 'Completed',
          discount: sale.discount_amount || 0,
        }))

        setRawData(processed)

        // Extract unique beauticians
        const uniqueBeauticians = Array.from(
          new Set(processed.map(s => s.beautician).filter(b => b !== '-'))
        ).sort() as string[]
        setBeauticiansOptions(
          uniqueBeauticians.map(b => ({ value: b, label: b }))
        )

        // Extract unique services
        const uniqueServices = Array.from(
          new Set(processed.map(s => s.service).filter(s => s !== '-'))
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
      accessorKey: 'date',
      header: 'Date',
      cell: ({ row }) => formatDate(row.getValue('date')),
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
        return birthday ? formatDate(birthday) : '-'
      },
      enableSorting: true,
      enableColumnFilter: true,
      filterFn: 'dateBetween',
      meta: {
        filterComponent: DateRangeColumnFilter
      }
    },
    {
      accessorKey: 'service',
      header: 'Service',
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
      cell: ({ row }) => formatCurrency(row.getValue('amount')),
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
      cell: ({ row }) => formatCurrency(row.getValue('discount')),
      enableSorting: true,
    },
    {
      accessorKey: 'paymentMethod',
      header: 'Payment',
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
  ], [beauticiansOptions, servicesOptions])

  // Calculate stats from filtered data
  const stats = useMemo(() => {
    if (!tableInstance) {
      return {
        totalRevenue: 0,
        totalTransactions: 0,
        totalCustomers: 0,
        avgTransaction: 0,
      }
    }

    const filtered = tableInstance.getFilteredRowModel().rows.map((row: any) => row.original)
    const totalRevenue = filtered.reduce((sum: number, row: ReportRow) => sum + row.amount, 0)
    const totalTransactions = filtered.length
    const uniqueCustomers = new Set(filtered.map((row: ReportRow) => row.customerName)).size
    const avgTransaction = totalTransactions > 0 ? totalRevenue / totalTransactions : 0

    return {
      totalRevenue,
      totalTransactions,
      totalCustomers: uniqueCustomers,
      avgTransaction,
    }
  }, [tableInstance])

  // Export columns
  const exportColumns: ExportColumn[] = [
    { header: 'Date', accessor: (row: ReportRow) => formatDate(row.date), width: 12 },
    { header: 'Customer', accessor: 'customerName', width: 20 },
    { header: 'Phone', accessor: 'customerPhone', width: 15 },
    { header: 'Birthday', accessor: (row: ReportRow) => row.customerBirthday ? formatDate(row.customerBirthday) : '-', width: 12 },
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
              <DateRangeColumnFilter
                column={tableInstance.getColumn('date')!}
                placeholder="Visit Date"
              />
              <DateRangeColumnFilter
                column={tableInstance.getColumn('customerBirthday')!}
                placeholder="Customer Birthday"
              />
              <TextColumnFilter
                column={tableInstance.getColumn('customerName')!}
                placeholder="Customer Name"
              />
              <TextColumnFilter
                column={tableInstance.getColumn('customerPhone')!}
                placeholder="Phone Number"
              />
              <MultiSelectColumnFilter
                column={tableInstance.getColumn('service')!}
                options={servicesOptions}
                placeholder="Service"
              />
              <MultiSelectColumnFilter
                column={tableInstance.getColumn('beautician')!}
                options={beauticiansOptions}
                placeholder="Beautician"
              />
              <NumberRangeColumnFilter
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
        />
      </PageContainer>
    </Layout>
  )
}

export default Reporting
