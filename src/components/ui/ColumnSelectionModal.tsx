import React, { useState, useEffect, useMemo } from 'react'
import { X, Check, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

export interface ColumnOption {
  id: string
  label: string
  required?: boolean
}

export interface FilenameToken {
  value: string
  label: string
  type: 'date' | 'column' | 'static'
}

interface FilenamePart {
  id: string
  type: 'token' | 'text'
  value: string
}

// Sortable part component for drag and drop
const SortableFilenamePart: React.FC<{
  part: FilenamePart
  onRemove: () => void
  onEdit?: () => void
  onAddAfter?: () => void
  isEditing?: boolean
  editingText?: string
  onTextChange?: (text: string) => void
  onSaveText?: () => void
}> = ({ part, onRemove, onEdit, onAddAfter, isEditing, editingText, onTextChange, onSaveText }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: part.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  }

  if (part.type === 'token') {
    return (
      <div
        ref={setNodeRef}
        style={style}
        className="inline-flex items-center gap-1 px-2 py-1 bg-primary/10 text-primary rounded text-xs font-medium cursor-move"
        {...attributes}
        {...listeners}
      >
        <span>{part.value}</span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="hover:bg-primary/20 rounded p-0.5 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
        {onAddAfter && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onAddAfter()
            }}
            className="hover:bg-primary/20 rounded p-0.5 transition-colors ml-1"
          >
            <Plus className="w-3 h-3" />
          </button>
        )}
      </div>
    )
  }

  // Text part
  if (isEditing && onTextChange && onSaveText) {
    return (
      <input
        ref={setNodeRef}
        style={style}
        type="text"
        value={editingText}
        onChange={(e) => onTextChange(e.target.value)}
        onBlur={onSaveText}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onSaveText()
        }}
        autoFocus
        className="inline-block px-2 py-1 text-xs bg-muted border border-border rounded focus:outline-none focus:ring-1 focus:ring-ring min-w-[60px]"
        placeholder="Type text..."
      />
    )
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="inline-flex items-center gap-1 px-2 py-1 bg-muted text-foreground rounded text-xs cursor-move"
      {...attributes}
      {...listeners}
    >
      <span onClick={onEdit} className="cursor-text">{part.value || 'empty'}</span>
      <button
        onClick={(e) => {
          e.stopPropagation()
          onRemove()
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="hover:bg-accent rounded p-0.5 transition-colors"
      >
        <X className="w-3 h-3" />
      </button>
      {onAddAfter && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onAddAfter()
          }}
          className="hover:bg-accent rounded p-0.5 transition-colors ml-1"
        >
          <Plus className="w-3 h-3" />
        </button>
      )}
    </div>
  )
}

interface ColumnSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (selectedColumns: string[], filename: string) => void
  columns: ColumnOption[]
  title?: string
  availableTokens?: FilenameToken[]
  tableInstance?: any
  defaultSelectedIds?: string[] // Optional default selection
}

