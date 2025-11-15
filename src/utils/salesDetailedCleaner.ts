import { Transaction } from '@/lib/supabase'

/**
 * Interface for raw Sales Detailed CSV row
 * This CSV has 15 header rows that should be skipped
 */
export interface RawSalesRow {
  'Date'?: string
  'Time'?: string
  'SO #'?: string
  'SO Number'?: string
  'Sales Order'?: string
  'Customer Name'?: string
  'Membership No'?: string
  'Membership Number'?: string
  'Member No'?: string
  'Transaction Type'?: string
  'Type'?: string
  'Payment Status'?: string
  'Status'?: string
  'Total Amount'?: string | number
  'Amount'?: string | number
  'Total'?: string | number
  'Discount'?: string | number
  'Total Discount'?: string | number
  'Tax'?: string | number
  'Tax Amount'?: string | number
  'Net Amount'?: string | number
  'Net'?: string | number
  'Outstanding'?: string | number
  'Outstanding Amount'?: string | number
  'Cancelled'?: string
  'Is Cancelled'?: string
  [key: string]: any
}

/**
 * Cleans monetary value from string or number
 */
function cleanMonetaryValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    // Remove commas, spaces, and currency symbols
    const cleaned = value.toString().replace(/[RM,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  } catch (e) {
    console.error('Error cleaning monetary value:', value, e)
    return 0
  }
}

/**
 * Parse date from CSV (handles DD/MM/YYYY format)
 */
function parseCSVDate(value: any): string | null {
  if (!value) return null

  try {
    // If it's a string date
    if (typeof value === 'string') {
      const trimmed = value.trim()

      // Handle DD/MM/YYYY format
      if (trimmed.includes('/')) {
        const parts = trimmed.split('/')
        if (parts.length === 3) {
          const [day, month, year] = parts
          // Validate parts
          const d = parseInt(day)
          const m = parseInt(month)
          const y = parseInt(year)

          if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900) {
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
          }
        }
      }

      // Try parsing as ISO date
      const date = new Date(trimmed)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    // If it's a Date object
    if (value instanceof Date && !isNaN(value.getTime())) {
      return value.toISOString().split('T')[0]
    }

    return null
  } catch (e) {
    console.error('Error parsing date:', value, e)
    return null
  }
}

/**
 * Parse boolean from string values
 */
function parseBoolean(value: string | undefined): boolean {
  if (!value) return false
  const normalized = value.toString().trim().toLowerCase()
  return normalized === 'yes' || normalized === 'true' || normalized === '1' || normalized === 'y'
}

/**
 * Cleans a single sales detailed row
 */
export function cleanSalesRow(
  raw: RawSalesRow,
  customerIdMap: Map<string, string>,
  rowIndex: number
): Omit<Transaction, 'id' | 'created_at'> | null {
  // Debug logging for first few rows
  if (rowIndex < 3) {
    console.log(`🔍 DEBUG: Processing sales row ${rowIndex + 1}`)
    console.log(`   Available keys:`, Object.keys(raw).slice(0, 15))
    console.log(`   SO #:`, raw['SO #'] || raw['SO Number'] || raw['Sales Order'])
    console.log(`   Membership:`, raw['Membership No'] || raw['Membership Number'] || raw['Member No'])
  }

  // Get SO number from various possible column names
  const soNumber = (
    raw['SO #'] ||
    raw['SO Number'] ||
    raw['Sales Order'] ||
    ''
  ).toString().trim()

  if (!soNumber) {
    if (rowIndex < 5) {
      console.warn(`⚠️ Row ${rowIndex + 1}: Missing SO number`)
    }
    return null
  }

  // Get membership number from various possible column names
  const membershipNumber = (
    raw['Membership No'] ||
    raw['Membership Number'] ||
    raw['Member No'] ||
    ''
  ).toString().trim()

  if (!membershipNumber) {
    if (rowIndex < 5) {
      console.warn(`⚠️ Row ${rowIndex + 1}: Missing membership number for SO #${soNumber}`)
    }
    return null
  }

  // Look up customer_id from membership number
  const customerId = customerIdMap.get(membershipNumber)
  if (!customerId) {
    if (rowIndex < 5) {
      console.warn(`⚠️ Row ${rowIndex + 1}: Customer not found for membership ${membershipNumber} (SO #${soNumber})`)
    }
    return null
  }

  // Parse transaction date
  const transactionDate = parseCSVDate(raw['Date'])

  // Get transaction type
  const transactionType = (raw['Transaction Type'] || raw['Type'] || '').toString().trim() || null

  // Get payment status
  const paymentStatus = (raw['Payment Status'] || raw['Status'] || '').toString().trim() || null

  // Parse monetary values
  const totalAmount = cleanMonetaryValue(raw['Total Amount'] || raw['Amount'] || raw['Total'])
  const totalDiscount = cleanMonetaryValue(raw['Discount'] || raw['Total Discount'])
  const taxAmount = cleanMonetaryValue(raw['Tax'] || raw['Tax Amount'])
  const netAmount = cleanMonetaryValue(raw['Net Amount'] || raw['Net'])
  const outstandingAmount = cleanMonetaryValue(raw['Outstanding'] || raw['Outstanding Amount'])

  // Parse cancelled status
  const isCancelled = parseBoolean(raw['Cancelled'] || raw['Is Cancelled'])

  // Debug logging for first few rows
  if (rowIndex < 3) {
    console.log(`✅ Row ${rowIndex + 1} cleaned:`, {
      so_number: soNumber,
      customer_id: customerId.substring(0, 8) + '...',
      transaction_date: transactionDate,
      total_amount: totalAmount,
      is_cancelled: isCancelled
    })
  }

  return {
    customer_id: customerId,
    so_number: soNumber,
    transaction_date: transactionDate,
    transaction_type: transactionType,
    payment_status: paymentStatus,
    total_amount: totalAmount,
    total_discount: totalDiscount,
    tax_amount: taxAmount,
    net_amount: netAmount,
    outstanding_amount: outstandingAmount,
    is_cancelled: isCancelled
  }
}

