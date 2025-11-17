import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  DateRange,
  getPresetRange,
  formatDateRange,
  formatDateInput,
  parseDateInput
} from '@/utils/dateHelpers'

export interface DateRangeFilterProps {
  value: DateRange
  onChange: (range: DateRange) => void
  presets?: Array<'week' | 'month' | 'year' | 'lifetime'>
  showCustomRange?: boolean
  className?: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'default' | 'compact'
  label?: string
}

export const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value,
  onChange,
  presets = ['week', 'month', 'year', 'lifetime'],
  showCustomRange = true,
  className,
  size = 'md',
  variant = 'default',
  label
}) => {
  const [showCustom, setShowCustom] = useState(false)
  const [customFrom, setCustomFrom] = useState(value.from ? formatDateInput(value.from) : '')
  const [customTo, setCustomTo] = useState(value.to ? formatDateInput(value.to) : '')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, right: 0 })

  // Calculate dropdown position when it opens
  useEffect(() => {
    if (showCustom && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      const viewportWidth = window.innerWidth

      // Position dropdown below button with 8px gap (using portal for proper z-index)
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.right - 288), // 288px = w-72 width, ensure 8px margin
        right: Math.max(8, viewportWidth - rect.right) // right margin for responsive
      })
    }
  }, [showCustom])

  const presetLabels: Record<string, string> = {
    week: 'This Week',
    month: 'This Month',
    year: 'This Year',
    lifetime: 'All Time'
  }

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-base gap-3'
  }

  const buttonSizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-2 text-sm',
    lg: 'px-4 py-2.5 text-base'
  }

  const handlePresetClick = (preset: 'week' | 'month' | 'year' | 'lifetime') => {
    const range = getPresetRange(preset)
    onChange(range)
    setShowCustom(false)
  }

  const handleCustomApply = () => {
    const from = parseDateInput(customFrom)
    const to = parseDateInput(customTo)

    if (from && to && from > to) {
      alert('Start date must be before end date')
      return
    }

    onChange({
      from,
      to,
      preset: 'custom'
    })
  }

  const handleClear = () => {
    setCustomFrom('')
    setCustomTo('')
    onChange(getPresetRange('lifetime'))
    setShowCustom(false)
  }

  const isPresetActive = (preset: string) => {
    return value.preset === preset
  }

  // Compact variant render
  if (variant === 'compact') {
    const dropdownContent = showCustom && (
      <>
        {/* Overlay to close dropdown when clicking outside - Must be rendered first */}
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowCustom(false)}
        />

        {/* Dropdown Menu - Portal - Rendered second to be on top */}
        <Card
          className="fixed w-72 p-3 shadow-lg animate-fade-in"
          style={{
            top: `${dropdownPosition.top}px`,
            left: `${dropdownPosition.left}px`,
            zIndex: 50
          }}
        >
          <div className="space-y-3">
            {/* Preset Buttons - Grid */}
            <div className="grid grid-cols-2 gap-2">
              {presets.map((preset) => (
                <Button
                  key={preset}
                  variant={isPresetActive(preset) ? 'default' : 'outline'}
                  size="sm"
                  className={cn(
                    'text-xs',
                    isPresetActive(preset) && 'ring-2 ring-primary/20'
                  )}
                  onClick={(e) => {
                    e.stopPropagation()
                    handlePresetClick(preset)
                    setShowCustom(false)
                  }}
                >
                  {presetLabels[preset]}
                </Button>
              ))}
            </div>

            {/* Custom Range Section */}
            {showCustomRange && (
              <div className="pt-3 border-t border-border space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Custom Range</p>
                <div className="space-y-2">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className={cn(
                      'w-full px-2 py-1.5 text-xs rounded-md',
                      'bg-background border border-input',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                    placeholder="From"
                  />
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className={cn(
                      'w-full px-2 py-1.5 text-xs rounded-md',
                      'bg-background border border-input',
                      'focus:outline-none focus:ring-2 focus:ring-primary/20'
                    )}
                    placeholder="To"
                  />
                  <Button
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleCustomApply()
                      setShowCustom(false)
                    }}
                    disabled={!customFrom || !customTo}
                    className="w-full text-xs"
                  >
                    Apply
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>
      </>
    )

    return (
      <div className={cn('space-y-2', className)}>
        {label && (
          <label className="text-xs font-medium text-foreground">
            {label}
          </label>
        )}
        <div className="relative">
          <Button
            ref={buttonRef}
            variant="outline"
            size="sm"
            onClick={() => setShowCustom(!showCustom)}
            className="text-xs md:text-sm whitespace-nowrap w-full"
          >
            <Calendar className="h-3.5 w-3.5 mr-1.5" />
            {formatDateRange(value)}
            <svg className="ml-1.5 h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </Button>

          {/* Render dropdown via portal at document root to escape stacking contexts */}
          {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
        </div>
      </div>
    )
  }

  // Default variant render
  return (
    <Card className={cn('p-4', className)}>
      <div className="space-y-3">
        {/* Preset Buttons */}
        <div className={cn('flex flex-wrap', sizeClasses[size])}>
          {presets.map((preset) => (
            <Button
              key={preset}
              variant={isPresetActive(preset) ? 'default' : 'outline'}
              size="sm"
              className={cn(
                buttonSizeClasses[size],
                'transition-all',
                isPresetActive(preset) && 'ring-2 ring-primary/20'
              )}
              onClick={() => handlePresetClick(preset)}
            >
              {presetLabels[preset]}
            </Button>
          ))}

          {showCustomRange && (
            <Button
              variant={value.preset === 'custom' ? 'default' : 'outline'}
              size="sm"
              className={cn(
                buttonSizeClasses[size],
                'transition-all',
                value.preset === 'custom' && 'ring-2 ring-primary/20'
              )}
              onClick={() => setShowCustom(!showCustom)}
            >
              <Calendar className="h-3.5 w-3.5 mr-1.5" />
              Custom Range
            </Button>
          )}
        </div>

        {/* Custom Date Range Picker */}
        {showCustom && showCustomRange && (
          <div className="pt-3 border-t border-border space-y-3 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* From Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  From Date
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={(e) => setCustomFrom(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                    'transition-all'
                  )}
                />
              </div>

              {/* To Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">
                  To Date
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={(e) => setCustomTo(e.target.value)}
                  className={cn(
                    'w-full px-3 py-2 text-sm rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-2 focus:ring-primary/20',
                    'transition-all'
                  )}
                />
              </div>
            </div>

            {/* Custom Range Actions */}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleCustomApply}
                disabled={!customFrom || !customTo}
                className="flex-1"
              >
                Apply Range
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setShowCustom(false)
                  setCustomFrom('')
                  setCustomTo('')
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Current Selection Display */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-foreground">
              {formatDateRange(value)}
            </span>
          </div>

          {(value.preset !== 'lifetime' || value.from || value.to) && (
            <Button
              size="sm"
              variant="ghost"
              onClick={handleClear}
              className="h-7 px-2 text-xs"
            >
              <X className="h-3.5 w-3.5 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>
    </Card>
  )
}

export default DateRangeFilter
