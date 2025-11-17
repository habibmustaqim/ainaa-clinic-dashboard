import React, { useState } from 'react'
import { TrendingUp, ShoppingBag } from 'lucide-react'
import { formatCurrency } from '@/utils/formatters'
import { RankedListCard, RankedItemData, SortToggle } from '@/components/ui/RankedListCard'
import { BentoCard } from '@/components/ui/bento-card'
import { Trophy } from 'lucide-react'

export interface SalespersonData {
  name: string
  revenue: number
  transactionCount: number
  avgTransaction: number
  rank: number
}

interface SalespersonLeaderboardProps {
  data: SalespersonData[]
  loading?: boolean
  itemsPerPage?: number
  showPagination?: boolean
}

export const SalespersonLeaderboard: React.FC<SalespersonLeaderboardProps> = ({
  data,
  loading = false,
  itemsPerPage = 5,
  showPagination = true
}) => {
  const [sortBy, setSortBy] = useState<'quantity' | 'amount'>('amount')

  const handleSortToggle = () => {
    setSortBy(prev => prev === 'amount' ? 'quantity' : 'amount')
  }

  // Transform and sort SalespersonData
  const sortedData = [...data].sort((a, b) => {
    if (sortBy === 'quantity') {
      return b.transactionCount - a.transactionCount
    } else {
      return b.revenue - a.revenue
    }
  })

  const rankedItems: RankedItemData[] = sortedData.map((person, index) => ({
    rank: index + 1,
    title: person.name,
    primaryValue: formatCurrency(person.revenue),
    sortableQuantity: person.transactionCount,
    sortableAmount: person.revenue,
    metrics: [
      {
        icon: ShoppingBag,
        label: `${person.transactionCount} sales`
      },
      {
        icon: TrendingUp,
        label: `Avg: ${formatCurrency(person.avgTransaction)}`
      }
    ]
  }))

  return (
    <BentoCard
      title="Beautician Leaderboard"
      icon={Trophy}
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
        emptyMessage="No sales data available"
        itemsPerPage={itemsPerPage}
        showPagination={showPagination}
        enableSort={false}
      />
    </BentoCard>
  )
}

export default SalespersonLeaderboard
