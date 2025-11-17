import React from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

export interface SearchInputProps {
  /**
   * Current search value
   */
  value: string
  /**
   * Callback when value changes
   */
  onChange: (value: string) => void
  /**
   * Callback when input is focused
   */
  onFocus?: () => void
  /**
   * Callback when input loses focus
   */
  onBlur?: () => void
  /**
   * Placeholder text
   */
  placeholder?: string
  /**
   * Size variant
   * - sm: Compact size for sidebars/toolbars
   * - md: Standard size for most uses
   * - lg: Large size for prominent search features
   */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Auto-focus the input on mount
   */
  autoFocus?: boolean
  /**
   * Disabled state
   */
  disabled?: boolean
  /**
   * Additional className for customization
   */
  className?: string
}

/**
 * SearchInput - Consistent search input with icon
 *
 * Features:
 * - Icon positioned on the left
 * - Multiple size variants
 * - Uses theme colors (muted-foreground, border, input background)
 * - Fully accessible
 * - Dark mode support
 *
 * @example
 * ```tsx
 * <SearchInput
 *   value={query}
 *   onChange={setQuery}
 *   placeholder="Search customers..."
 *   size="lg"
 *   autoFocus
 * />
 * ```
 */
export const SearchInput: React.FC<SearchInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder = 'Search...',
  size = 'md',
  autoFocus = false,
  disabled = false,
  className
}) => {
  const sizeClasses = {
    sm: 'pl-9 pr-4 py-2 text-sm',
    md: 'pl-10 pr-4 py-2.5',
    lg: 'pl-12 pr-4 py-6 text-lg'
  }

  const iconSizes = {
    sm: 'h-4 w-4 left-3',
    md: 'h-4 w-4 left-3',
    lg: 'h-5 w-5 left-4'
  }

  return (
    <div className="relative">
      <Search
        className={cn(
          'absolute top-1/2 transform -translate-y-1/2 text-muted-foreground/70',
          iconSizes[size]
        )}
      />
      <Input
        type="text"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className={cn(sizeClasses[size], 'transition-colors', className)}
        autoFocus={autoFocus}
        disabled={disabled}
      />
    </div>
  )
}
