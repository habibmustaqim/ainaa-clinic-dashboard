import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Column } from '@tanstack/react-table'
import { Calendar, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../button'
import { Card } from '../card'

interface DateRangeColumnFilterProps<TData> {
  column: Column<TData, unknown>
  placeholder?: string
}

export function DateRangeColumnFilter<TData>({
  column,
  placeholder = 'Filter'
}: DateRangeColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false)
  const columnFilterValue = column.getFilterValue() as [string | null, string | null] | undefined
  const [from, setFrom] = useState(columnFilterValue?.[0] || '')
  const [to, setTo] = useState(columnFilterValue?.[1] || '')
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
    if (from || to) {
      column.setFilterValue([from || null, to || null])
    } else {
      column.setFilterValue(undefined)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setFrom('')
    setTo('')
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const hasFilter = columnFilterValue && (columnFilterValue[0] || columnFilterValue[1])

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
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className={cn(
                  'w-full px-2 py-1 text-xs rounded-md',
                  'bg-background border border-input',
                  'focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">To</label>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className={cn(
                  'w-full px-2 py-1 text-xs rounded-md',
                  'bg-background border border-input',
                  'focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
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
        <Calendar className="h-3 w-3 mr-1" />
        {hasFilter ? placeholder : placeholder}
        {hasFilter && (
          <X
            className="h-3 w-3 ml-auto"
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
