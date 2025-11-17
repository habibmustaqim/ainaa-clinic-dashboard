import Papa from 'papaparse'
import { parseExcelFile, cleanPaymentData, cleanItemSalesData, type RawPaymentRow, type RawItemRow } from './excelParser'
import { cleanCustomerInfoData, type RawCustomerInfoRow } from './customerInfoCleaner'
import { cleanSalesDetailedData, type RawSalesRow } from './salesDetailedCleaner'
import { cleanServiceSalesData, parseServiceSalesFile, type RawServiceSalesRow } from './serviceSalesCleaner'
import { cleanVisitFrequencyData, type RawVisitFrequencyRow } from './visitFrequencyCleaner'
import { supabase } from '@/lib/supabase'
import type { Customer, Transaction, Payment, Item, CustomerVisitFrequency, ServiceSales } from '@/lib/supabase'

/**
 * Upload Processor
 *
 * This is the main orchestrator for the 6-file upload process:
 * 1. Customer Info CSV (no skip)
 * 2. Customer Visit Frequency CSV (no skip)
 * 3. Sales Detailed CSV (skipRows: 15)
 * 4. Payment Excel (skipRows: 11)
 * 5. Item Sales Excel (skipRows: 16)
 * 6. Service Sales CSV (skipRows: 15)
 *
 * Features:
 * - Progress tracking with callback
 * - Batch inserts (500 rows per batch)
 * - Customer ID mapping (membership_number → customer_id)
 * - Transaction ID mapping (so_number → transaction_id)
 * - Comprehensive logging with emojis
 * - Error handling with log capture
 * - Metadata saving
 * - Visit frequency aggregation
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UploadFiles {
  customerInfo: File
  visitFrequency: File
  salesDetailed: File
  payment: File
  itemSales: File
  serviceSales: File
}

export interface UploadProgress {
  step: string
  current: number
  total: number
  percentage: number
  message: string
}

export type ProgressCallback = (progress: UploadProgress) => void

export interface UploadResult {
  success: boolean
  message: string
  stats: {
    customersInserted: number
    visitFrequencyInserted: number
    transactionsInserted: number
    paymentsInserted: number
    itemsInserted: number
    serviceSalesInserted: number
    enhancedItemsInserted: number
  }
  metadata?: {
    uploadId: string
    uploadDate: string
    fileNames: {
      customerInfo: string
      visitFrequency: string
      salesDetailed: string
      payment: string
      itemSales: string
      serviceSales: string
    }
  }
  errors?: string[]
}

// ============================================================================
// LOG CAPTURE
// ============================================================================

let logBuffer: string[] = []
let isCapturing = false
const originalConsoleLog = console.log
const originalConsoleWarn = console.warn
const originalConsoleError = console.error

/**
 * Start capturing console logs
 */
export function startLogCapture(): void {
  if (isCapturing) return

  logBuffer = []
  isCapturing = true

  console.log = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    logBuffer.push(`[LOG] ${new Date().toISOString()} - ${message}`)
    originalConsoleLog.apply(console, args)
  }

  console.warn = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    logBuffer.push(`[WARN] ${new Date().toISOString()} - ${message}`)
    originalConsoleWarn.apply(console, args)
  }

  console.error = (...args: any[]) => {
    const message = args.map(arg =>
      typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
    ).join(' ')
    logBuffer.push(`[ERROR] ${new Date().toISOString()} - ${message}`)
    originalConsoleError.apply(console, args)
  }

  console.log('📝 Log capture started')
}

/**
 * Stop capturing console logs
 */
export function stopLogCapture(): void {
  if (!isCapturing) return

  isCapturing = false
  console.log = originalConsoleLog
  console.warn = originalConsoleWarn
  console.error = originalConsoleError

  originalConsoleLog('📝 Log capture stopped')
}

/**
 * Download captured logs as a file
 */
