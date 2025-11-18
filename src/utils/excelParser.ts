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

        // Special handling for Item Sales which has split headers (rows 17-18)
        const isItemSales = file.name.toLowerCase().includes('item') || file.name.toLowerCase().includes('sales')

        if (isItemSales && options?.skipRows === 16) {
          console.log(`⏭️  Detected Item Sales file - using split header parsing (rows 17-18)`)

          // Get raw data as array
          const rawArrayData = XLSX.utils.sheet_to_json(worksheet, {
            header: 1, // Return array of arrays
            raw: false, // Return formatted strings
            defval: '' // Default for empty cells
          }) as any[][]

          // Extract headers from rows 17 and 18 (indices 16 and 17)
          const headerRow17 = rawArrayData[16] || []
          const headerRow18 = rawArrayData[17] || []

          // Merge headers: use row 17 if not empty, otherwise use row 18
          const mergedHeaders = headerRow17.map((val, idx) => {
            const h17 = String(val || '').trim()
            const h18 = String(headerRow18[idx] || '').trim()
            return h17 || h18 || `Column_${idx + 1}`
          })

          console.log(`🔍 Merged headers from rows 17-18: ${mergedHeaders.length} columns`)
          console.log(`   First 15 headers:`, mergedHeaders.slice(0, 15))
          console.log(`   Headers 16-35:`, mergedHeaders.slice(15, 35))

          // Convert data rows (starting from row 19, index 18) to objects
          const jsonData = rawArrayData.slice(18).map(row => {
            const obj: any = {}
            mergedHeaders.forEach((header, idx) => {
              obj[header] = row[idx] !== undefined ? String(row[idx]) : ''
            })
            return obj
          })

          console.log(`Parsed Excel file: ${file.name}, rows: ${jsonData.length}`)
          resolve(jsonData)
        } else {
          // Original parsing logic for other files
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
        }
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
  // Try multiple column name variations for SO number
  const soNumber = (
    raw['Sales #'] ||
    raw['SO #'] ||
    raw['SO#'] ||
    raw['Transaction']
  )?.toString().trim()

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

  // Try multiple column names for total price, including split header columns
  const totalPrice = cleanMonetaryValue(
    raw['Payment to date'] ||  // Split header (row 18) - column AE
    raw['Payment to Date'] ||
    raw['Total'] ||
    raw['Total Price'] ||
    raw['Nett'] ||
    raw['Net']
  )

  // Extract sales person from column AL (38th column)
  const salesPerson = (
    raw['Sales Person'] ||
    raw['Beautician'] ||
    raw['Staff'] ||
    raw['Therapist'] ||
    ''
  ).toString().trim() || null

  return {
    transaction_id: transactionId,
    item_name: itemName,
    quantity: quantity,
    unit_price: unitPrice,
    total_price: totalPrice || (unitPrice * quantity),
    category: raw['Category']?.toString().trim() || raw['Type']?.toString().trim() || null,
    sale_date: parseExcelDate(raw['Date']),
    sales_person: salesPerson
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
      'Sales #': rawData[0]['Sales #'],
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
  let emptyRowsSkipped = 0

  for (const row of rawData) {
    // Filter out empty rows (where all values are null/empty)
    const values = Object.values(row)
    const hasData = values.some(val => val != null && val !== '')
    if (!hasData) {
      emptyRowsSkipped++
      continue
    }

    // Try multiple column name variations for SO number
    const soNumber = (
      row['Sales #'] ||
      row['SO #'] ||
      row['SO#'] ||
      row['Transaction']
    )?.toString().trim()

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
  console.log(`   ⏭️  Empty rows skipped: ${emptyRowsSkipped}`)
  console.log(`   ❌ No SO#: ${rejectedNoSO}`)
  console.log(`   ❌ Transaction not found: ${rejectedNoTransaction}`)
  console.log(`   ❌ No item name: ${rejectedNoItemName}`)

  return cleanedItems
}
