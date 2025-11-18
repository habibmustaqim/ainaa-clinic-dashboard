import React, { useState, useEffect } from 'react'
import { X, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ColumnOption {
  id: string
  label: string
  required?: boolean
}

interface ColumnSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedColumns: string[]) => void
  columns: ColumnOption[]
  title?: string
}

export const ColumnSelectionModal: React.FC<ColumnSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  columns,
  title = 'Select Columns to Export'
}) => {
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(columns.map(col => col.id))
  )

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(new Set(columns.map(col => col.id)))
    }
  }, [isOpen, columns])

  const handleToggle = (columnId: string) => {
    const column = columns.find(c => c.id === columnId)
    if (column?.required) return // Don't allow deselecting required columns

    const newSelected = new Set(selectedColumns)
    if (newSelected.has(columnId)) {
      newSelected.delete(columnId)
    } else {
      newSelected.add(columnId)
    }
    setSelectedColumns(newSelected)
  }

  const handleSelectAll = () => {
    setSelectedColumns(new Set(columns.map(col => col.id)))
  }

  const handleDeselectAll = () => {
    // Keep only required columns
    const requiredColumns = columns.filter(col => col.required).map(col => col.id)
    setSelectedColumns(new Set(requiredColumns))
  }

  const handleConfirm = () => {
    const selectedArray = Array.from(selectedColumns)
    if (selectedArray.length === 0) return // Prevent empty selection
    onConfirm(selectedArray)
    onClose()
  }

  const selectedCount = selectedColumns.size
  const predictedOrientation = selectedCount > 6 ? 'Landscape' : 'Portrait'

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50 animate-in fade-in duration-200"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-lg shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-border">
            <div>
              <h2 className="text-xl font-semibold text-foreground">{title}</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose which columns to include in your export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Selection Controls */}
            <div className="flex items-center justify-between mb-4 pb-4 border-b border-border">
              <div className="flex gap-2">
                <button
                  onClick={handleSelectAll}
                  className="px-3 py-1.5 text-sm bg-primary/10 text-primary hover:bg-primary/20 rounded-lg transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-3 py-1.5 text-sm bg-accent hover:bg-accent/80 text-foreground rounded-lg transition-colors"
                >
                  Deselect All
                </button>
              </div>
              <div className="text-sm text-muted-foreground">
                <span className="font-medium text-foreground">{selectedCount}</span> columns selected
                <span className="mx-2">•</span>
                <span className={cn(
                  'font-medium',
                  predictedOrientation === 'Portrait' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                )}>
                  {predictedOrientation}
                </span> orientation
              </div>
            </div>

            {/* Column List */}
            <div className="grid grid-cols-2 gap-3">
              {columns.map(column => {
                const isSelected = selectedColumns.has(column.id)
                const isRequired = column.required

                return (
                  <button
                    key={column.id}
                    onClick={() => handleToggle(column.id)}
                    disabled={isRequired}
                    className={cn(
                      'flex items-center gap-3 p-3 rounded-lg border transition-all text-left',
                      isSelected
                        ? 'bg-primary/10 border-primary text-foreground'
                        : 'bg-card border-border text-muted-foreground hover:border-border/80',
                      isRequired && 'opacity-75 cursor-not-allowed',
                      !isRequired && 'hover:bg-accent cursor-pointer'
                    )}
                  >
                    <div className={cn(
                      'w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                      isSelected
                        ? 'bg-primary border-primary'
                        : 'border-muted-foreground/30'
                    )}>
                      {isSelected && <Check className="w-3.5 h-3.5 text-primary-foreground" />}
                    </div>
                    <span className={cn(
                      'text-sm font-medium',
                      isSelected && 'text-foreground'
                    )}>
                      {column.label}
                      {isRequired && (
                        <span className="ml-1 text-xs text-muted-foreground">(required)</span>
                      )}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-border">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className={cn(
                'px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg transition-colors',
                selectedCount === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-primary/90'
              )}
            >
              Export {selectedCount} Column{selectedCount !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