export function downloadUploadLogs(): void {
  if (logBuffer.length === 0) {
    alert('No logs to download')
    return
  }

  const logContent = logBuffer.join('\n')
  const blob = new Blob([logContent], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)

  const link = document.createElement('a')
  link.href = url
  link.download = `upload-logs-${new Date().toISOString().replace(/[:.]/g, '-')}.txt`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  URL.revokeObjectURL(url)
  console.log('📥 Logs downloaded successfully')
}

/**
 * Get current log buffer
 */
export function getLogBuffer(): string[] {
  return [...logBuffer]
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Parse CSV file with optional row skipping
 */
async function parseCSVFile<T>(file: File, skipRows: number = 0): Promise<T[]> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      preview: skipRows > 0 ? undefined : undefined,
      transformHeader: (header: string) => {
        // Remove BOM (Byte Order Mark) if present and trim whitespace
        return header.replace(/^\uFEFF/, '').trim()
      },
      beforeFirstChunk: (chunk) => {
        if (skipRows > 0) {
          const lines = chunk.split('\n')
          return lines.slice(skipRows).join('\n')
        }
        return chunk
      },
      complete: (results) => {
        console.log(`📄 Parsed ${results.data.length} rows from ${file.name}`)
        resolve(results.data as T[])
      },
      error: (error) => {
        reject(error)
      }
    })
  })
}

/**
 * Batch insert helper
 * Optimized with larger batch size for faster uploads
 */
async function batchInsert<T>(
  tableName: string,
  data: T[],
  batchSize: number = 1000  // Optimized batch size - balances speed with reliability
): Promise<number> {
  if (data.length === 0) {
    console.log(`⏭️  No data to insert into ${tableName}`)
    return 0
  }

  console.log(`📤 Starting batch insert into ${tableName}: ${data.length} rows, ${Math.ceil(data.length / batchSize)} batches`)

  let totalInserted = 0

  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize)
    const batchNum = Math.floor(i / batchSize) + 1
    const totalBatches = Math.ceil(data.length / batchSize)

    console.log(`   📦 Inserting batch ${batchNum}/${totalBatches} (${batch.length} rows)...`)

    const { error, count } = await supabase
      .from(tableName)
      .insert(batch)
      .select('*', { count: 'exact', head: true })

    if (error) {
      // Check if error is because table doesn't exist
      if (error.message?.includes('Could not find the table') ||
          error.message?.includes('relation') && error.message?.includes('does not exist') ||
          error.code === 'PGRST116' ||
          error.code === '42P01') {
        console.log(`⚠️  Table ${tableName} does not exist - skipping insert`)
        console.log(`   ℹ️  Please run the SQL migration script to create this table`)
        return 0 // Return 0 rows inserted
      }

      console.error(`❌ Error inserting batch ${batchNum}:`, error)
      throw new Error(`Failed to insert batch ${batchNum} into ${tableName}: ${error.message}`)
    }

    totalInserted += batch.length
    console.log(`   ✅ Batch ${batchNum}/${totalBatches} inserted successfully`)
  }

  console.log(`✅ Completed batch insert into ${tableName}: ${totalInserted} rows inserted`)
  return totalInserted
}

/**
 * Delete all data from a table
 */
async function deleteTableData(tableName: string): Promise<void> {
  console.log(`🗑️  Deleting all data from ${tableName}...`)

  const { error } = await supabase
    .from(tableName)
    .delete()
    .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all rows (hack to bypass RLS)

  if (error) {
    // Check if error is because table doesn't exist
    // Supabase returns specific error codes for missing tables
    if (error.message?.includes('Could not find the table') ||
        error.message?.includes('relation') && error.message?.includes('does not exist') ||
        error.code === 'PGRST116' ||
        error.code === '42P01') {
      console.log(`⚠️  Table ${tableName} does not exist yet - skipping deletion`)
      return // Continue without throwing error
    }

    // For other errors, still throw
    console.error(`❌ Error deleting data from ${tableName}:`, error)
    throw new Error(`Failed to delete data from ${tableName}: ${error.message}`)
  }

  console.log(`✅ All data deleted from ${tableName}`)
}