export const ColumnSelectionModal: React.FC<ColumnSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  columns,
  title = 'Select Columns to Export',
  availableTokens = [],
  tableInstance,
  defaultSelectedIds
}) => {
  // Initialize with default selection or all columns
  const [selectedColumns, setSelectedColumns] = useState<Set<string>>(
    new Set(defaultSelectedIds && defaultSelectedIds.length > 0
      ? defaultSelectedIds
      : columns.map(col => col.id))
  )

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      const initialSelection = defaultSelectedIds && defaultSelectedIds.length > 0
        ? defaultSelectedIds
        : columns.map(col => col.id)

      setSelectedColumns(new Set(initialSelection))
    }
  }, [isOpen, defaultSelectedIds, columns])

  // Tab state
  const [activeTab, setActiveTab] = useState<'columns' | 'filename'>('columns')

  // Filename builder state - interactive parts
  const [filenameParts, setFilenameParts] = useState<FilenamePart[]>([])
  const [editingPartId, setEditingPartId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')

  // Filter tokens to show only columns with active filters
  const filteredTokens = useMemo(() => {
    if (!tableInstance) return []

    const columnFilters = tableInstance.getState?.()?.columnFilters || []
    const activeFilterIds = new Set(columnFilters.map((f: any) => f.id))

    // Get column headers for active filters
    const allColumns = tableInstance.getAllColumns?.() || []
    const activeFilterHeaders = new Set(
      allColumns
        .filter((col: any) => activeFilterIds.has(col.id))
        .map((col: any) => {
          // Handle both string headers and function headers
          const header = typeof col.columnDef.header === 'function'
            ? col.columnDef.header()
            : col.columnDef.header
          // Extract text from React elements
          return typeof header === 'string' ? header : header?.props?.children?.props?.children || col.id
        })
    )

    // Show date/static tokens + column tokens that have active filters
    return availableTokens.filter(token =>
      token.type === 'date' || token.type === 'static' || (token.type === 'column' && activeFilterHeaders.has(token.label))
    )
  }, [tableInstance, availableTokens])

  // Reset selection when modal opens
  useEffect(() => {
    if (isOpen) {
      setSelectedColumns(new Set(columns.map(col => col.id)))
      setActiveTab('columns') // Reset to columns tab
      // Reset filename to empty
      setFilenameParts([])
      setEditingPartId(null)
      setEditingText('')
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

  // Drag and drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Filename builder functions
  const addTokenToFilename = (tokenLabel: string) => {
    const newPart: FilenamePart = {
      id: `token-${Date.now()}-${Math.random()}`,
      type: 'token',
      value: tokenLabel
    }
    setFilenameParts([...filenameParts, newPart])
  }

  const removePartFromFilename = (partId: string) => {
    setFilenameParts(filenameParts.filter(p => p.id !== partId))
  }

  const addTextPart = (afterPartId?: string) => {
    const newPart: FilenamePart = {
      id: `text-${Date.now()}-${Math.random()}`,
      type: 'text',
      value: ''
    }

    if (afterPartId) {
      const index = filenameParts.findIndex(p => p.id === afterPartId)
      const newParts = [...filenameParts]
      newParts.splice(index + 1, 0, newPart)
      setFilenameParts(newParts)
    } else {
      setFilenameParts([...filenameParts, newPart])
    }

    setEditingPartId(newPart.id)
    setEditingText('')
  }

  const updateTextPart = (partId: string, text: string) => {
    setFilenameParts(filenameParts.map(p =>
      p.id === partId ? { ...p, value: text } : p
    ))
  }

  const clearFilename = () => {
    setFilenameParts([])
    setEditingPartId(null)
    setEditingText('')
  }

  const buildFilename = (): string => {
    const parts = filenameParts
      .filter(p => p.value.trim()) // Filter out empty parts
      .map(p => p.value.trim())

    // Return default filename if no parts
    return parts.length > 0 ? parts.join('-') : 'customer-report'
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setFilenameParts((parts) => {
        const oldIndex = parts.findIndex((p) => p.id === active.id)
        const newIndex = parts.findIndex((p) => p.id === over.id)
        return arrayMove(parts, oldIndex, newIndex)
      })
    }
  }

  const handleConfirm = () => {
    const selectedArray = Array.from(selectedColumns)
    if (selectedArray.length === 0) return // Prevent empty selection
    const filename = buildFilename()
    onConfirm(selectedArray, filename)
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
      <div className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-2xl max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-card border border-border rounded-lg shadow-lg flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-border">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{title}</h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Choose which columns to include in your export
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 hover:bg-accent rounded-lg transition-colors"
            >
              <X className="w-4 h-4 text-muted-foreground" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-border">
            <button
              onClick={() => setActiveTab('columns')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === 'columns'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Select Columns
              {activeTab === 'columns' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('filename')}
              className={cn(
                'flex-1 px-4 py-2 text-sm font-medium transition-colors relative',
                activeTab === 'filename'
                  ? 'text-primary'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Customize Filename
              {activeTab === 'filename' && (
                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
              )}
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {/* Filename Generator Tab */}
            {activeTab === 'filename' && (
            <>
              {/* Interactive Preview / Builder Area */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Interactive Filename Generator:</p>
                  <button
                    onClick={clearFilename}
                    className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-foreground rounded transition-colors"
                  >
                    Clear All
                  </button>
                </div>

                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <div className="min-h-[80px] p-3 bg-muted/50 rounded-lg border border-border">
                    {filenameParts.length > 0 ? (
                      <SortableContext
                        items={filenameParts.map(p => p.id)}
                        strategy={horizontalListSortingStrategy}
                      >
                        <div className="flex flex-wrap gap-2 items-center">
                          {filenameParts.map((part) => (
                            <SortableFilenamePart
                              key={part.id}
                              part={part}
                              onRemove={() => removePartFromFilename(part.id)}
                              onEdit={part.type === 'text' ? () => {
                                setEditingPartId(part.id)
                                setEditingText(part.value)
                              } : undefined}
                              onAddAfter={() => addTextPart(part.id)}
                              isEditing={editingPartId === part.id}
                              editingText={editingText}
                              onTextChange={setEditingText}
                              onSaveText={() => {
                                updateTextPart(part.id, editingText)
                                setEditingPartId(null)
                              }}
                            />
                          ))}
                          <button
                            onClick={() => addTextPart()}
                            className="inline-flex items-center gap-1 px-2 py-1 text-xs text-muted-foreground hover:text-foreground hover:bg-accent rounded transition-colors border border-dashed border-border"
                          >
                            <Plus className="w-3 h-3" />
                            Add Text
                          </button>
                        </div>
                      </SortableContext>
                    ) : (
                      <div className="text-center py-4 text-muted-foreground">
                        <p className="text-sm">Drag tokens here or click "Add Text" to build your filename</p>
                        <p className="text-xs mt-1">Drag to reorder • Click + to insert text • Click × to remove</p>
                      </div>
                    )}
                  </div>
                </DndContext>

                {/* Final Preview */}
                <div className="mt-2 p-2 bg-background/50 rounded border border-border/50">
                  <p className="text-xs text-muted-foreground">Final filename:</p>
                  <p className="text-sm font-mono text-foreground font-medium">{buildFilename()}.csv</p>
                </div>
              </div>

              {/* Available Tokens */}
              <div className="max-h-[320px] overflow-y-auto">
                {filteredTokens.length > 0 ? (
                  <div>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-2">Available Tokens (Click to Add)</h4>
                    <div className="flex flex-wrap gap-2">
                      {filteredTokens.map((token) => {
                        const isAlreadyAdded = filenameParts.some(p => p.type === 'token' && p.value === token.label)
                        return (
                          <button
                            key={token.label}
                            onClick={() => !isAlreadyAdded && addTokenToFilename(token.label)}
                            disabled={isAlreadyAdded}
                            className={cn(
                              'inline-flex items-center px-3 py-1.5 rounded border transition-all text-xs font-medium whitespace-nowrap',
                              isAlreadyAdded
                                ? 'opacity-50 cursor-not-allowed bg-muted border-border'
                                : 'bg-card border-border text-foreground hover:border-primary/50 hover:bg-primary/5'
                            )}
                          >
                            {token.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <p className="text-sm">No tokens available</p>
                    <p className="text-xs mt-1">Apply filters to the table to see column tokens</p>
                  </div>
                )}
              </div>
            </>
            )}

            {/* Columns Selection Tab */}
            {activeTab === 'columns' && (
            <>
              {/* Selection Controls */}
              <div className="flex items-center justify-between mb-3 pb-2 border-b border-border">
                <div className="flex gap-1.5">
                <button
                  onClick={handleSelectAll}
                  className="px-2 py-1 text-xs bg-primary/10 text-primary hover:bg-primary/20 rounded transition-colors"
                >
                  Select All
                </button>
                <button
                  onClick={handleDeselectAll}
                  className="px-2 py-1 text-xs bg-accent hover:bg-accent/80 text-foreground rounded transition-colors"
                >
                  Deselect All
                </button>
                </div>
                <div className="text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{selectedCount}</span> selected
                  <span className="mx-1.5">•</span>
                  <span className={cn(
                    'font-medium',
                    predictedOrientation === 'Portrait' ? 'text-blue-600 dark:text-blue-400' : 'text-orange-600 dark:text-orange-400'
                  )}>
                    {predictedOrientation}
                  </span>
                </div>
              </div>

              {/* Column List */}
              <div className="grid grid-cols-3 gap-2 max-h-[400px] overflow-y-auto">
                {columns.map(column => {
                  const isSelected = selectedColumns.has(column.id)
                  const isRequired = column.required

                  return (
                    <button
                      key={column.id}
                      onClick={() => handleToggle(column.id)}
                      disabled={isRequired}
                      className={cn(
                        'flex items-center gap-2 p-2 rounded border transition-all text-left',
                        isSelected
                          ? 'bg-primary/10 border-primary text-foreground'
                          : 'bg-card border-border text-muted-foreground hover:border-border/80',
                        isRequired && 'opacity-75 cursor-not-allowed',
                        !isRequired && 'hover:bg-accent cursor-pointer'
                      )}
                    >
                      <div className={cn(
                        'w-4 h-4 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors',
                        isSelected
                          ? 'bg-primary border-primary'
                          : 'border-muted-foreground/30'
                      )}>
                        {isSelected && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <span className={cn(
                        'text-xs font-medium',
                        isSelected && 'text-foreground'
                      )}>
                        {column.label}
                        {isRequired && (
                          <span className="ml-1 text-[10px] text-muted-foreground">(required)</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 p-4 border-t border-border">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedCount === 0}
              className={cn(
                'px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-lg transition-colors',
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
