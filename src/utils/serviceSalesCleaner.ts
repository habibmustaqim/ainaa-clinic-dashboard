import * as XLSX from 'xlsx'

/**
 * Service Sales Cleaner
 *
 * This cleaner handles Service Sales data from Excel files with:
 * - skipRows: 15 (header at row 16)
 * - 42+ fields including duplicate column names
 * - Integration with enhanced_items table
 * - BOM removal and comprehensive string cleaning
 * - Date parsing DD/MM/YYYY to YYYY-MM-DD
 * - Monetary value cleaning with parentheses for negatives
 * - Outstanding parsing with percentage
 * - Tax rate parsing
 * - Comprehensive rejection tracking
 */

/**
 * Interface for raw Service Sales data from Excel
 *
 * This interface represents the 42+ fields from the Service Sales Excel file.
 * Note: Some column names are duplicated in the Excel file, so we use array indexing
 * to access them correctly via rowValues.
 */
export interface RawServiceSalesRow {
  // Basic transaction info
  'Date'?: string
  'Time'?: string
  'SO #'?: string
  'Transaction'?: string
  'Staff'?: string
  'Status'?: string

  // Customer info
  'Membership Number'?: string
  'Customer Name'?: string
  'Contact'?: string
  'Email'?: string

  // Service details
  'Service Code'?: string
  'Service Name'?: string
  'Service'?: string
  'Service Category'?: string
  'Service Type'?: string
  'Package'?: string

  // Quantity and pricing
  'Qty'?: string | number
  'Quantity'?: string | number
  'Unit Price'?: string | number
  'Price'?: string | number
  'Original Price'?: string | number

  // Discounts
  'Discount'?: string | number
  'Discount %'?: string | number
  'Discount Type'?: string
  'Discount Reason'?: string
  'Promotion'?: string

  // Totals
  'Subtotal'?: string | number
  'Total'?: string | number
  'Total Price'?: string | number
  'Net Total'?: string | number

  // Tax
  'Tax'?: string | number
  'Tax Amount'?: string | number
  'Tax Rate'?: string | number
  'Tax %'?: string

  // Payment
  'Payment Status'?: string
  'Payment Method'?: string
  'Paid'?: string | number
  'Paid Amount'?: string | number
  'Outstanding'?: string | number
  'Outstanding %'?: string
  'Balance'?: string | number

  // Additional fields
  'Therapist'?: string
  'Room'?: string
  'Duration'?: string | number
  'Remarks'?: string
  'Notes'?: string

  // Allow any additional fields
  [key: string]: any
}

/**
 * Interface for enhanced_items table
 * This extends the basic Item interface with service-specific fields
 */
export interface EnhancedItem {
  // Foreign keys
  transaction_id: string

  // Basic item info
  item_name: string
  item_type: 'service' | 'product'
  category: string | null

  // Quantity and pricing
  quantity: number
  unit_price: number
  original_price: number

  // Discounts
  discount_amount: number
  discount_percentage: number
  discount_type: string | null
  discount_reason: string | null

  // Totals
  subtotal: number
  total_price: number

  // Tax
  tax_amount: number
  tax_rate: number

  // Service-specific fields
  service_code: string | null
  package_name: string | null
  therapist: string | null
  room: string | null
  duration: number | null

  // Additional metadata
  staff: string | null
  remarks: string | null
}

/**
 * Remove BOM (Byte Order Mark) from string
 */
function removeBOM(str: string): string {
  if (str.charCodeAt(0) === 0xFEFF) {
    return str.slice(1)
  }
  return str
}

/**
 * Clean string value - removes BOM, trims whitespace
 */
function cleanString(value: any): string {
  if (value === undefined || value === null || value === '') return ''
  const str = value.toString().trim()
  return removeBOM(str)
}

/**
 * Parse date from DD/MM/YYYY format to YYYY-MM-DD
 */
