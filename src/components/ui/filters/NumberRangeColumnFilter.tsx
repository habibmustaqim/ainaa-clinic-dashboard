import React, { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Column } from '@tanstack/react-table'
import { DollarSign, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../button'
import { Card } from '../card'

interface NumberRangeColumnFilterProps<TData> {
  column: Column<TData, unknown>
  prefix?: string
  placeholder?: string
}

export function NumberRangeColumnFilter<TData>({
  column,
  prefix = '',
  placeholder = 'Filter'
}: NumberRangeColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false)
  const columnFilterValue = column.getFilterValue() as [number | null, number | null] | undefined
  const [min, setMin] = useState(columnFilterValue?.[0]?.toString() || '')
  const [max, setMax] = useState(columnFilterValue?.[1]?.toString() || '')
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
    const minNum = min === '' ? null : parseFloat(min)
    const maxNum = max === '' ? null : parseFloat(max)

    if (minNum !== null || maxNum !== null) {
      column.setFilterValue([minNum, maxNum])
    } else {
      column.setFilterValue(undefined)
    }
    setIsOpen(false)
  }

  const handleClear = () => {
    setMin('')
    setMax('')
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const hasFilter = columnFilterValue && (columnFilterValue[0] !== null || columnFilterValue[1] !== null)

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
              <label className="text-xs text-muted-foreground block mb-1">Min</label>
              <input
                type="number"
                value={min}
                onChange={(e) => setMin(e.target.value)}
                placeholder="Min"
                className={cn(
                  'w-full px-2 py-1 text-xs rounded-md',
                  'bg-background border border-input',
                  'focus:outline-none focus:ring-1 focus:ring-primary'
                )}
              />
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Max</label>
              <input
                type="number"
                value={max}
                onChange={(e) => setMax(e.target.value)}
                placeholder="Max"
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
        <DollarSign className="h-3 w-3 mr-1" />
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
