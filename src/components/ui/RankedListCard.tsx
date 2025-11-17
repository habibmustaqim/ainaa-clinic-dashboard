import React, { useState } from 'react'
import { LucideIcon, Trophy, ChevronLeft, ChevronRight, DollarSign, Hash } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RankedItemData {
  rank: number
  title: string
  primaryValue: string | number
  sortableQuantity?: number
  sortableAmount?: number
  metrics?: Array<{
    icon?: LucideIcon
    label: string
    value?: string | number
  }>
}

export interface RankedListCardProps {
  items: RankedItemData[]
  density?: 'compact' | 'default'
  rankStyle?: 'colored' | 'uniform'
  showLeftBorder?: boolean
  loading?: boolean
  emptyMessage?: string
  icon?: LucideIcon
  itemsPerPage?: number
  showPagination?: boolean
  enableSort?: boolean
  defaultSortBy?: 'quantity' | 'amount'
  onRenderSortToggle?: (sortBy: 'quantity' | 'amount', handleToggle: () => void) => React.ReactNode
}

/**
 * RankedListCard - Unified component for displaying ranked lists
 *
 * Features:
 * - Configurable density (compact for tight spaces, default for more breathing room)
 * - Rank styling (colored badges for top 3, or uniform styling)
 * - Optional left border visual indicator for top ranks
 * - Flexible metrics display with optional icons
 */