/**
 * Cleans sales detailed data from CSV
 * @param rawData - Raw CSV data (already parsed with skipRows: 15)
 * @param customerIdMap - Map of membership_number to customer_id
 * @returns Array of cleaned transaction objects
 */
export function cleanSalesDetailedData(
  rawData: RawSalesRow[],
  customerIdMap: Map<string, string>
): Omit<Transaction, 'id' | 'created_at'>[] {
  console.log('🧹 Starting sales detailed data cleaning...')
  console.log(`📊 Raw rows to process: ${rawData.length}`)
  console.log(`👥 Customer ID map size: ${customerIdMap.size}`)

  // Debug: Show sample customer map entries
  const sampleCustomers = Array.from(customerIdMap.entries()).slice(0, 3)
  console.log('🔍 Sample customer mappings:', sampleCustomers.map(([mem, id]) =>
    `${mem} → ${id.substring(0, 8)}...`
  ))

  const cleanedTransactions: Omit<Transaction, 'id' | 'created_at'>[] = []

  let rejectedNoSO = 0
  let rejectedNoMembership = 0
  let rejectedNoCustomer = 0

  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]

    // Track rejection reasons
    const soNumber = (
      row['SO #'] ||
      row['SO Number'] ||
      row['Sales Order'] ||
      ''
    ).toString().trim()

    if (!soNumber) {
      rejectedNoSO++
      continue
    }

    const membershipNumber = (
      row['Membership No'] ||
      row['Membership Number'] ||
      row['Member No'] ||
      ''
    ).toString().trim()

    if (!membershipNumber) {
      rejectedNoMembership++
      continue
    }

    const customerId = customerIdMap.get(membershipNumber)
    if (!customerId) {
      rejectedNoCustomer++
      if (rejectedNoCustomer <= 3) {
        console.warn(`⚠️ Customer not found for membership: ${membershipNumber}`)
      }
      continue
    }

    // Clean the row
    const cleaned = cleanSalesRow(row, customerIdMap, i)
    if (cleaned) {
      cleanedTransactions.push(cleaned)
    }
  }

  console.log(`\n✅ Cleaned ${cleanedTransactions.length} transactions from ${rawData.length} raw rows`)
  console.log(`📊 Sales rejection breakdown:`)
  console.log(`   ❌ No SO number: ${rejectedNoSO}`)
  console.log(`   ❌ No membership number: ${rejectedNoMembership}`)
  console.log(`   ❌ Customer not found: ${rejectedNoCustomer}`)

  // Show sample of cleaned data
  if (cleanedTransactions.length > 0) {
    console.log('\n📋 Sample cleaned transaction:', {
      so_number: cleanedTransactions[0].so_number,
      customer_id: cleanedTransactions[0].customer_id.substring(0, 8) + '...',
      transaction_date: cleanedTransactions[0].transaction_date,
      total_amount: cleanedTransactions[0].total_amount,
      payment_status: cleanedTransactions[0].payment_status,
      is_cancelled: cleanedTransactions[0].is_cancelled
    })
  }

  return cleanedTransactions
}
