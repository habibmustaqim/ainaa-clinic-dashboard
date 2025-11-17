import * as XLSX from 'xlsx'
import type { ServiceSales } from '@/lib/supabase'

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
 * Parse time value from Excel
 * Handles HH:MM:SS, HH:MM formats and Excel time serial numbers
 */
function parseTime(value: any): string | null {
  if (!value) return null

  try {
    const str = cleanString(value)
    if (!str) return null

    // Handle HH:MM:SS or HH:MM format
    if (str.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      return str
    }

    // Handle Excel time serial number (fraction of a day)
    if (typeof value === 'number') {
      const hours = Math.floor(value * 24)
      const minutes = Math.floor((value * 24 * 60) % 60)
      const seconds = Math.floor((value * 24 * 60 * 60) % 60)
      return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
    }

    return null
  } catch (e) {
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
 * @param customerIdMap - Map of membership# to customer IDs
 * @returns Cleaned service sales object or null if invalid
 */
export function cleanServiceSalesRow(
  raw: RawServiceSalesRow,
  rowValues: any[],
  transactionIdMap: Map<string, string>,
  customerIdMap: Map<string, string>,
  rowIndex: number = -1
): Omit<ServiceSales, 'id' | 'created_at' | 'updated_at'> | null {
  // Extract SO number (check multiple column name variations)
  const soNumber = cleanString(raw['Sales #'] || raw['SO #'] || raw['SO#'] || raw['Transaction'])
  if (!soNumber) {
    return null
  }

  // Get transaction ID
  const transactionId = transactionIdMap.get(soNumber)
  if (!transactionId) {
    return null
  }

  // Extract membership number
  const membershipNumber = cleanString(raw['Membership #'] || raw['Membership Number'])
  if (!membershipNumber) {
    return null
  }

  // Get customer ID
  const customerId = customerIdMap.get(membershipNumber)
  if (!customerId) {
    return null
  }

  // Extract service name (required)
  const serviceName = cleanString(
    raw['Services'] ||
    raw['Service Name'] ||
    raw['Service'] ||
    raw['Service Code'] ||
    ''
  )
  if (!serviceName) {
    return null
  }

  // Extract date and time (UPDATED CODE - v2)
  console.log('🔧 DEBUG: Using parseDate and parseTime functions')
  const saleDate = parseDate(raw['Date'])
  if (!saleDate) {
    return null
  }
  const saleTime = parseTime(raw['Time'])

  // Extract customer info
  const customerName = cleanString(raw['Customer'])
  const customerPhone = cleanString(raw['Customer Phone'])

  // Extract transaction details
  const invoiceNumber = cleanString(raw['Invoice #'])
  const saleType = cleanString(raw['Type'])

  // Extract service details
  const serviceType = cleanString(raw['Services  Type'] || raw['Service Type'])
  const sku = cleanString(raw['SKU'])
  const quantity = parseQuantity(raw['Qty'] || raw['Quantity'])

  // Extract pricing
  const originalRetailPrice = cleanMonetaryValue(raw['OriginalRetail Price'] || raw['Original Price'])
  const grossAmount = cleanMonetaryValue(raw['Gross '] || raw['Gross'])
  const voucherAmount = cleanMonetaryValue(raw['Voucher '] || raw['Voucher'])
  const discountAmount = cleanMonetaryValue(raw['Discount'] || 0)
  const nettBeforeDeduction = cleanMonetaryValue(raw['Nett Before Deduction'] || 0)

  // Extract promotions
  const promo = cleanString(raw['Promo'])
  const promoGroup = cleanString(raw['Promo  Group'] || raw['Promo Group'])

  // Extract tax
  const taxName = cleanString(raw['Tax  Name'] || raw['Tax Name'])
  const taxRate = parseTaxRate(raw['Tax  Rate (%)'] || raw['Tax Rate'])
  const taxAmount = cleanMonetaryValue(raw['Tax  Amount '] || raw['Tax Amount'])

  // Extract Cash Wallet amounts
  const cwUsedGross = cleanMonetaryValue(raw['CW Used(Gross)'] || 0)
  const cwUsedTax = cleanMonetaryValue(raw['CW Used(Tax)'] || 0)
  const cwCancelledGross = cleanMonetaryValue(raw['CW Cancelled(Gross)'] || 0)
  const cwCancelledTax = cleanMonetaryValue(raw['CW Cancelled(Tax)'] || 0)

  // Extract cancellation info
  const cancelledGross = cleanMonetaryValue(raw['Cancelled(Gross)'] || 0)
  const cancelledTax = cleanMonetaryValue(raw['Cancelled(Tax)'] || 0)
  const isCancelled = cancelledGross > 0 || cancelledTax > 0

  // Extract payment info - handle trailing spaces
  // Debug: Log available keys on first row to diagnose column name issue
  if (rowIndex === 0) {
    console.log('🔍 [Service Sales] Available column headers:', Object.keys(raw).filter(k => k.toLowerCase().includes('pay')))
    console.log('🔍 [Service Sales] Sample Payment values:', {
      'Payment ': raw['Payment '],
      'Payment': raw['Payment'],
      'Payment Amount': raw['Payment Amount'],
      ' Payment': raw[' Payment']
    })
  }

  const paymentAmount = cleanMonetaryValue(
    raw['Payment Details'] ||    // Split header format (row 17)
    raw['Payment '] ||           // With trailing space (common in exports)
    raw['Payment'] ||            // Without space
    raw['Payment Amount'] ||     // Alternative name
    raw[' Payment'] ||           // Leading space
    0
  )
  const paymentOutstanding = cleanMonetaryValue(
    raw['Outstanding'] ||
    raw['Outstanding '] ||       // With trailing space
    raw['Payment Outstanding'] ||
    0
  )
  const paymentMode = cleanString(raw['Payment Mode'])
  const paymentType = cleanString(raw['Payment Type'])
  const approvalCode = cleanString(raw['Approval Code'])
  const bank = cleanString(raw['Bank'])

  // Calculate nett amount
  const nettAmount = cleanMonetaryValue(raw['Nett'] || raw['Nett Amount'] || (grossAmount - discountAmount))

  // Extract staff info - handle trailing/leading spaces in column names
  const salesPerson = cleanString(
    raw['Sales Person '] ||      // With trailing space (common in exports)
    raw['Sales Person'] ||       // Without space
    raw[' Sales Person'] ||      // With leading space
    raw[' Sales Person '] ||     // Both spaces
    raw['Staff'] ||              // Alternative column name
    raw['Salesperson']           // Another variant
  )
  const processedBy = cleanString(
    raw['Processed By'] ||
    raw['Processed By '] ||      // With trailing space
    raw['ProcessedBy']
  )

  // Extract service-specific fields
  const therapist = cleanString(raw['Therapist'])
  const roomNumber = cleanString(raw['Room'])
  const durationMinutes = parseDuration(raw['Duration'])

  return {
    transaction_id: transactionId,
    customer_id: customerId,
    membership_number: membershipNumber,
    sales_number: soNumber,
    invoice_number: invoiceNumber || null,
    sale_date: saleDate,
    sale_time: saleTime,
    sale_type: saleType || null,
    customer_name: customerName || null,
    customer_phone: customerPhone || null,
    service_type: serviceType || null,
    sku: sku || null,
    service_name: serviceName,
    quantity,
    original_retail_price: originalRetailPrice,
    gross_amount: grossAmount,
    voucher_amount: voucherAmount,
    discount_amount: discountAmount,
    nett_before_deduction: nettBeforeDeduction,
    promo: promo || null,
    promo_group: promoGroup || null,
    tax_name: taxName || null,
    tax_rate: taxRate,
    tax_amount: taxAmount,
    cw_used_gross: cwUsedGross,
    cw_used_tax: cwUsedTax,
    cw_cancelled_gross: cwCancelledGross,
    cw_cancelled_tax: cwCancelledTax,
    cancelled_gross: cancelledGross,
    cancelled_tax: cancelledTax,
    is_cancelled: isCancelled,
    payment_amount: paymentAmount,
    payment_outstanding: paymentOutstanding,
    payment_mode: paymentMode || null,
    payment_type: paymentType || null,
    approval_code: approvalCode || null,
    bank: bank || null,
    nett_amount: nettAmount,
    sales_person: salesPerson || null,
    processed_by: processedBy || null,
    therapist: therapist || null,
    room_number: roomNumber || null,
    duration_minutes: durationMinutes
  }
}

/**
 * Cleans service sales data from Excel
 *
 * @param rawData - Array of raw rows from Excel
 * @param transactionIdMap - Map of SO# to transaction IDs
 * @param customerIdMap - Map of membership# to customer IDs
 * @returns Array of cleaned service sales
 */
export function cleanServiceSalesData(
  rawData: RawServiceSalesRow[],
  transactionIdMap: Map<string, string>,
  customerIdMap: Map<string, string>
): Omit<ServiceSales, 'id' | 'created_at' | 'updated_at'>[] {
  console.log('🧹 Starting Service Sales data cleaning...')
  console.log(`📊 Input: ${rawData.length} raw rows`)
  console.log(`🗺️  Transaction map size: ${transactionIdMap.size}`)
  console.log(`🗺️  Customer map size: ${customerIdMap.size}`)

  const cleanedItems: Omit<ServiceSales, 'id' | 'created_at' | 'updated_at'>[] = []

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

    // Filter out empty rows (where all values are null/empty)
    const values = Object.values(row)
    const hasData = values.some(val => val != null && val !== '')
    if (!hasData) {
      continue // Skip completely empty rows
    }

    // Log progress every 100 rows
    if (i > 0 && i % 100 === 0) {
      console.log(`⏳ Progress: ${i}/${rawData.length} rows processed...`)
    }

    // Extract SO number (check multiple column name variations)
    const soNumber = cleanString(row['Sales #'] || row['SO #'] || row['SO#'] || row['Transaction'])
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
      row['Services'] ||
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

    const cleaned = cleanServiceSalesRow(row, rowValues, transactionIdMap, customerIdMap, i)
    if (cleaned) {
      cleanedItems.push(cleaned)
    } else {
      // Track rejection reasons (already tracked above in inline checks)
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
        console.log(`⏭️  Skipping first 15 rows (headers at rows 16-17, data starts at row 18)`)

        // Get raw data as array (header: 1 means return arrays, not objects)
        const rawArrayData = XLSX.utils.sheet_to_json(worksheet, {
          header: 1, // Return array of arrays
          raw: false, // Return formatted strings
          defval: '' // Default for empty cells
        }) as any[][]

        // Extract headers from rows 16 and 17 (indices 15 and 16)
        const headerRow16 = rawArrayData[15] || []
        const headerRow17 = rawArrayData[16] || []

        // Merge headers: use row 16 if not empty, otherwise use row 17
        const mergedHeaders = headerRow16.map((val, idx) => {
          const h16 = String(val || '').trim()
          const h17 = String(headerRow17[idx] || '').trim()
          return h16 || h17 || `Column_${idx + 1}`
        })

        console.log(`🔍 Merged headers from rows 16-17: ${mergedHeaders.length} columns`)
        console.log(`   First 20 headers:`, mergedHeaders.slice(0, 20))
        console.log(`   Headers 21-37:`, mergedHeaders.slice(20))

        // Convert data rows (starting from row 18, index 17) to objects
        const jsonData = rawArrayData.slice(17).map(row => {
          const obj: any = {}
          mergedHeaders.forEach((header, idx) => {
            obj[header] = row[idx] !== undefined ? String(row[idx]) : ''
          })
          return obj
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