/**
 * Save upload metadata
 */
async function saveUploadMetadata(
  uploadId: string,
  fileNames: Record<string, string>,
  stats: UploadResult['stats']
): Promise<void> {
  console.log('💾 Saving upload metadata...')

  const metadata = {
    upload_id: uploadId,
    upload_date: new Date().toISOString(),
    file_names: fileNames,
    stats: stats,
    uploaded_by: 'system' // You can replace this with actual user info
  }

  const { error } = await supabase
    .from('upload_metadata')
    .insert(metadata)

  if (error) {
    console.warn('⚠️ Failed to save upload metadata (table may not exist):', error.message)
    // Don't throw - this is optional
    return
  }

  console.log('✅ Upload metadata saved successfully')
}

// ============================================================================
// MAIN UPLOAD PROCESSOR
// ============================================================================

/**
 * Main upload processor function
 *
 * Orchestrates the entire 5-file upload process with the following steps:
 * 1. Parse all files
 * 2. Clean all data
 * 3. Delete old data from database
 * 4. Insert customers
 * 5. Insert transactions
 * 6. Insert payments
 * 7. Insert items
 * 8. Insert enhanced items (service sales)
 * 9. Save upload metadata
 *
 * @param files - The 5 files to upload
 * @param onProgress - Progress callback function
 * @returns Upload result with statistics
 */
