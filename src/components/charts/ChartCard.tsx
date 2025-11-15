import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, TrendingUp } from 'lucide-react'

interface ChartCardProps {
  title: string
  description?: string
  children: React.ReactNode
  loading?: boolean
  error?: string | null
  trend?: {
    value: number
    isPositive: boolean
    label?: string
  }
  actions?: React.ReactNode
  className?: string
}

const ChartCard: React.FC<ChartCardProps> = ({
  title,
  description,
  children,
  loading = false,
  error = null,
  trend,
  actions,
  className = ''
}) => {
  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              {title}
              {trend && (
                <span className={`text-sm font-normal ${trend.isPositive ? 'text-green-600' : 'text-red-600'}`}>
                  <TrendingUp className={`inline h-4 w-4 ${!trend.isPositive ? 'rotate-180' : ''}`} />
                  {Math.abs(trend.value)}%
                  {trend.label && <span className="text-gray-500 ml-1">{trend.label}</span>}
                </span>
              )}
            </CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {actions && <div className="ml-4">{actions}</div>}
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="h-8 w-8 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Loading chart data...</p>
            </div>
          </div>
        ) : error ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center text-red-600">
              <p className="font-semibold">Error loading chart</p>
              <p className="text-sm text-gray-600 mt-1">{error}</p>
            </div>
          </div>
        ) : (
          <div className="w-full">
            {children}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ChartCard
