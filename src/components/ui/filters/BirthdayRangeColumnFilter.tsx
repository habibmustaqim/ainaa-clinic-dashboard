import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Column } from '@tanstack/react-table'
import { Cake, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../button'
import { Card } from '../card'

interface BirthdayRangeColumnFilterProps<TData> {
  column: Column<TData, unknown>
  placeholder?: string
}

export function BirthdayRangeColumnFilter<TData>({
  column,
  placeholder = 'Birthday'
}: BirthdayRangeColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false)
  const columnFilterValue = column.getFilterValue() as [string | null, string | null] | undefined
  // Parse MM-DD format: [0] is month, [1] is day
  const [fromMonth, setFromMonth] = useState(columnFilterValue?.[0]?.split('-')[0] || '')
  const [fromDay, setFromDay] = useState(columnFilterValue?.[0]?.split('-')[1] || '')
  const [toMonth, setToMonth] = useState(columnFilterValue?.[1]?.split('-')[0] || '')
  const [toDay, setToDay] = useState(columnFilterValue?.[1]?.split('-')[1] || '')
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 })

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setDropdownPosition({
        top: rect.bottom + 8,
        left: Math.max(8, rect.left)
      })
    }
  }, [isOpen])

  const handleApply = () => {
    // Store as MM-DD for consistency with filter function
    const from = fromDay && fromMonth ? `${fromMonth.padStart(2, '0')}-${fromDay.padStart(2, '0')}` : null
    const to = toDay && toMonth ? `${toMonth.padStart(2, '0')}-${toDay.padStart(2, '0')}` : null

    if (from || to) {
      column.setFilterValue([from, to])
    } else {
      column.setFilterValue(undefined)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setFromMonth('')
    setFromDay('')
    setToMonth('')
    setToDay('')
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const hasFilter = columnFilterValue && (columnFilterValue[0] || columnFilterValue[1])

  const formatBirthdayDisplay = () => {
    if (!hasFilter) return placeholder

    const from = columnFilterValue[0]
    const to = columnFilterValue[1]

    // Convert MM-DD to DD-MM for display
    const formatMMDDtoDDMM = (mmdd: string) => {
      const [month, day] = mmdd.split('-')
      return `${day}-${month}`
    }

    if (from && to) {
      return `${formatMMDDtoDDMM(from)} to ${formatMMDDtoDDMM(to)}`
    } else if (from) {
      return `From ${formatMMDDtoDDMM(from)}`
    } else if (to) {
      return `To ${formatMMDDtoDDMM(to)}`
    }
    return placeholder
  }

  const dropdownContent = isOpen && (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={() => setIsOpen(false)}
      />
      <Card
        className="fixed w-72 p-3 shadow-lg animate-fade-in"
        style={{
          top: `${dropdownPosition.top}px`,
          left: `${dropdownPosition.left}px`,
          zIndex: 50
        }}
      >
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">From</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="DD"
                  value={fromDay}
                  onChange={(e) => setFromDay(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-xs rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
                <span className="text-xs text-muted-foreground self-center">-</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  placeholder="MM"
                  value={fromMonth}
                  onChange={(e) => setFromMonth(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-xs rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <div className="flex gap-1">
                <input
                  type="number"
                  min="1"
                  max="31"
                  placeholder="DD"
                  value={toDay}
                  onChange={(e) => setToDay(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-xs rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
                <span className="text-xs text-muted-foreground self-center">-</span>
                <input
                  type="number"
                  min="1"
                  max="12"
                  placeholder="MM"
                  value={toMonth}
                  onChange={(e) => setToMonth(e.target.value)}
                  className={cn(
                    'w-full px-2 py-1 text-xs rounded-md',
                    'bg-background border border-input',
                    'focus:outline-none focus:ring-1 focus:ring-primary'
                  )}
                />
              </div>
            </div>
          </div>
          <div className="flex gap-2 pt-1">
            <Button
              size="sm"
              onClick={handleApply}
              className="flex-1 h-7 text-xs"
            >
              Apply
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleClear}
              className="h-7 text-xs"
            >
              Clear
            </Button>
          </div>
        </div>
      </Card>
    </>
  )

  return (
    <div className="relative">
      <Button
        ref={buttonRef}
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-7 text-xs w-full justify-start font-normal',
          hasFilter && 'border-primary'
        )}
      >
        <Cake className="h-3 w-3 mr-1" />
        <span className="truncate">{formatBirthdayDisplay()}</span>
        {hasFilter && (
          <X
            className="h-3 w-3 ml-auto flex-shrink-0"
            onClick={(e) => {
              e.stopPropagation()
              handleClear()
            }}
          />
        )}
      </Button>

      {typeof document !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </div>
  )
}