export async function processAndUploadData(
  files: UploadFiles,
  onProgress?: ProgressCallback
): Promise<UploadResult> {
  const uploadId = `upload-${Date.now()}`
  const errors: string[] = []

  console.log('\n'.repeat(3))
  console.log('=' .repeat(80))
  console.log('🚀 UPLOAD PROCESSOR STARTED')
  console.log('=' .repeat(80))
  console.log(`📋 Upload ID: ${uploadId}`)
  console.log(`📅 Upload Date: ${new Date().toISOString()}`)
  console.log('\n')

  const stats = {
    customersInserted: 0,
    visitFrequencyInserted: 0,
    transactionsInserted: 0,
    paymentsInserted: 0,
    itemsInserted: 0,
    serviceSalesInserted: 0,
    enhancedItemsInserted: 0
  }

  const updateProgress = (step: string, current: number, total: number, message: string) => {
    const percentage = total > 0 ? Math.round((current / total) * 100) : 0
    console.log(`📊 Progress: ${step} - ${current}/${total} (${percentage}%) - ${message}`)
    onProgress?.({
      step,
      current,
      total,
      percentage,
      message
    })
  }

  try {
    // ========================================================================
    // STEP 1: PARSE FILES
    // ========================================================================

    updateProgress('Parsing Files', 0, 6, 'Starting file parsing...')
    console.log('\n' + '─'.repeat(80))
    console.log('📂 STEP 1: PARSING FILES')
    console.log('─'.repeat(80) + '\n')

    // Parse Customer Info CSV (no skip)
    updateProgress('Parsing Files', 1, 6, `Parsing ${files.customerInfo.name}...`)
    console.log(`📄 Parsing Customer Info CSV: ${files.customerInfo.name}`)
    const rawCustomerData = await parseCSVFile<RawCustomerInfoRow>(files.customerInfo)
    console.log(`✅ Parsed ${rawCustomerData.length} customer rows\n`)

    // Parse Customer Visit Frequency CSV (no skip)
    updateProgress('Parsing Files', 2, 6, `Parsing ${files.visitFrequency.name}...`)
    console.log(`📄 Parsing Customer Visit Frequency CSV: ${files.visitFrequency.name}`)
    const rawVisitData = await parseCSVFile<RawVisitFrequencyRow>(files.visitFrequency)
    console.log(`✅ Parsed ${rawVisitData.length} visit frequency rows\n`)

    // Parse Sales Detailed CSV (skipRows: 15)
    updateProgress('Parsing Files', 3, 6, `Parsing ${files.salesDetailed.name} (skip 15 rows)...`)
    console.log(`📄 Parsing Sales Detailed CSV: ${files.salesDetailed.name}`)
    console.log(`   ⏭️  Skipping first 15 rows (header at row 16)`)
    const rawSalesData = await parseCSVFile<RawSalesRow>(files.salesDetailed, 15)
    console.log(`✅ Parsed ${rawSalesData.length} sales rows\n`)

    // Parse Payment Excel (skipRows: 11)
    updateProgress('Parsing Files', 4, 6, `Parsing ${files.payment.name} (skip 11 rows)...`)
    console.log(`📄 Parsing Payment Excel: ${files.payment.name}`)
    console.log(`   ⏭️  Skipping first 11 rows (header at row 12)`)
    const rawPaymentData = await parseExcelFile(files.payment, { skipRows: 11 })
    console.log(`✅ Parsed ${rawPaymentData.length} payment rows\n`)

    // Parse Item Sales Excel (skipRows: 16)
    updateProgress('Parsing Files', 5, 6, `Parsing ${files.itemSales.name} (skip 16 rows)...`)
    console.log(`📄 Parsing Item Sales Excel: ${files.itemSales.name}`)
    console.log(`   ⏭️  Skipping first 16 rows (header at row 17)`)
    const rawItemData = await parseExcelFile(files.itemSales, { skipRows: 16 })
    console.log(`✅ Parsed ${rawItemData.length} item rows\n`)

    // Parse Service Sales CSV (skipRows: 15)
    updateProgress('Parsing Files', 6, 6, `Parsing ${files.serviceSales.name} (skip 15 rows)...`)
    console.log(`📄 Parsing Service Sales CSV: ${files.serviceSales.name}`)
    console.log(`   ⏭️  Skipping first 15 rows (header at row 16)`)
    const rawServiceData = await parseServiceSalesFile(files.serviceSales)
    console.log(`✅ Parsed ${rawServiceData.length} service rows\n`)

    updateProgress('Parsing Files', 6, 6, 'All files parsed successfully')
    console.log('✅ FILE PARSING COMPLETE\n')

    // ========================================================================
    // STEP 2: CLEAN DATA
    // ========================================================================

    updateProgress('Cleaning Data', 0, 5, 'Starting data cleaning...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 STEP 2: CLEANING DATA')
    console.log('─'.repeat(80) + '\n')

    // Clean Customer Info
    updateProgress('Cleaning Data', 1, 5, 'Cleaning customer data...')
    console.log('🧹 Cleaning Customer Info...')
    const cleanedCustomers = cleanCustomerInfoData(rawCustomerData)
    console.log(`✅ Cleaned ${cleanedCustomers.length} customers\n`)

    // Create customer ID map (membership_number → customer_id)
    // We'll create this after inserting customers
    const customerIdMap = new Map<string, string>()

    // We need to insert customers first to get IDs for the map
    // So we'll do a preliminary insert here
    console.log('💾 Pre-inserting customers to generate IDs...')

    // ========================================================================
    // STEP 3: DELETE OLD DATA
    // ========================================================================

    updateProgress('Deleting Old Data', 0, 8, 'Starting data deletion...')
    console.log('\n' + '─'.repeat(80))
    console.log('🗑️  STEP 3: DELETING OLD DATA')
    console.log('─'.repeat(80) + '\n')

    // Delete in reverse order of foreign key dependencies
    await deleteTableData('service_sales')
    updateProgress('Deleting Old Data', 1, 8, 'Deleted service_sales')

    await deleteTableData('enhanced_items')
    updateProgress('Deleting Old Data', 2, 8, 'Deleted enhanced_items')

    await deleteTableData('items')
    updateProgress('Deleting Old Data', 3, 8, 'Deleted items')

    await deleteTableData('payments')
    updateProgress('Deleting Old Data', 4, 8, 'Deleted payments')

    await deleteTableData('transactions')
    updateProgress('Deleting Old Data', 5, 8, 'Deleted transactions')

    await deleteTableData('customer_visit_frequency')
    updateProgress('Deleting Old Data', 6, 8, 'Deleted customer_visit_frequency')

    await deleteTableData('customers')
    updateProgress('Deleting Old Data', 7, 8, 'Deleted customers')

    updateProgress('Deleting Old Data', 8, 8, 'All old data deleted')

    console.log('✅ OLD DATA DELETION COMPLETE\n')

    // ========================================================================
    // STEP 4: INSERT CUSTOMERS
    // ========================================================================

    updateProgress('Inserting Customers', 0, 1, 'Inserting customers...')
    console.log('\n' + '─'.repeat(80))
    console.log('👥 STEP 4: INSERTING CUSTOMERS')
    console.log('─'.repeat(80) + '\n')

    const customersInserted = await batchInsert('customers', cleanedCustomers)  // Uses default 2000
    stats.customersInserted = customersInserted

    // Fetch inserted customers to build customerIdMap
    console.log('🗺️  Building customer ID map...')
    console.log('🔧 Fetching ALL customers using range() - optimized pagination')

    // Optimize: Increased page size from 1000 to 2000 for faster fetching
    let allCustomers: Array<{ id: string; membership_number: string }> = []
    let pageSize = 1000  // Optimized pagination size
    let start = 0
    let hasMore = true

    while (hasMore) {
      const { data: customerPage, error: customerFetchError } = await supabase
        .from('customers')
        .select('id, membership_number')
        .range(start, start + pageSize - 1)

      if (customerFetchError) {
        throw new Error(`Failed to fetch customers: ${customerFetchError.message}`)
      }

      if (!customerPage || customerPage.length === 0) {
        hasMore = false
      } else {
        allCustomers = allCustomers.concat(customerPage)
        console.log(`   📄 Fetched page: ${allCustomers.length} customers so far...`)

        if (customerPage.length < pageSize) {
          hasMore = false // Last page
        } else {
          start += pageSize
        }
      }
    }

    if (allCustomers.length === 0) {
      throw new Error('No customers were inserted')
    }

    console.log(`✅ Fetched total ${allCustomers.length} customers from database`)

    // Build customer ID map
    for (const customer of allCustomers) {
      customerIdMap.set(customer.membership_number, customer.id)
    }

    console.log(`✅ Customer ID map built: ${customerIdMap.size} mappings`)
    console.log(`   Sample mappings:`, Array.from(customerIdMap.entries()).slice(0, 3).map(([mem, id]) =>
      `${mem} → ${id.substring(0, 8)}...`
    ))
    console.log('\n')

    updateProgress('Inserting Customers', 1, 1, `Inserted ${customersInserted} customers`)
    console.log('✅ CUSTOMER INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 5: INSERT CUSTOMER VISIT FREQUENCY
    // ========================================================================

    updateProgress('Cleaning Data', 2, 6, 'Cleaning visit frequency data...')
    console.log('\n' + '─'.repeat(80))
    console.log('📊 STEP 5: INSERTING CUSTOMER VISIT FREQUENCY')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Visit Frequency Data...')
    const cleanedVisitFrequency = cleanVisitFrequencyData(rawVisitData, customerIdMap)
    console.log(`✅ Cleaned ${cleanedVisitFrequency.length} visit frequency records\n`)

    updateProgress('Inserting Visit Frequency', 0, 1, 'Inserting visit frequency data...')
    const visitFrequencyInserted = await batchInsert('customer_visit_frequency', cleanedVisitFrequency)  // Uses default 2000
    stats.visitFrequencyInserted = visitFrequencyInserted

    updateProgress('Inserting Visit Frequency', 1, 1, `Inserted ${visitFrequencyInserted} visit frequency records`)
    console.log('✅ VISIT FREQUENCY INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 6: CLEAN & INSERT TRANSACTIONS
    // ========================================================================

    updateProgress('Cleaning Data', 3, 6, 'Cleaning transaction data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING TRANSACTION DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Sales Detailed...')
    const cleanedTransactions = cleanSalesDetailedData(rawSalesData, customerIdMap)
    console.log(`✅ Cleaned ${cleanedTransactions.length} transactions\n`)

    updateProgress('Inserting Transactions', 0, 1, 'Inserting transactions...')
    console.log('\n' + '─'.repeat(80))
    console.log('💳 STEP 6: INSERTING TRANSACTIONS')
    console.log('─'.repeat(80) + '\n')

    const transactionsInserted = await batchInsert('transactions', cleanedTransactions)  // Uses default 2000
    stats.transactionsInserted = transactionsInserted

    // Fetch inserted transactions to build transactionIdMap
    console.log('🗺️  Building transaction ID map...')
    console.log('🔧 Fetching ALL transactions using range() - optimized pagination')

    // Optimize: Using larger page size for faster fetching
    let allTransactions: Array<{ id: string; so_number: string }> = []
    pageSize = 1000  // Reuse optimized page size
    start = 0
    hasMore = true

    while (hasMore) {
      const { data: transactionPage, error: transactionFetchError } = await supabase
        .from('transactions')
        .select('id, so_number')
        .range(start, start + pageSize - 1)

      if (transactionFetchError) {
        throw new Error(`Failed to fetch transactions: ${transactionFetchError.message}`)
      }

      if (!transactionPage || transactionPage.length === 0) {
        hasMore = false
      } else {
        allTransactions = allTransactions.concat(transactionPage)
        console.log(`   📄 Fetched page: ${allTransactions.length} transactions so far...`)

        if (transactionPage.length < pageSize) {
          hasMore = false // Last page
        } else {
          start += pageSize
        }
      }
    }

    if (allTransactions.length === 0) {
      throw new Error('No transactions were inserted')
    }

    console.log(`✅ Fetched total ${allTransactions.length} transactions from database`)

    // Build transaction ID map (so_number → transaction_id)
    const transactionIdMap = new Map<string, string>()
    for (const transaction of allTransactions) {
      transactionIdMap.set(transaction.so_number, transaction.id)
    }

    console.log(`✅ Transaction ID map built: ${transactionIdMap.size} mappings`)
    console.log(`   Sample mappings:`, Array.from(transactionIdMap.entries()).slice(0, 3).map(([so, id]) =>
      `${so} → ${id.substring(0, 8)}...`
    ))
    console.log('\n')

    updateProgress('Inserting Transactions', 1, 1, `Inserted ${transactionsInserted} transactions`)
    console.log('✅ TRANSACTION INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 7: CLEAN & INSERT PAYMENTS
    // ========================================================================

    updateProgress('Cleaning Data', 4, 6, 'Cleaning payment data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING PAYMENT DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Payments...')
    const cleanedPayments = cleanPaymentData(rawPaymentData as RawPaymentRow[], transactionIdMap)
    console.log(`✅ Cleaned ${cleanedPayments.length} payments\n`)

    updateProgress('Inserting Payments', 0, 1, 'Inserting payments...')
    console.log('\n' + '─'.repeat(80))
    console.log('💰 STEP 7: INSERTING PAYMENTS')
    console.log('─'.repeat(80) + '\n')

    const paymentsInserted = await batchInsert('payments', cleanedPayments)  // Uses default 2000
    stats.paymentsInserted = paymentsInserted

    updateProgress('Inserting Payments', 1, 1, `Inserted ${paymentsInserted} payments`)
    console.log('✅ PAYMENT INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 8: CLEAN & INSERT ITEMS
    // ========================================================================

    updateProgress('Cleaning Data', 5, 6, 'Cleaning item data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING ITEM DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Items...')
    const cleanedItems = cleanItemSalesData(rawItemData as RawItemRow[], transactionIdMap)
    console.log(`✅ Cleaned ${cleanedItems.length} items\n`)

    updateProgress('Inserting Items', 0, 1, 'Inserting items...')
    console.log('\n' + '─'.repeat(80))
    console.log('📦 STEP 8: INSERTING ITEMS')
    console.log('─'.repeat(80) + '\n')

    const itemsInserted = await batchInsert('items', cleanedItems, 500)
    stats.itemsInserted = itemsInserted

    updateProgress('Inserting Items', 1, 1, `Inserted ${itemsInserted} items`)
    console.log('✅ ITEM INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 9: CLEAN & INSERT SERVICE SALES
    // ========================================================================

    updateProgress('Cleaning Data', 6, 6, 'Cleaning service sales data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING SERVICE SALES DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Service Sales...')
    const cleanedServiceSales = cleanServiceSalesData(rawServiceData, transactionIdMap, customerIdMap)
    console.log(`✅ Cleaned ${cleanedServiceSales.length} service sales\n`)

    updateProgress('Inserting Service Sales', 0, 1, 'Inserting service sales...')
    console.log('\n' + '─'.repeat(80))
    console.log('✨ STEP 9: INSERTING SERVICE SALES')
    console.log('─'.repeat(80) + '\n')

    // Insert into service_sales table
    const serviceSalesInserted = await batchInsert('service_sales', cleanedServiceSales, 500)
    stats.serviceSalesInserted = serviceSalesInserted
    stats.enhancedItemsInserted = 0 // No longer using enhanced_items table

    updateProgress('Inserting Service Sales', 1, 1, `Inserted ${serviceSalesInserted} service sales`)
    console.log('✅ SERVICE SALES INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 10: SAVE METADATA
    // ========================================================================

    updateProgress('Saving Metadata', 0, 1, 'Saving upload metadata...')
    console.log('\n' + '─'.repeat(80))
    console.log('💾 STEP 10: SAVING METADATA')
    console.log('─'.repeat(80) + '\n')

    const fileNames = {
      customerInfo: files.customerInfo.name,
      visitFrequency: files.visitFrequency.name,
      salesDetailed: files.salesDetailed.name,
      payment: files.payment.name,
      itemSales: files.itemSales.name,
      serviceSales: files.serviceSales.name
    }

    await saveUploadMetadata(uploadId, fileNames, stats)

    updateProgress('Saving Metadata', 1, 1, 'Metadata saved successfully')
    console.log('✅ METADATA SAVE COMPLETE\n')

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================

    console.log('\n' + '='.repeat(80))
    console.log('🎉 UPLOAD PROCESSOR COMPLETED SUCCESSFULLY')
    console.log('='.repeat(80))
    console.log('\n📊 FINAL STATISTICS:')
    console.log(`   👥 Customers Inserted: ${stats.customersInserted}`)
    console.log(`   📊 Visit Frequency Inserted: ${stats.visitFrequencyInserted}`)
    console.log(`   💳 Transactions Inserted: ${stats.transactionsInserted}`)
    console.log(`   💰 Payments Inserted: ${stats.paymentsInserted}`)
    console.log(`   🔧 Services (Products): ${stats.itemsInserted}`)
    console.log(`   🏥 Service Sales Inserted: ${stats.serviceSalesInserted}`)
    console.log(`   📈 Total Records: ${Object.values(stats).reduce((a, b) => a + b, 0)}`)
    console.log('\n' + '='.repeat(80) + '\n')

    return {
      success: true,
      message: 'Upload completed successfully',
      stats,
      metadata: {
        uploadId,
        uploadDate: new Date().toISOString(),
        fileNames
      }
    }

  } catch (error) {
    console.error('\n' + '='.repeat(80))
    console.error('❌ UPLOAD PROCESSOR FAILED')
    console.error('='.repeat(80))
    console.error('Error:', error)
    console.error('='.repeat(80) + '\n')

    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
    errors.push(errorMessage)

    return {
      success: false,
      message: `Upload failed: ${errorMessage}`,
      stats,
      errors
    }
  }
}
