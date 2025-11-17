import React, { useState, useEffect } from 'react'
import { Column } from '@tanstack/react-table'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TextColumnFilterProps<TData> {
  column: Column<TData, unknown>
  placeholder?: string
}

export function TextColumnFilter<TData>({
  column,
  placeholder = 'Search...'
}: TextColumnFilterProps<TData>) {
  const columnFilterValue = column.getFilterValue()
  const [value, setValue] = useState((columnFilterValue ?? '') as string)

  // Debounce the filter value
  useEffect(() => {
    const timeout = setTimeout(() => {
      column.setFilterValue(value || undefined)
    }, 300)

    return () => clearTimeout(timeout)
  }, [value, column])

  return (
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground pointer-events-none" />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={cn(
          'w-full h-7 pl-7 pr-7 text-xs bg-background border border-input rounded',
          'focus:outline-none focus:ring-1 focus:ring-ring',
          'placeholder:text-muted-foreground'
        )}
      />
      {value && (
        <button
          onClick={() => setValue('')}
          className="absolute right-2 top-1/2 -translate-y-1/2 hover:bg-accent rounded p-0.5"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}
    </div>
  )
}
