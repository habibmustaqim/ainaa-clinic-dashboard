import React from 'react'
import { cn } from '@/lib/utils'

export interface PageContainerProps {
  children: React.ReactNode
  /**
   * Maximum width of the container
   * - default: max-w-7xl (1280px)
   * - narrow: max-w-4xl (896px)
   * - wide: max-w-6xl (1152px)
   * - full: max-w-full (100%)
   */
  maxWidth?: 'default' | 'narrow' | 'wide' | 'full'
  /**
   * Additional className for custom styling
   */
  className?: string
}

/**
 * PageContainer - Responsive container with consistent max-width and padding
 *
 * Uses theme spacing and layout tokens from the global theme system.
 * Automatically responsive with proper padding on mobile and desktop.
 *
 * @example
 * ```tsx
 * <PageContainer maxWidth="wide">
 *   <YourPageContent />
 * </PageContainer>
 * ```
 */
export const PageContainer: React.FC<PageContainerProps> = ({
  children,
  maxWidth = 'default',
  className
}) => {
  const maxWidthClasses = {
    default: 'max-w-7xl',
    narrow: 'max-w-4xl',
    wide: 'max-w-6xl',
    full: 'max-w-full'
  }

  return (
    <div className={cn('container mx-auto', maxWidthClasses[maxWidth], className)}>
      {children}
    </div>
  )
}
