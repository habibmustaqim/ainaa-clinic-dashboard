import React from 'react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface InfoCardProps {
  /**
   * Icon component from lucide-react
   */
  icon: LucideIcon
  /**
   * Label/title for the information
   */
  label: string
  /**
   * Value to display
   */
  value: string | number | React.ReactNode
  /**
   * Icon background color class (e.g., 'bg-primary/10')
   */
  iconColor?: string
  /**
   * Display variant
   * - default: Icon with circle background + label + value
   * - compact: Label + value only (no icon circle)
   * - inline: Icon + value in a single line
   */
  variant?: 'default' | 'compact' | 'inline'
  /**
   * Additional className for customization
   */
  className?: string
}

/**
 * InfoCard - Display icon + label + value information
 *
 * Versatile component for displaying labeled information with optional icons.
 * Uses theme colors and supports multiple display variants.
 *
 * Common uses:
 * - Contact information (phone, email, address)
 * - Statistics and metrics
 * - User profile details
 * - Metadata display
 *
 * @example
 * ```tsx
 * // Default variant
 * <InfoCard
 *   icon={Phone}
 *   label="Phone"
 *   value={customer.phone}
 * />
 *
 * // Compact variant
 * <InfoCard
 *   icon={DollarSign}
 *   label="Total Revenue"
 *   value="RM 12,345.67"
 *   variant="compact"
 * />
 *
 * // Inline variant
 * <InfoCard
 *   icon={Mail}
 *   label="Email"
 *   value="user@example.com"
 *   variant="inline"
 * />
 * ```
 */
export const InfoCard: React.FC<InfoCardProps> = ({
  icon: Icon,
  label,
  value,
  iconColor = 'bg-primary/10 dark:bg-primary/20',
  variant = 'default',
  className
}) => {
  // Inline variant - icon + value in single line
  if (variant === 'inline') {
    return (
      <div className={cn('flex items-center gap-2 text-sm', className)}>
        <Icon className="h-4 w-4 text-muted-foreground/70 flex-shrink-0" />
        <span className="text-foreground/80">{value}</span>
      </div>
    )
  }

  // Compact variant - no icon circle, just text
  if (variant === 'compact') {
    return (
      <div className={cn('p-3 rounded-lg bg-muted/50 dark:bg-muted', className)}>
        <p className="text-xs text-muted-foreground mb-1">{label}</p>
        <p className="text-sm font-medium text-foreground">{value}</p>
      </div>
    )
  }

  // Default variant - full card with icon circle
  return (
    <div className={cn('flex items-center gap-3 p-3 bg-muted/50 dark:bg-muted rounded-lg', className)}>
      <div className={cn('h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0', iconColor)}>
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-sm font-medium text-foreground truncate">{value}</div>
      </div>
    </div>
  )
}
