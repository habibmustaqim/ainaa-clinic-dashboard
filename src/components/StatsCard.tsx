import React from 'react'
import { LucideIcon } from 'lucide-react'
import CountUp from 'react-countup'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

interface StatsCardProps {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  gradient?: string
  isCurrency?: boolean
  isPercentage?: boolean
  loading?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
}

const StatsCard: React.FC<StatsCardProps> = ({
  title,
  value,
  description,
  icon: Icon,
  gradient = 'from-purple-500 to-purple-600',
  isCurrency = false,
  isPercentage = false,
  loading = false,
  trend
}) => {
  const renderValue = () => {
    if (loading) {
      return <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
    }

    if (typeof value === 'string') {
      return <div className="text-2xl font-bold text-gray-900">{value}</div>
    }

    return (
      <div className="text-2xl font-bold text-gray-900">
        {isCurrency && 'RM '}
        <CountUp
          end={value}
          duration={1.5}
          decimals={isCurrency ? 2 : 0}
          separator=","
          decimal="."
        />
        {isPercentage && '%'}
      </div>
    )
  }

  return (
    <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 hover:scale-105">
      {/* Background decoration */}
      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 dark:bg-primary/10 rounded-full -mr-16 -mt-16"></div>

      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-600">
          {title}
        </CardTitle>
        <div className="h-10 w-10 rounded-full bg-primary dark:bg-primary flex items-center justify-center shadow-md">
          <Icon className="h-5 w-5 text-white" />
        </div>
      </CardHeader>

      <CardContent>
        {renderValue()}

        {description && (
          <p className="text-xs text-gray-500 mt-1">
            {description}
          </p>
        )}

        {trend && (
          <div className={`flex items-center gap-1 mt-2 text-xs ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
            <span>{trend.isPositive ? '↑' : '↓'}</span>
            <span>{Math.abs(trend.value)}%</span>
            <span className="text-gray-500">vs last month</span>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default StatsCard
