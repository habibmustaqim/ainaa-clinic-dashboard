import * as XLSX from 'xlsx'
import { Payment, Item } from '@/lib/supabase'

/**
 * Parses an Excel file and returns JSON data
 */
export async function parseExcelFile(file: File, options?: { skipRows?: number }): Promise<any[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        // DEBUG: Log all sheet names
        console.log(`📊 Excel file ${file.name} has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames)

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        console.log(`📄 Reading sheet: "${firstSheetName}"`)

        // Convert to JSON with optional row skipping
        const parseOptions: XLSX.Sheet2JSONOpts = {}
        if (options?.skipRows && options.skipRows > 0) {
          parseOptions.range = options.skipRows // Skip first N rows
          console.log(`⏭️  Skipping first ${options.skipRows} rows of ${file.name}`)
        }

        const jsonData = XLSX.utils.sheet_to_json(worksheet, parseOptions)

        // DEBUG: Log first row structure if available
        if (jsonData.length > 0) {
          const firstRowKeys = Object.keys(jsonData[0])
          console.log(`🔍 First row has ${firstRowKeys.length} columns:`, firstRowKeys.slice(0, 10))
        }

        console.log(`Parsed Excel file: ${file.name}, rows: ${jsonData.length}`)
        resolve(jsonData)
      } catch (error) {
        console.error('Error parsing Excel file:', error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      console.error('Error reading Excel file:', error)
      reject(error)
    }

    reader.readAsBinaryString(file)
  })
}

/**
 * Interface for raw payment data from Excel
 */
export interface RawPaymentRow {
  'Date'?: string
  'Time'?: string
  'SO #'?: string
  'Payment Method'?: string
  'Amount'?: string | number
  'Status'?: string
  'Payment Date'?: string
  [key: string]: any
}

/**
 * Cleans monetary value
 */
function cleanMonetaryValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    const cleaned = value.toString().replace(/[,\s]/g, '')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  } catch (e) {
    return 0
  }
}

/**
 * Parse date from Excel
 */
function parseExcelDate(value: any): string | null {
  if (!value) return null

  try {
    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value)
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      }
    }

    // If it's a string date
    if (typeof value === 'string') {
      // Handle DD/MM/YYYY format
      if (value.includes('/')) {
        const parts = value.split('/')
        if (parts.length === 3) {
          const [day, month, year] = parts
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }

      // Try parsing as ISO date
      const date = new Date(value)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    return null
  } catch (e) {
    return null
  }
}

/**
 * Cleans a payment row from Excel
 */
export function cleanPaymentRow(
  raw: RawPaymentRow,
  transactionIdMap: Map<string, string>
): Omit<Payment, 'id' | 'created_at'> | null {
  const soNumber = raw['SO #']?.toString().trim()
  if (!soNumber) return null

  const transactionId = soNumber ? transactionIdMap.get(soNumber) : undefined
  if (!transactionId) {
    console.warn('Transaction not found for SO #:', soNumber)
    return null
  }

  return {
    transaction_id: transactionId,
    payment_method: raw['Payment Method']?.toString().trim() || null,
    amount: cleanMonetaryValue(raw['Amount']),
    payment_date: parseExcelDate(raw['Payment Date'] || raw['Date']),
    status: raw['Status']?.toString().trim() || 'completed'
  }
}

/**
 * Cleans payment data from Excel
 */
export function cleanPaymentData(
  rawData: RawPaymentRow[],
  transactionIdMap: Map<string, string>
): Omit<Payment, 'id' | 'created_at'>[] {
  const cleanedPayments: Omit<Payment, 'id' | 'created_at'>[] = []

  for (const row of rawData) {
    const cleaned = cleanPaymentRow(row, transactionIdMap)
    if (cleaned) {
      cleanedPayments.push(cleaned)
    }
  }

  console.log(`Cleaned ${cleanedPayments.length} payments from ${rawData.length} raw rows`)
  return cleanedPayments
}

/**
 * Interface for raw item sales data from Excel
 */
export interface RawItemRow {
  'Date'?: string
  'Time'?: string
  'SO #'?: string
  'Item Name'?: string
  'Item'?: string
  'Product'?: string
  'Service'?: string
  'Quantity'?: string | number
  'Qty'?: string | number
  'Unit Price'?: string | number
  'Price'?: string | number
  'Total'?: string | number
  'Total Price'?: string | number
  'Category'?: string
  'Type'?: string
  [key: string]: any
}

/**
 * Parse quantity
 */
function parseQuantity(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 1
  if (typeof value === 'number') return value

  try {
    const num = parseInt(value.toString())
    return isNaN(num) ? 1 : num
  } catch (e) {
    return 1
  }
}

/**
 * Cleans an item row from Excel
 */
export function cleanItemRow(
  raw: RawItemRow,
  transactionIdMap: Map<string, string>
): Omit<Item, 'id' | 'created_at'> | null {
  const soNumber = raw['SO #']?.toString().trim()
  if (!soNumber) return null

  const transactionId = soNumber ? transactionIdMap.get(soNumber) : undefined
  if (!transactionId) {
    console.warn('Transaction not found for SO #:', soNumber)
    return null
  }

  // Try to find item name from various possible column names
  const itemName = (
    raw['Item Name'] ||
    raw['Item'] ||
    raw['Product'] ||
    raw['Service'] ||
    ''
  ).toString().trim()

  if (!itemName) return null

  const quantity = parseQuantity(raw['Quantity'] || raw['Qty'])
  const unitPrice = cleanMonetaryValue(raw['Unit Price'] || raw['Price'])
  const totalPrice = cleanMonetaryValue(raw['Total'] || raw['Total Price'])

  return {
    transaction_id: transactionId,
    item_name: itemName,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: totalPrice || (unitPrice * quantity),
    category: raw['Category']?.toString().trim() || raw['Type']?.toString().trim() || null
  }
}

/**
 * Cleans item sales data from Excel
 */
export function cleanItemSalesData(
  rawData: RawItemRow[],
  transactionIdMap: Map<string, string>
): Omit<Item, 'id' | 'created_at'>[] {
  const cleanedItems: Omit<Item, 'id' | 'created_at'>[] = []

  // DEBUG: Log first row to see actual Excel structure
  if (rawData.length > 0) {
    console.log('🔍 DEBUG: First item row keys:', Object.keys(rawData[0]).slice(0, 15))
    console.log('🔍 DEBUG: First item row sample:', {
      'SO #': rawData[0]['SO #'],
      'Item Name': rawData[0]['Item Name'],
      'Item': rawData[0]['Item'],
      'Product': rawData[0]['Product'],
      'Service': rawData[0]['Service']
    })
  }

  // DEBUG: Log transactionIdMap sample
  console.log('🔍 DEBUG: TransactionIdMap size for items:', transactionIdMap.size)
  const sampleKeys = Array.from(transactionIdMap.keys()).slice(0, 5)
  console.log('🔍 DEBUG: Sample transaction SO numbers in map:', sampleKeys)

  let rejectedNoSO = 0
  let rejectedNoTransaction = 0
  let rejectedNoItemName = 0

  for (const row of rawData) {
    const soNumber = row['SO #']?.toString().trim()
    if (!soNumber) {
      rejectedNoSO++
      continue
    }

    const transactionId = transactionIdMap.get(soNumber)
    if (!transactionId) {
      rejectedNoTransaction++
      if (rejectedNoTransaction <= 3) {
        console.warn('⚠️ Transaction not found for item SO #:', soNumber)
      }
      continue
    }

    const itemName = (
      row['Item Name'] ||
      row['Item'] ||
      row['Product'] ||
      row['Service'] ||
      ''
    ).toString().trim()

    if (!itemName) {
      rejectedNoItemName++
      continue
    }

    const cleaned = cleanItemRow(row, transactionIdMap)
    if (cleaned) {
      cleanedItems.push(cleaned)
    }
  }

  console.log(`✅ Cleaned ${cleanedItems.length} items from ${rawData.length} raw rows`)
  console.log(`📊 Item rejection breakdown:`)
  console.log(`   ❌ No SO#: ${rejectedNoSO}`)
  console.log(`   ❌ Transaction not found: ${rejectedNoTransaction}`)
  console.log(`   ❌ No item name: ${rejectedNoItemName}`)

  return cleanedItems
}
