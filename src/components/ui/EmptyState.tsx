import React from 'react'
import { LucideIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

export interface EmptyStateAction {
  label: string
  onClick: () => void
}

export interface EmptyStateProps {
  /**
   * Icon to display
   */
  icon: LucideIcon
  /**
   * Title/heading for empty state
   */
  title: string
  /**
   * Optional description text
   */
  description?: string
  /**
   * Optional action button
   */
  action?: EmptyStateAction
  /**
   * Size variant
   * - sm: Compact empty state
   * - md: Standard empty state
   * - lg: Large prominent empty state
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Optional badges/hints to display
   */
  badges?: string[]
  /**
   * Additional className for customization
   */
  className?: string
}

/**
 * EmptyState - Consistent empty state display
 *
 * Features:
 * - Icon with optional background circle
 * - Title and description
 * - Optional action button
 * - Optional hint badges
 * - Multiple size variants
 * - Uses theme colors throughout
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={Search}
 *   title="No results found"
 *   description="Try adjusting your search query"
 *   size="md"
 * />
 *
 * <EmptyState
 *   icon={Users}
 *   title="Search for Customers"
 *   description="Start typing to search through customers"
 *   size="lg"
 *   badges={['Search by name', 'Search by ID', 'Search by email']}
 * />
 * ```
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  action,
  size = 'md',
  badges,
  className
}) => {
  const sizes = {
    sm: {
      container: 'py-8',
      iconContainer: 'w-12 h-12 mb-3',
      icon: 'h-6 w-6',
      title: 'text-base',
      description: 'text-sm'
    },
    md: {
      container: 'py-12',
      iconContainer: 'w-16 h-16 mb-4',
      icon: 'h-8 w-8',
      title: 'text-lg',
      description: 'text-sm'
    },
    lg: {
      container: 'py-16',
      iconContainer: 'w-20 h-20 mb-4',
      icon: 'h-10 w-10',
      title: 'text-2xl',
      description: 'text-base'
    }
  }

  const config = sizes[size]

  return (
    <div className={cn('text-center animate-fade-in', config.container, className)}>
      {/* Icon */}
      <div className="mb-6">
        {size === 'lg' ? (
          <div
            className={cn(
              'inline-flex items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20',
              config.iconContainer
            )}
          >
            <Icon className={cn(config.icon, 'text-primary')} />
          </div>
        ) : (
          <Icon className={cn(config.icon, 'text-muted-foreground/50 mx-auto mb-4')} />
        )}
      </div>

      {/* Title */}
      <h3 className={cn('font-bold text-foreground mb-2', config.title)}>
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className={cn('text-muted-foreground max-w-md mx-auto mb-6', config.description)}>
          {description}
        </p>
      )}

      {/* Badges/Hints */}
      {badges && badges.length > 0 && (
        <div className="flex flex-wrap gap-2 justify-center text-sm mb-6">
          {badges.map((badge, i) => (
            <Badge key={i} variant="outline" className="bg-card">
              {badge}
            </Badge>
          ))}
        </div>
      )}

      {/* Action Button */}
      {action && (
        <Button onClick={action.onClick} className="mt-2">
          {action.label}
        </Button>
      )}
    </div>
  )
}
