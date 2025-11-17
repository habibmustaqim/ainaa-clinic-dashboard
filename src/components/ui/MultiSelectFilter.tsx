import React, { useState, useRef, useEffect } from 'react'
import { Check, ChevronDown, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from './button'
import { Badge } from './badge'

export interface MultiSelectOption {
  value: string
  label: string
}

export interface MultiSelectFilterProps {
  label: string
  options: MultiSelectOption[]
  selected: string[]
  onChange: (selected: string[]) => void
  placeholder?: string
  className?: string
}

export const MultiSelectFilter: React.FC<MultiSelectFilterProps> = ({
  label,
  options,
  selected,
  onChange,
  placeholder = 'Select options...',
  className
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
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
    if (selected.includes(value)) {
      onChange(selected.filter(v => v !== value))
    } else {
      onChange([...selected, value])
    }
  }

  const clearAll = () => {
    onChange([])
  }

  const selectAll = () => {
    onChange(filteredOptions.map(opt => opt.value))
  }

  const getSelectedLabels = () => {
    return selected
      .map(value => options.find(opt => opt.value === value)?.label)
      .filter(Boolean)
  }

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <label className="block text-sm font-medium text-foreground mb-2">
        {label}
      </label>

      {/* Trigger Button */}
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full justify-between text-left font-normal',
          selected.length === 0 && 'text-muted-foreground'
        )}
      >
        <span className="truncate">
          {selected.length === 0 ? placeholder : `${selected.length} selected`}
        </span>
        <ChevronDown className={cn(
          'ml-2 h-4 w-4 shrink-0 opacity-50 transition-transform',
          isOpen && 'rotate-180'
        )} />
      </Button>

      {/* Selected Items Display */}
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {getSelectedLabels().slice(0, 3).map((label, index) => (
            <Badge
              key={index}
              variant="secondary"
              className="text-xs"
            >
              {label}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  const value = selected[index]
                  toggleOption(value)
                }}
                className="ml-1 hover:bg-secondary-foreground/20 rounded-full"
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
          {selected.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{selected.length - 3} more
            </Badge>
          )}
        </div>
      )}

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-popover border border-border rounded-md shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-border">
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          {/* Action Buttons */}
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
              Clear All
            </button>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-sm text-center text-muted-foreground">
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
                      'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors',
                      isSelected && 'bg-accent/50'
                    )}
                  >
                    <div className={cn(
                      'flex h-4 w-4 items-center justify-center rounded-sm border border-primary',
                      isSelected ? 'bg-primary text-primary-foreground' : 'opacity-50'
                    )}>
                      {isSelected && <Check className="h-3 w-3" />}
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
