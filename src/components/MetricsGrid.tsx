import React from 'react'
import { LucideIcon } from 'lucide-react'
import StatsCard from './StatsCard'

export interface MetricItem {
  title: string
  value: number | string
  description?: string
  icon: LucideIcon
  gradient?: string
  isCurrency?: boolean
  isPercentage?: boolean
  trend?: {
    value: number
    isPositive: boolean
  }
}

interface MetricsGridProps {
  metrics: MetricItem[]
  loading?: boolean
  columns?: 2 | 3 | 4
}

const MetricsGrid: React.FC<MetricsGridProps> = ({
  metrics,
  loading = false,
  columns = 4
}) => {
  const getGridClass = () => {
    switch (columns) {
      case 2:
        return 'grid-cols-1 md:grid-cols-2'
      case 3:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'
      case 4:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
      default:
        return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
    }
  }

  if (loading) {
    return (
      <div className={`grid ${getGridClass()} gap-6`}>
        {Array.from({ length: columns }).map((_, index) => (
          <StatsCard
            key={index}
            title="Loading..."
            value={0}
            icon={() => null}
            loading={true}
          />
        ))}
      </div>
    )
  }

  return (
    <div className={`grid ${getGridClass()} gap-6`}>
      {metrics.map((metric, index) => (
        <StatsCard
          key={index}
          title={metric.title}
          value={metric.value}
          description={metric.description}
          icon={metric.icon}
          gradient={metric.gradient}
          isCurrency={metric.isCurrency}
          isPercentage={metric.isPercentage}
          trend={metric.trend}
        />
      ))}
    </div>
  )
}

export default MetricsGrid
