/**
 * Utility functions for formatting data
 * All functions use theme-aware formatting and handle null/undefined values
 */

/**
 * Format a number as Malaysian Ringgit currency
 * @param amount - The amount to format
 * @param options - Optional configuration
 * @returns Formatted currency string (e.g., "RM 1,234.56")
 */
export const formatCurrency = (
  amount: number | null | undefined,
  options?: {
    currency?: string
    locale?: string
    fallback?: string
  }
): string => {
  const {
    currency = 'RM',
    locale = 'en-MY',
    fallback = 'RM 0.00'
  } = options || {}

  if (amount === null || amount === undefined || isNaN(amount)) {
    return fallback
  }

  return `${currency} ${amount.toLocaleString(locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`
}

/**
 * Helper function to format date as DD-MM-YYYY
 */
const formatToDDMMYYYY = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}-${month}-${year}`
}

/**
 * Helper function to format datetime as DD-MM-YYYY HH:mm:ss
 */
const formatToDDMMYYYYHHmmss = (date: Date): string => {
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  const seconds = String(date.getSeconds()).padStart(2, '0')
  return `${day}-${month}-${year} ${hours}:${minutes}:${seconds}`
}

/**
 * Date format types
 */
export type DateFormat = 'short' | 'long' | 'relative' | 'time' | 'datetime'

/**
 * Format a date in various formats
 * @param date - The date to format (string, Date object, or null)
 * @param format - The format type
 * @param fallback - Fallback text for null/invalid dates
 * @returns Formatted date string
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format: DateFormat = 'short',
  fallback: string = 'N/A'
): string => {
  if (!date) return fallback

  try {
    const dateObj = typeof date === 'string' ? new Date(date) : date

    // Check if date is valid
    if (isNaN(dateObj.getTime())) return fallback

    switch (format) {
      case 'short':
        return formatToDDMMYYYY(dateObj)

      case 'long':
        return dateObj.toLocaleDateString('en-MY', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        })

      case 'relative':
        return getRelativeTime(dateObj)

      case 'time':
        return dateObj.toLocaleTimeString('en-MY', {
          hour: '2-digit',
          minute: '2-digit'
        })

      case 'datetime':
        return formatToDDMMYYYYHHmmss(dateObj)

      default:
        return formatToDDMMYYYY(dateObj)
    }
  } catch (error) {
    console.error('Error formatting date:', error)
    return fallback
  }
}

/**
 * Get relative time string (e.g., "2 days ago", "3 weeks ago")
 * @param date - The date to compare against now
 * @returns Relative time string
 */
const getRelativeTime = (date: Date): string => {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
  const diffMinutes = Math.floor(diffMs / (1000 * 60))

  if (diffMinutes < 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
  if (diffDays === 0) return 'Today'
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
  if (diffDays < 30) {
    const weeks = Math.floor(diffDays / 7)
    return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  }
  if (diffDays < 365) {
    const months = Math.floor(diffDays / 30)
    return `${months} month${months === 1 ? '' : 's'} ago`
  }
  const years = Math.floor(diffDays / 365)
  return `${years} year${years === 1 ? '' : 's'} ago`
}

/**
 * Extract initials from a full name
 * @param name - The full name
 * @param maxLength - Maximum number of initials to return (default: 2)
 * @param fallback - Fallback text for null/empty names
 * @returns Uppercase initials (e.g., "JD" for "John Doe")
 */
export const getInitials = (
  name: string | null | undefined,
  maxLength: number = 2,
  fallback: string = '??'
): string => {
  if (!name || name.trim() === '') return fallback

  return name
    .trim()
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, maxLength)
}

/**
 * Format a phone number
 * @param phone - The phone number to format
 * @param fallback - Fallback text for null/empty phone numbers
 * @returns Formatted phone number
 */
export const formatPhone = (
  phone: string | null | undefined,
  fallback: string = 'N/A'
): string => {
  if (!phone || phone.trim() === '') return fallback
  return phone.trim()
}

/**
 * Format an IC number (Identity Card)
 * Can optionally mask for privacy
 * @param icNumber - The IC number
 * @param mask - Whether to mask the IC number (show only first 6 digits)
 * @param fallback - Fallback text for null/empty IC numbers
 * @returns Formatted IC number
 */
export const formatIcNumber = (
  icNumber: string | null | undefined,
  mask: boolean = false,
  fallback: string = 'N/A'
): string => {
  if (!icNumber || icNumber.trim() === '') return fallback

  const trimmed = icNumber.trim()

  if (mask && trimmed.length > 6) {
    return trimmed.slice(0, 6) + '****'
  }

  return trimmed
}

/**
 * Truncate text with ellipsis
 * @param text - The text to truncate
 * @param maxLength - Maximum length before truncation
 * @param ellipsis - The ellipsis string (default: "...")
 * @returns Truncated text
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number,
  ellipsis: string = '...'
): string => {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength - ellipsis.length) + ellipsis
}

/**
 * Format a number with thousand separators
 * @param num - The number to format
 * @param decimals - Number of decimal places
 * @param fallback - Fallback for null/undefined
 * @returns Formatted number string
 */
export const formatNumber = (
  num: number | null | undefined,
  decimals: number = 0,
  fallback: string = '0'
): string => {
  if (num === null || num === undefined || isNaN(num)) return fallback

  return num.toLocaleString('en-MY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  })
}

/**
 * Format a percentage
 * @param value - The value (0-100 or 0-1 depending on asDecimal)
 * @param asDecimal - Whether the input is a decimal (0-1) vs percentage (0-100)
 * @param decimals - Number of decimal places
 * @returns Formatted percentage string (e.g., "45.5%")
 */
export const formatPercentage = (
  value: number | null | undefined,
  asDecimal: boolean = false,
  decimals: number = 1
): string => {
  if (value === null || value === undefined || isNaN(value)) return '0%'

  const percentage = asDecimal ? value * 100 : value
  return `${percentage.toFixed(decimals)}%`
}
