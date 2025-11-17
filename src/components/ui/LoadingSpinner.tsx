import React from 'react'
import { cn } from '@/lib/utils'

export interface LoadingSpinnerProps {
  /**
   * Loading message to display below the spinner
   */
  message?: string
  /**
   * Display as fullscreen centered loader
   */
  fullscreen?: boolean
  /**
   * Size of the spinner
   * - sm: 6x6 (24px)
   * - md: 12x12 (48px)
   * - lg: 16x16 (64px)
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Additional className for customization
   */
  className?: string
}

/**
 * LoadingSpinner - Consistent loading state indicator
 *
 * Features:
 * - Animated spinner using theme primary color
 * - Fullscreen or inline variants
 * - Multiple size options
 * - Optional loading message
 * - Dark mode support
 *
 * @example
 * ```tsx
 * // Fullscreen loading
 * <LoadingSpinner
 *   fullscreen
 *   message="Loading customer data..."
 * />
 *
 * // Inline loading
 * <LoadingSpinner
 *   size="sm"
 *   message="Loading..."
 * />
 * ```
 */
export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  message = 'Loading...',
  fullscreen = false,
  size = 'md',
  className
}) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  }

  const containerClass = fullscreen
    ? 'min-h-screen flex items-center justify-center bg-background'
    : 'text-center py-16'

  return (
    <div className={cn(containerClass, className)}>
      <div className="text-center">
        <div
          className={cn(
            'animate-spin rounded-full border-b-2 border-primary mx-auto mb-4',
            sizeClasses[size]
          )}
        />
        {message && <p className="text-muted-foreground">{message}</p>}
      </div>
    </div>
  )
}
