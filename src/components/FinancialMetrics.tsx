import React from 'react'
import { DollarSign, ShoppingCart, TrendingUp, Activity } from 'lucide-react'
import CountUp from 'react-countup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface FinancialMetricsProps {
  totalSpent: number
  totalTransactions: number
  averageTransaction: number
  outstandingBalance: number
  loading?: boolean
}

const FinancialMetrics: React.FC<FinancialMetricsProps> = ({
  totalSpent,
  totalTransactions,
  averageTransaction,
  outstandingBalance,
  loading = false
}) => {
  const metrics = [
    {
      title: 'Total Spent',
      value: totalSpent,
      icon: DollarSign,
      description: 'Lifetime value',
      gradient: 'from-purple-500 to-purple-600',
      isCurrency: true
    },
    {
      title: 'Total Transactions',
      value: totalTransactions,
      icon: ShoppingCart,
      description: 'Total visits',
      gradient: 'from-pink-500 to-pink-600',
      isCurrency: false
    },
    {
      title: 'Average Transaction',
      value: averageTransaction,
      icon: TrendingUp,
      description: 'Per visit',
      gradient: 'from-blue-500 to-blue-600',
      isCurrency: true
    },
    {
      title: 'Outstanding Balance',
      value: outstandingBalance,
      icon: Activity,
      description: 'Amount due',
      gradient: outstandingBalance > 0 ? 'from-red-500 to-red-600' : 'from-green-500 to-green-600',
      isCurrency: true
    }
  ]

  const formatCurrency = (amount: number) => {
    return `RM ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded"></div>
              <div className="h-4 w-4 bg-gray-200 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded mb-1"></div>
              <div className="h-3 w-20 bg-gray-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {metrics.map((metric, index) => {
        const Icon = metric.icon
        return (
          <Card key={index} className="relative overflow-hidden hover:shadow-lg transition-shadow">
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full -mr-16 -mt-16"></div>

            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">
                {metric.title}
              </CardTitle>
              <div className="h-10 w-10 rounded-full bg-primary dark:bg-primary flex items-center justify-center">
                <Icon className="h-5 w-5 text-white" />
              </div>
            </CardHeader>

            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {metric.isCurrency ? (
                  <>
                    RM{' '}
                    <CountUp
                      end={metric.value}
                      duration={1.5}
                      decimals={2}
                      separator=","
                      decimal="."
                    />
                  </>
                ) : (
                  <CountUp
                    end={metric.value}
                    duration={1.5}
                    separator=","
                  />
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {metric.description}
              </p>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}

export default FinancialMetrics