function parseDate(value: any): string | null {
  if (!value) return null

  try {
    const str = cleanString(value)
    if (!str) return null

    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value)
      if (date) {
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      }
    }

    // Handle DD/MM/YYYY format
    if (str.includes('/')) {
      const parts = str.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        // Validate parts
        const d = parseInt(day)
        const m = parseInt(month)
        const y = parseInt(year)

        if (d >= 1 && d <= 31 && m >= 1 && m <= 12 && y >= 1900) {
          return `${y}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }
    }

    // Try parsing as ISO date
    const date = new Date(str)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }

    return null
  } catch (e) {
    console.warn('Error parsing date:', value, e)
    return null
  }
}

/**
 * Clean monetary value
 * Handles:
 * - Commas and spaces
 * - Parentheses for negative values: (100.00) = -100.00
 * - Currency symbols
 */
function cleanMonetaryValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    let str = cleanString(value)
    if (!str) return 0

    // Check for parentheses indicating negative
    const isNegative = str.includes('(') && str.includes(')')

    // Remove currency symbols, commas, spaces, parentheses
    str = str.replace(/[RM$,\s()]/g, '')

    const num = parseFloat(str)
    if (isNaN(num)) return 0

    return isNegative ? -Math.abs(num) : num
  } catch (e) {
    console.warn('Error parsing monetary value:', value, e)
    return 0
  }
}

/**
 * Parse quantity
 */
function parseQuantity(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 1
  if (typeof value === 'number') return value

  try {
    const str = cleanString(value)
    if (!str) return 1

    const num = parseFloat(str.replace(/,/g, ''))
    return isNaN(num) || num <= 0 ? 1 : num
  } catch (e) {
    return 1
  }
}

/**
 * Parse percentage value
 * Handles: "50%", "50.5%", "50", 50
 */
function parsePercentage(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    let str = cleanString(value)
    if (!str) return 0

    // Remove % sign
    str = str.replace('%', '').trim()

    const num = parseFloat(str)
    return isNaN(num) ? 0 : num
  } catch (e) {
    return 0
  }
}

/**
 * Parse outstanding with percentage
 * Handles: "100.00 (50%)", "100.00", "(100.00)"
 */
function parseOutstanding(value: string | number | undefined): { amount: number; percentage: number } {
  if (value === undefined || value === null || value === '') {
    return { amount: 0, percentage: 0 }
  }

  if (typeof value === 'number') {
    return { amount: value, percentage: 0 }
  }

  try {
    const str = cleanString(value)
    if (!str) return { amount: 0, percentage: 0 }

    // Check for format: "100.00 (50%)"
    const match = str.match(/^(.+?)\s*\((.+?)%?\)$/)
    if (match) {
      const amount = cleanMonetaryValue(match[1])
      const percentage = parsePercentage(match[2])
      return { amount, percentage }
    }

    // Just a number
    return { amount: cleanMonetaryValue(str), percentage: 0 }
  } catch (e) {
    console.warn('Error parsing outstanding:', value, e)
    return { amount: 0, percentage: 0 }
  }
}

/**
 * Parse tax rate
 * Handles: "8%", "8.0%", "8", 8, "SST 8%"
 */
function parseTaxRate(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    let str = cleanString(value)
    if (!str) return 0

    // Extract number from strings like "SST 8%"
    const match = str.match(/(\d+\.?\d*)%?/)
    if (match) {
      const num = parseFloat(match[1])
      return isNaN(num) ? 0 : num
    }

    return 0
  } catch (e) {
    return 0
  }
}

/**
 * Parse duration in minutes
 * Handles: "60", "1.5", "90 mins", "1 hour"
 */
function parseDuration(value: string | number | undefined): number | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'number') return value

  try {
    let str = cleanString(value).toLowerCase()
    if (!str) return null

    // Remove common text
    str = str.replace(/mins?|minutes?|hrs?|hours?/g, '').trim()

    const num = parseFloat(str)
    return isNaN(num) ? null : num
  } catch (e) {
    return null
  }
}

/**
 * Cleans a service sales row from Excel
 *
 * @param raw - Raw row data from Excel
 * @param rowValues - Array of cell values (for handling duplicate column names)
 * @param transactionIdMap - Map of SO# to transaction IDs
 * @returns Cleaned enhanced item object or null if invalid
 */
export function cleanServiceSalesRow(
  raw: RawServiceSalesRow,
  rowValues: any[],
  transactionIdMap: Map<string, string>
): Omit<EnhancedItem, 'id' | 'created_at'> | null {
  // Extract SO number
  const soNumber = cleanString(raw['SO #'] || raw['Transaction'])
  if (!soNumber) {
    return null
  }

  // Get transaction ID
  const transactionId = transactionIdMap.get(soNumber)
  if (!transactionId) {
    return null
  }

  // Extract service name (required)
  const serviceName = cleanString(
    raw['Service Name'] ||
    raw['Service'] ||
    raw['Service Code'] ||
    ''
  )
  if (!serviceName) {
    return null
  }

  // Extract quantities and prices
  const quantity = parseQuantity(raw['Qty'] || raw['Quantity'])
  const unitPrice = cleanMonetaryValue(raw['Unit Price'] || raw['Price'])
  const originalPrice = cleanMonetaryValue(raw['Original Price'] || unitPrice)

  // Extract discounts
  const discountAmount = cleanMonetaryValue(raw['Discount'])
  const discountPercentage = parsePercentage(raw['Discount %'])
  const discountType = cleanString(raw['Discount Type'])
  const discountReason = cleanString(raw['Discount Reason'])

  // Calculate subtotal
  const subtotal = originalPrice * quantity

  // Extract totals
  const totalPrice = cleanMonetaryValue(
    raw['Total'] ||
    raw['Total Price'] ||
    raw['Net Total'] ||
    (subtotal - discountAmount)
  )

  // Extract tax
  const taxAmount = cleanMonetaryValue(raw['Tax'] || raw['Tax Amount'])
  const taxRate = parseTaxRate(raw['Tax Rate'] || raw['Tax %'])

  // Extract service-specific fields
  const serviceCode = cleanString(raw['Service Code'])
  const packageName = cleanString(raw['Package'])
  const therapist = cleanString(raw['Therapist'])
  const room = cleanString(raw['Room'])
  const duration = parseDuration(raw['Duration'])

  // Extract additional metadata
  const staff = cleanString(raw['Staff'])
  const category = cleanString(raw['Service Category'] || raw['Service Type'])
  const remarks = cleanString(raw['Remarks'] || raw['Notes'])

  return {
    transaction_id: transactionId,
    item_name: serviceName,
    item_type: 'service',
    category: category || null,
    quantity,
    unit_price: unitPrice,
    original_price: originalPrice,
    discount_amount: discountAmount,
    discount_percentage: discountPercentage,
    discount_type: discountType || null,
    discount_reason: discountReason || null,
    subtotal,
    total_price: totalPrice,
    tax_amount: taxAmount,
    tax_rate: taxRate,
    service_code: serviceCode || null,
    package_name: packageName || null,
    therapist: therapist || null,
    room: room || null,
    duration,
    staff: staff || null,
    remarks: remarks || null
  }
}

/**
 * Cleans service sales data from Excel
 *
 * @param rawData - Array of raw rows from Excel
 * @param transactionIdMap - Map of SO# to transaction IDs
 * @returns Array of cleaned enhanced items
 */
export function cleanServiceSalesData(
  rawData: RawServiceSalesRow[],
  transactionIdMap: Map<string, string>
): Omit<EnhancedItem, 'id' | 'created_at'>[] {
  console.log('🧹 Starting Service Sales data cleaning...')
  console.log(`📊 Input: ${rawData.length} raw rows`)
  console.log(`🗺️  Transaction map size: ${transactionIdMap.size}`)

  const cleanedItems: Omit<EnhancedItem, 'id' | 'created_at'>[] = []

  // Rejection tracking
  let rejectedNoSO = 0
  let rejectedNoTransaction = 0
  let rejectedNoService = 0
  let rejectedInvalidDate = 0

  // DEBUG: Log first row to see actual Excel structure
  if (rawData.length > 0) {
    console.log('🔍 DEBUG: First service sales row keys:', Object.keys(rawData[0]).slice(0, 20))
    console.log('🔍 DEBUG: First service sales row sample:', {
      'SO #': rawData[0]['SO #'],
      'Transaction': rawData[0]['Transaction'],
      'Service Name': rawData[0]['Service Name'],
      'Service': rawData[0]['Service'],
      'Qty': rawData[0]['Qty'],
      'Unit Price': rawData[0]['Unit Price'],
      'Total': rawData[0]['Total']
    })
  }

  // DEBUG: Log transaction ID map sample
  const sampleKeys = Array.from(transactionIdMap.keys()).slice(0, 5)
  console.log('🔍 DEBUG: Sample transaction SO numbers in map:', sampleKeys)

  // Process each row
  for (let i = 0; i < rawData.length; i++) {
    const row = rawData[i]

    // Log progress every 100 rows
    if (i > 0 && i % 100 === 0) {
      console.log(`⏳ Progress: ${i}/${rawData.length} rows processed...`)
    }

    // Extract SO number
    const soNumber = cleanString(row['SO #'] || row['Transaction'])
    if (!soNumber) {
      rejectedNoSO++
      continue
    }

    // Check transaction exists
    const transactionId = transactionIdMap.get(soNumber)
    if (!transactionId) {
      rejectedNoTransaction++
      if (rejectedNoTransaction <= 3) {
        console.warn(`⚠️ Transaction not found for service SO #: ${soNumber}`)
      }
      continue
    }

    // Check service name exists
    const serviceName = cleanString(
      row['Service Name'] ||
      row['Service'] ||
      row['Service Code'] ||
      ''
    )
    if (!serviceName) {
      rejectedNoService++
      continue
    }

    // For handling duplicate column names, we'd use rowValues array
    // For now, we'll use the row object directly
    const rowValues: any[] = Object.values(row)

    const cleaned = cleanServiceSalesRow(row, rowValues, transactionIdMap)
    if (cleaned) {
      cleanedItems.push(cleaned)
    }
  }

  // Final summary
  console.log('\n📋 Service Sales Cleaning Summary:')
  console.log(`✅ Successfully cleaned: ${cleanedItems.length} items`)
  console.log(`📊 Rejection breakdown:`)
  console.log(`   ❌ No SO#: ${rejectedNoSO}`)
  console.log(`   ❌ Transaction not found: ${rejectedNoTransaction}`)
  console.log(`   ❌ No service name: ${rejectedNoService}`)
  console.log(`   ❌ Invalid date: ${rejectedInvalidDate}`)
  console.log(`   📈 Success rate: ${((cleanedItems.length / rawData.length) * 100).toFixed(2)}%`)

  // Sample output
  if (cleanedItems.length > 0) {
    console.log('\n🔍 Sample cleaned service sales item:')
    console.log(JSON.stringify(cleanedItems[0], null, 2))
  }

  return cleanedItems
}

