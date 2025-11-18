import React, { useState, useRef, useEffect } from 'react'
import { Column } from '@tanstack/react-table'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '../button'

interface MultiSelectOption {
  value: string
  label: string
}

interface MultiSelectColumnFilterProps<TData> {
  column: Column<TData, unknown>
  options: MultiSelectOption[]
  placeholder?: string
}

export function MultiSelectColumnFilter<TData>({
  column,
  options,
  placeholder = 'Filter'
}: MultiSelectColumnFilterProps<TData>) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  const columnFilterValue = column.getFilterValue() as string[] | undefined
  // Use local state for optimistic UI updates
  const [optimisticSelected, setOptimisticSelected] = useState<string[]>(columnFilterValue || [])

  // Sync local state when column filter changes from external sources
  useEffect(() => {
    setOptimisticSelected(columnFilterValue || [])
  }, [columnFilterValue])

  const selected = optimisticSelected

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filteredOptions = options.filter(option =>
    option.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const toggleOption = (value: string) => {
    const newSelected = selected.includes(value)
      ? selected.filter(v => v !== value)
      : [...selected, value]

    // Update optimistic state immediately for instant UI feedback
    setOptimisticSelected(newSelected)
    // Then update the actual filter (async)
    column.setFilterValue(newSelected.length > 0 ? newSelected : undefined)
  }

  const clearAll = () => {
    setOptimisticSelected([])
    column.setFilterValue(undefined)
    setIsOpen(false)
  }

  const selectAll = () => {
    const allValues = filteredOptions.map(opt => opt.value)
    setOptimisticSelected(allValues)
    column.setFilterValue(allValues)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'h-7 text-xs w-full justify-between font-normal',
          selected.length > 0 && 'border-primary'
        )}
      >
        <span className="truncate">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown className={cn(
          'ml-2 h-3 w-3 shrink-0 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {isOpen && (
        <div className="absolute z-50 w-56 mt-1 bg-popover border border-border rounded-md shadow-lg">
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-background border border-input rounded focus:outline-none focus:ring-1 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <div className="flex justify-between p-2 border-b border-border">
            <button
              type="button"
              onClick={selectAll}
              className="text-xs text-primary hover:underline"
            >
              Select All
            </button>
            <button
              type="button"
              onClick={clearAll}
              className="text-xs text-destructive hover:underline"
            >
              Clear
            </button>
          </div>

          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-xs text-center text-muted-foreground">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => {
                const isSelected = selected.includes(option.value)
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => toggleOption(option.value)}
                    className={cn(
                      'w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-3.5 w-3.5 items-center justify-center rounded-sm border border-primary',
                      isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                    )}>
                      {isSelected && <Check className="h-2.5 w-2.5" />}
                    </div>
                    <span className={cn(isSelected && 'font-medium')}>
                      {option.label}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
