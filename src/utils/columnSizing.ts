/**
 * Column Sizing Utilities
 *
 * Provides automatic column width calculation based on content.
 * Uses Canvas API for accurate text measurement without DOM access.
 */

export interface ColumnSizingOptions {
  minWidth?: number
  maxWidth?: number
  padding?: number
  font?: string
  sampleSize?: number
}

export interface ColumnConstraints {
  minWidth: number
  maxWidth: number
}

/**
 * Measure text width using Canvas API
 * This is faster and more accurate than DOM-based measurement
 */
function measureText(text: string, font: string): number {
  // Create canvas element for text measurement
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) {
    // Fallback to rough estimation if canvas not available
    return text.length * 8
  }

  context.font = font
  const metrics = context.measureText(text)

  return Math.ceil(metrics.width)
}

/**
 * Calculate optimal column width based on content
 * Samples data to determine the widest content
 */
export function calculateColumnWidth(
  data: any[],
  accessor: string | ((row: any) => any),
  headerText: string,
  options: ColumnSizingOptions = {}
): number {
  const {
    minWidth = 80,
    maxWidth = 400,
    padding = 32, // Account for cell padding (px-4 = 16px on each side)
    font = '12px Inter, system-ui, sans-serif', // text-xs with Inter font
    sampleSize = 100
  } = options

  // Measure header width
  const headerWidth = measureText(headerText, `600 ${font}`) // font-semibold = 600 weight

  // Sample data for performance (don't measure all rows)
  const sampleData = data.slice(0, Math.min(data.length, sampleSize))

  // Measure content widths
  const contentWidths = sampleData.map(row => {
    let value: any

    if (typeof accessor === 'function') {
      value = accessor(row)
    } else {
      value = row[accessor]
    }

    // Convert value to string, handle null/undefined
    const stringValue = value !== null && value !== undefined ? String(value) : '-'

    return measureText(stringValue, font)
  })

  // Get maximum width from header and content
  const maxContentWidth = Math.max(headerWidth, ...contentWidths, 0)

  // Apply padding and constraints
  const calculatedWidth = maxContentWidth + padding

  return Math.min(Math.max(calculatedWidth, minWidth), maxWidth)
}

/**
 * Column-specific constraints
 * Define min/max widths for each column type
 */
export const COLUMN_CONSTRAINTS: Record<string, ColumnConstraints> = {
  // Customer Information
  membershipNumber: { minWidth: 100, maxWidth: 150 },
  customerName: { minWidth: 150, maxWidth: 200 }, // Truncated
  customerPhone: { minWidth: 120, maxWidth: 180 },
  customerBirthday: { minWidth: 90, maxWidth: 120 },

  // Beautician Columns
  onboardingBeautician: { minWidth: 120, maxWidth: 180 },
  beauticians: { minWidth: 150, maxWidth: 250 }, // Truncated, can have multiple names

  // Visit Metrics
  totalTransactions: { minWidth: 80, maxWidth: 120 },
  firstVisitDate: { minWidth: 90, maxWidth: 120 },
  lastVisitDate: { minWidth: 90, maxWidth: 120 },
  daysSinceLastVisit: { minWidth: 100, maxWidth: 140 },

  // Financial Metrics
  totalRevenue: { minWidth: 100, maxWidth: 150 },
  avgTransactionAmount: { minWidth: 100, maxWidth: 150 },
  totalServices: { minWidth: 120, maxWidth: 180 },
  totalItems: { minWidth: 120, maxWidth: 180 },

  // Services
  topServices: { minWidth: 150, maxWidth: 250 }, // Truncated, comma-separated list

  // Segmentation
  customerStatus: { minWidth: 90, maxWidth: 120 },
  customerRank: { minWidth: 100, maxWidth: 140 },

  // Default for any other columns
  default: { minWidth: 80, maxWidth: 400 }
}

/**
 * Get constraints for a specific column
 */
export function getColumnConstraints(columnId: string): ColumnConstraints {
  return COLUMN_CONSTRAINTS[columnId] || COLUMN_CONSTRAINTS.default
}

/**
 * Calculate optimal widths for all columns
 * Returns a Record mapping column IDs to calculated widths
 */
export function calculateOptimalColumnWidths<T extends Record<string, any>>(
  data: T[],
  columns: Array<{
    id: string
    header: string
    accessor: string | ((row: T) => any)
  }>
): Record<string, number> {
  const sizing: Record<string, number> = {}

  columns.forEach(col => {
    const constraints = getColumnConstraints(col.id)

    sizing[col.id] = calculateColumnWidth(
      data,
      col.accessor,
      col.header,
      {
        minWidth: constraints.minWidth,
        maxWidth: constraints.maxWidth,
        padding: 32, // px-4 on each side
        font: '12px Inter, system-ui, sans-serif',
        sampleSize: 100 // Sample first 100 rows for performance
      }
    )
  })

  return sizing
}

/**
 * Format currency for width calculation
 * Ensures width calculation accounts for formatted output
 */
export function formatCurrencyForSizing(amount: number): string {
  return `RM ${amount.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

/**
 * Format date for width calculation
 */
export function formatDateForSizing(date: string): string {
  return new Date(date).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}