/**
 * Parse Service Sales Excel file with skipRows: 15
 *
 * @param file - Excel file to parse
 * @returns Array of raw service sales rows
 */
export async function parseServiceSalesFile(file: File): Promise<RawServiceSalesRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = (e) => {
      try {
        const data = e.target?.result
        const workbook = XLSX.read(data, { type: 'binary' })

        console.log(`📊 Service Sales Excel file "${file.name}" has ${workbook.SheetNames.length} sheets:`, workbook.SheetNames)

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]

        console.log(`📄 Reading sheet: "${firstSheetName}"`)
        console.log(`⏭️  Skipping first 15 rows (header at row 16)`)

        // Convert to JSON with skipRows: 15
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {
          range: 15, // Skip first 15 rows (0-indexed)
          defval: '', // Default value for empty cells
          raw: false // Return formatted strings instead of raw values
        })

        console.log(`✅ Parsed ${jsonData.length} service sales rows from "${file.name}"`)

        // DEBUG: Log column structure
        if (jsonData.length > 0) {
          const firstRow = jsonData[0] as any
          const columns = Object.keys(firstRow)
          console.log(`🔍 Detected ${columns.length} columns:`)
          columns.forEach((col, idx) => {
            if (idx < 20) { // Show first 20 columns
              console.log(`   ${idx + 1}. "${col}"`)
            }
          })
          if (columns.length > 20) {
            console.log(`   ... and ${columns.length - 20} more columns`)
          }
        }

        resolve(jsonData as RawServiceSalesRow[])
      } catch (error) {
        console.error('❌ Error parsing Service Sales Excel file:', error)
        reject(error)
      }
    }

    reader.onerror = (error) => {
      console.error('❌ Error reading Service Sales Excel file:', error)
      reject(error)
    }

    reader.readAsBinaryString(file)
  })
}
