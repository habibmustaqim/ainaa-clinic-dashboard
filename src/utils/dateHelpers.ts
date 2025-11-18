/**
 * Date utility functions for date range filtering
 */

export interface DateRange {
  from: Date | null
  to: Date | null
  preset?: 'week' | 'month' | 'year' | 'lifetime' | 'custom'
}

/**
 * Get start and end of current week (Monday to today)
 */
export function getWeekRange(): { from: Date; to: Date } {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? -6 : 1 - day // Adjust when day is Sunday (0)

  const from = new Date(now)
  from.setDate(now.getDate() + diff)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

/**
 * Get start and end of current month (from first day to today)
 */
export function getMonthRange(): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

/**
 * Get start and end of current year (from January 1 to today)
 */
export function getYearRange(): { from: Date; to: Date } {
  const now = new Date()
  const from = new Date(now.getFullYear(), 0, 1)
  from.setHours(0, 0, 0, 0)

  const to = new Date(now)
  to.setHours(23, 59, 59, 999)

  return { from, to }
}

/**
 * Get lifetime range (null for no filtering)
 */
export function getLifetimeRange(): { from: null; to: null } {
  return { from: null, to: null }
}

/**
 * Get date range based on preset
 */
export function getPresetRange(preset: 'week' | 'month' | 'year' | 'lifetime'): DateRange {
  switch (preset) {
    case 'week':
      return { ...getWeekRange(), preset: 'week' }
    case 'month':
      return { ...getMonthRange(), preset: 'month' }
    case 'year':
      return { ...getYearRange(), preset: 'year' }
    case 'lifetime':
      return { ...getLifetimeRange(), preset: 'lifetime' }
    default:
      return { from: null, to: null, preset: 'lifetime' }
  }
}

/**
 * Format date range for display
 */
export function formatDateRange(range: DateRange): string {
  if (range.preset === 'lifetime') return 'All Time'
  if (range.preset === 'week') return 'This Week'
  if (range.preset === 'month') return 'This Month'
  if (range.preset === 'year') return 'This Year'

  if (!range.from || !range.to) return 'All Time'

  // Format dates as DD-MM-YYYY
  const formatDate = (date: Date): string => {
    const day = String(date.getDate()).padStart(2, '0')
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const year = date.getFullYear()
    return `${day}-${month}-${year}`
  }

  const fromStr = formatDate(range.from)
  const toStr = formatDate(range.to)

  return `${fromStr} - ${toStr}`
}

/**
 * Check if a date is within a date range
 */
export function isDateInRange(date: Date | string | null, range: DateRange): boolean {
  if (!date) return false
  if (!range.from && !range.to) return true // Lifetime range

  const dateObj = typeof date === 'string' ? new Date(date) : date

  if (range.from && dateObj < range.from) return false
  if (range.to && dateObj > range.to) return false

  return true
}

/**
 * Filter array of data by date range
 */
export function filterByDateRange<T extends { transaction_date?: string | null }>(
  data: T[],
  range: DateRange,
  dateField: keyof T = 'transaction_date'
): T[] {
  if (!range.from && !range.to) return data // Lifetime range

  return data.filter(item => {
    const date = item[dateField] as string | null | undefined
    return isDateInRange(date, range)
  })
}

/**
 * Convert Date to ISO string for comparison
 */
export function toISODateString(date: Date): string {
  return date.toISOString()
}

/**
 * Convert Date to local date string in YYYY-MM-DD format
 * This avoids timezone issues when formatting dates for database queries
 */
export function toLocalDateString(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Parse date input value (YYYY-MM-DD) to Date object
 */
export function parseDateInput(value: string): Date | null {
  if (!value) return null
  const date = new Date(value + 'T00:00:00')
  return isNaN(date.getTime()) ? null : date
}

/**
 * Format Date to date input value (YYYY-MM-DD)
 */
export function formatDateInput(date: Date | null): string {
  if (!date) return ''
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * Get the previous period of equal length for comparison
 * Used for calculating growth percentages
 */
export function getPreviousPeriod(range: DateRange): DateRange {
  // If lifetime, return null (no comparison)
  if (range.preset === 'lifetime' || (!range.from && !range.to)) {
    return { from: null, to: null, preset: 'lifetime' }
  }

  // Handle preset ranges
  if (range.preset === 'week') {
    const { from, to } = getWeekRange()
    const prevFrom = new Date(from)
    prevFrom.setDate(from.getDate() - 7)
    const prevTo = new Date(to)
    prevTo.setDate(to.getDate() - 7)
    return { from: prevFrom, to: prevTo, preset: 'custom' }
  }

  if (range.preset === 'month') {
    const now = new Date()
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59)
    return { from: lastMonthStart, to: lastMonthEnd, preset: 'custom' }
  }

  if (range.preset === 'year') {
    const now = new Date()
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1)
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59)
    return { from: lastYearStart, to: lastYearEnd, preset: 'custom' }
  }

  // Handle custom range - calculate period of same length before current range
  if (range.from && range.to) {
    const duration = range.to.getTime() - range.from.getTime()
    const prevTo = new Date(range.from.getTime() - 1) // Day before current range starts
    const prevFrom = new Date(prevTo.getTime() - duration)
    return { from: prevFrom, to: prevTo, preset: 'custom' }
  }

  return { from: null, to: null, preset: 'lifetime' }
}
