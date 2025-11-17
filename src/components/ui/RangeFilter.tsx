import React from 'react'
import { cn } from '@/lib/utils'

export interface RangeFilterProps {
  label: string
  min?: number
  max?: number
  value: { min: number | null; max: number | null }
  onChange: (value: { min: number | null; max: number | null }) => void
  placeholder?: { min?: string; max?: string }
  prefix?: string
  step?: number
  className?: string
}

export const RangeFilter: React.FC<RangeFilterProps> = ({
  label,
  min,
  max,
  value,
  onChange,
  placeholder = { min: 'Min', max: 'Max' },
  prefix = '',
  step = 1,
  className
}) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMin = e.target.value === '' ? null : parseFloat(e.target.value)
    onChange({ ...value, min: newMin })
  }

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newMax = e.target.value === '' ? null : parseFloat(e.target.value)
    onChange({ ...value, max: newMax })
  }

  const handleClear = () => {
    onChange({ min: null, max: null })
  }

  const hasValue = value.min !== null || value.max !== null

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="block text-xs font-medium text-foreground">
          {label}
        </label>
        {hasValue && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-destructive hover:underline"
          >
            Clear
          </button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2">
        {/* Min Input */}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.min ?? ''}
            onChange={handleMinChange}
            placeholder={placeholder.min}
            className={cn(
              'w-full px-3 py-2 text-sm bg-background border border-input rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'placeholder:text-muted-foreground',
              prefix && 'pl-8'
            )}
          />
        </div>

        {/* Max Input */}
        <div className="relative">
          {prefix && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
              {prefix}
            </span>
          )}
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value.max ?? ''}
            onChange={handleMaxChange}
            placeholder={placeholder.max}
            className={cn(
              'w-full px-3 py-2 text-sm bg-background border border-input rounded-md',
              'focus:outline-none focus:ring-2 focus:ring-ring',
              'placeholder:text-muted-foreground',
              prefix && 'pl-8'
            )}
          />
        </div>
      </div>

      {/* Value Display */}
      {hasValue && (
        <div className="text-xs text-muted-foreground">
          {value.min !== null && value.max !== null
            ? `${prefix}${value.min.toLocaleString()} - ${prefix}${value.max.toLocaleString()}`
            : value.min !== null
            ? `From ${prefix}${value.min.toLocaleString()}`
            : `Up to ${prefix}${value.max.toLocaleString()}`
          }
        </div>
      )}
    </div>
  )
}