export const RankedListCard: React.FC<RankedListCardProps> = ({
  items,
  density = 'compact',
  rankStyle = 'colored',
  showLeftBorder = true,
  loading = false,
  emptyMessage = 'No data available',
  icon: ItemIcon,
  itemsPerPage = 5,
  showPagination = true,
  enableSort = false,
  defaultSortBy = 'amount',
  onRenderSortToggle
}) => {
  const [currentPage, setCurrentPage] = useState(1)
  const [sortBy, setSortBy] = useState<'quantity' | 'amount'>(defaultSortBy)
  const getRankColors = (rank: number) => {
    if (rankStyle === 'uniform') {
      return {
        badge: 'bg-primary/10 text-primary border-primary/20',
        border: 'bg-primary/50',
        icon: null
      }
    }

    switch (rank) {
      case 1:
        return {
          badge: 'bg-yellow-500/15 dark:bg-yellow-500/20 text-yellow-700 dark:text-yellow-400 border-yellow-500/30',
          border: 'bg-yellow-500',
          icon: null
        }
      case 2:
        return {
          badge: 'bg-gray-400/15 dark:bg-gray-400/20 text-gray-700 dark:text-gray-300 border-gray-400/30',
          border: 'bg-gray-400',
          icon: null
        }
      case 3:
        return {
          badge: 'bg-orange-600/15 dark:bg-orange-600/20 text-orange-700 dark:text-orange-400 border-orange-600/30',
          border: 'bg-orange-600',
          icon: null
        }
      default:
        return {
          badge: 'bg-primary/10 text-primary border-primary/20',
          border: 'bg-primary/50',
          icon: null
        }
    }
  }

  const densityClasses = {
    compact: {
      container: 'p-2.5',
      spacing: 'space-y-1.5',
      badge: 'w-7 h-7 text-xs',
      gap: 'gap-3',
      titleMargin: 'mb-0.5',
      metricsText: 'text-[10px]',
      metricsGap: 'gap-3'
    },
    default: {
      container: 'p-3',
      spacing: 'space-y-2',
      badge: 'w-8 h-8 text-xs',
      gap: 'gap-3',
      titleMargin: 'mb-1',
      metricsText: 'text-xs',
      metricsGap: 'gap-4'
    }
  }

  const classes = densityClasses[density]

  // Sorting logic
  const sortedItems = React.useMemo(() => {
    if (!enableSort) return items

    const sorted = [...items]

    if (sortBy === 'quantity') {
      return sorted.sort((a, b) => (b.sortableQuantity ?? 0) - (a.sortableQuantity ?? 0))
    } else {
      // amount (default)
      return sorted.sort((a, b) => (b.sortableAmount ?? 0) - (a.sortableAmount ?? 0))
    }
  }, [items, sortBy, enableSort])

  // Pagination logic
  const totalPages = Math.ceil(sortedItems.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const visibleItems = sortedItems.slice(startIndex, endIndex)
  const shouldShowPagination = showPagination && sortedItems.length > itemsPerPage

  const handlePreviousPage = () => {
    setCurrentPage(prev => Math.max(1, prev - 1))
  }

  const handleNextPage = () => {
    setCurrentPage(prev => Math.min(totalPages, prev + 1))
  }

  const handleSortToggle = () => {
    setSortBy(prev => prev === 'amount' ? 'quantity' : 'amount')
    setCurrentPage(1) // Reset to first page when sort changes
  }

  // Default sort toggle component (resized to match title/icon)
  const renderDefaultSortToggle = () => {
    if (!enableSort) return null

    return (
      <div className="relative flex items-center bg-muted rounded-full p-0.5 w-[42px] h-5">
        {/* Sliding indicator */}
        <div
          className={cn(
            'absolute top-0.5 h-4 w-5 rounded-full bg-primary transition-all duration-300 ease-in-out',
            sortBy === 'amount' ? 'left-0.5' : 'left-[21px]'
          )}
        />

        {/* Amount Icon */}
        <button
          onClick={handleSortToggle}
          className={cn(
            'relative z-10 w-5 h-4 flex items-center justify-center transition-colors rounded-full',
            sortBy === 'amount' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          title="Sort by Amount (RM)"
        >
          <DollarSign className="w-3 h-3" />
        </button>

        {/* Quantity Icon */}
        <button
          onClick={handleSortToggle}
          className={cn(
            'relative z-10 w-5 h-4 flex items-center justify-center transition-colors rounded-full',
            sortBy === 'quantity' ? 'text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
          )}
          title="Sort by Quantity"
        >
          <Hash className="w-3 h-3" />
        </button>
      </div>
    )
  }

  if (loading) {
    return (
      <div className={cn('space-y-2', classes.spacing)}>
        {[...Array(5)].map((_, i) => (
          <div key={i} className={cn('flex items-center rounded-lg border border-border bg-card animate-pulse', classes.container, classes.gap)}>
            <div className={cn('rounded-full bg-muted', classes.badge)} />
            <div className="flex-1 space-y-2">
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (items.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {emptyMessage}
      </div>
    )
  }

  return (
    <>
      <div className={classes.spacing}>
        {visibleItems.map((item) => {
        const colors = getRankColors(item.rank)
        const RankIcon = colors.icon
        const isTopThree = item.rank <= 3

        return (
          <div
            key={item.rank}
            className={cn(
              'group relative flex items-center rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-200',
              classes.container,
              classes.gap
            )}
          >
            {/* Colored Left Border for Top 3 */}
            {showLeftBorder && isTopThree && rankStyle === 'colored' && (
              <div className={cn('absolute left-0 top-0 bottom-0 w-1 rounded-l-lg', colors.border)} />
            )}

            {/* Rank Badge */}
            <div
              className={cn(
                'flex items-center justify-center rounded-full border-2 font-bold shrink-0 transition-transform',
                classes.badge,
                colors.badge,
                isTopThree && rankStyle === 'colored' && 'group-hover:scale-110'
              )}
            >
              {RankIcon ? (
                <RankIcon className="w-3.5 h-3.5" />
              ) : (
                <span>{item.rank}</span>
              )}
            </div>

            {/* Item Content */}
            <div className="flex-1 min-w-0">
              {/* Title and Primary Value Row */}
              <div className={cn('flex items-baseline justify-between', classes.titleMargin)}>
                <div className="flex items-center gap-1.5 flex-1 min-w-0">
                  {ItemIcon && <ItemIcon className="w-3.5 h-3.5 text-muted-foreground shrink-0" />}
                  <span className="text-sm font-semibold text-foreground truncate">
                    {item.title}
                  </span>
                </div>
                <span className="text-sm font-bold text-success ml-2 shrink-0">
                  {item.primaryValue}
                </span>
              </div>

              {/* Metrics Row */}
              {item.metrics && item.metrics.length > 0 && (
                <div className={cn('flex items-center text-muted-foreground', classes.metricsText, classes.metricsGap)}>
                  {item.metrics.map((metric, idx) => (
                    <div key={idx} className="flex items-center gap-1">
                      {metric.icon && <metric.icon className="w-3 h-3" />}
                      <span>
                        {metric.label}
                        {metric.value && `: ${metric.value}`}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )
      })}
    </div>

    {/* Pagination Controls */}
    {shouldShowPagination && (
      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t border-border">
        <button
          onClick={handlePreviousPage}
          disabled={currentPage === 1}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            currentPage === 1
              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              : 'bg-card border border-border text-foreground hover:bg-accent hover:border-primary/50'
          )}
        >
          <ChevronLeft className="w-4 h-4" />
          Previous
        </button>

        <span className="text-sm text-muted-foreground px-3">
          Page {currentPage} of {totalPages}
        </span>

        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className={cn(
            'flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors',
            currentPage === totalPages
              ? 'bg-muted text-muted-foreground cursor-not-allowed opacity-50'
              : 'bg-card border border-border text-foreground hover:bg-accent hover:border-primary/50'
          )}
        >
          Next
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    )}
    </>
  )
}

// Standalone SortToggle component that can be used as headerAction
export interface SortToggleProps {
  sortBy: 'quantity' | 'amount'
  onToggle: () => void
}

export const SortToggle: React.FC<SortToggleProps> = ({ sortBy, onToggle }) => {
  const [isHovered, setIsHovered] = useState(false)

  return (
    <div
      className="relative flex items-center w-[52px] h-5 group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Neumorphic Container with Inset Shadow */}
      <div className={cn(
        'absolute inset-0 rounded-full bg-muted transition-all duration-200 ease-out',
        // Inset shadow for "pressed in" effect
        'shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.15),inset_0_1px_2px_0_rgba(0,0,0,0.1)]',
        'dark:shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.3),inset_0_1px_2px_0_rgba(0,0,0,0.2)]',
        // Hover state: subtle border glow
        isHovered && [
          'ring-1 ring-primary/20 dark:ring-primary/30',
          'shadow-[inset_0_1px_3px_0_rgba(0,0,0,0.12),inset_0_1px_2px_0_rgba(0,0,0,0.08)]'
        ]
      )} />

      {/* Elevated Sliding Indicator with Multi-Layer Shadows */}
      <div
        className={cn(
          'absolute top-0.5 h-4 w-6 rounded-full bg-primary transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)]',
          // Multi-layer shadow: soft outer + medium depth + colored glow
          'shadow-[0_1px_2px_0_rgba(0,0,0,0.15),0_2px_4px_-1px_rgba(0,0,0,0.1),0_0_8px_-2px_hsl(var(--primary))]',
          'dark:shadow-[0_1px_3px_0_rgba(0,0,0,0.3),0_2px_4px_-1px_rgba(0,0,0,0.2),0_0_10px_-2px_hsl(var(--primary))]',
          // Hover state: increased elevation
          isHovered && [
            'shadow-[0_2px_4px_0_rgba(0,0,0,0.18),0_3px_6px_-1px_rgba(0,0,0,0.12),0_0_12px_-2px_hsl(var(--primary))]',
            'dark:shadow-[0_2px_4px_0_rgba(0,0,0,0.35),0_3px_6px_-1px_rgba(0,0,0,0.25),0_0_14px_-2px_hsl(var(--primary))]'
          ],
          // Position based on sort state
          sortBy === 'amount' ? 'left-0.5' : 'left-[25px]'
        )}
      />

      {/* Amount Icon Button */}
      <button
        onClick={onToggle}
        className={cn(
          'relative z-10 w-6 h-5 flex items-center justify-center rounded-full',
          'transition-all duration-150 ease-out',
          // Active state: white on primary with scale
          sortBy === 'amount' && [
            'text-primary-foreground',
            'scale-105'
          ],
          // Inactive state: muted with hover
          sortBy !== 'amount' && [
            'text-muted-foreground hover:text-foreground',
            'hover:scale-95'
          ]
        )}
        title="Sort by Amount (RM)"
        aria-label="Sort by Amount"
        aria-pressed={sortBy === 'amount'}
      >
        <DollarSign className={cn(
          'w-3.5 h-3.5 transition-transform duration-150',
          sortBy === 'amount' && 'drop-shadow-sm'
        )} />
      </button>

      {/* Quantity Icon Button */}
      <button
        onClick={onToggle}
        className={cn(
          'relative z-10 w-6 h-5 flex items-center justify-center rounded-full',
          'transition-all duration-150 ease-out',
          // Active state: white on primary with scale
          sortBy === 'quantity' && [
            'text-primary-foreground',
            'scale-105'
          ],
          // Inactive state: muted with hover
          sortBy !== 'quantity' && [
            'text-muted-foreground hover:text-foreground',
            'hover:scale-95'
          ]
        )}
        title="Sort by Quantity"
        aria-label="Sort by Quantity"
        aria-pressed={sortBy === 'quantity'}
      >
        <Hash className={cn(
          'w-3.5 h-3.5 transition-transform duration-150',
          sortBy === 'quantity' && 'drop-shadow-sm'
        )} />
      </button>
    </div>
  )
}

export default RankedListCard
