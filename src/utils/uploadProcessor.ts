import Papa from 'papaparse'
import { parseExcelFile, cleanPaymentData, cleanItemSalesData, type RawPaymentRow, type RawItemRow } from './excelParser'
import { cleanCustomerInfoData, type RawCustomerInfoRow } from './customerInfoCleaner'
import { cleanSalesDetailedData, type RawSalesRow } from './salesDetailedCleaner'
import { cleanServiceSalesData, parseServiceSalesFile, type RawServiceSalesRow, type EnhancedItem } from './serviceSalesCleaner'
import { supabase } from '@/lib/supabase'
import type { Customer, Transaction, Payment, Item } from '@/lib/supabase'

/**
 * Upload Processor
 *
 * This is the main orchestrator for the 5-file upload process:
 * 1. Customer Info CSV
 * 2. Sales Detailed CSV (skipRows: 15)
 * 3. Payment Excel
 * 4. Item Sales Excel (skipRows: 18)
 * 5. Service Sales CSV (skipRows: 15)
 *
 * Features:
 * - Progress tracking with callback
 * - Batch inserts (500 rows per batch)
 * - Customer ID mapping (membership_number → customer_id)
 * - Transaction ID mapping (so_number → transaction_id)
 * - Comprehensive logging with emojis
 * - Error handling with log capture
 * - Metadata saving
 */

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export interface UploadFiles {
  customerInfo: File
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
    transactionsInserted: number
    paymentsInserted: number
    itemsInserted: number
    enhancedItemsInserted: number
  }
  metadata?: {
    uploadId: string
    uploadDate: string
    fileNames: {
      customerInfo: string
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
      beforeFirstChunk: (chunk) => {
        if (skipRows > 0) {
          const lines = chunk.split('\n')
          return lines.slice(skipRows).join('\n')
        }
        return chunk
      },
      complete: (results) => {
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
 */
async function batchInsert<T>(
  tableName: string,
  data: T[],
  batchSize: number = 500
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
    transactionsInserted: 0,
    paymentsInserted: 0,
    itemsInserted: 0,
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

    updateProgress('Parsing Files', 0, 5, 'Starting file parsing...')
    console.log('\n' + '─'.repeat(80))
    console.log('📂 STEP 1: PARSING FILES')
    console.log('─'.repeat(80) + '\n')

    // Parse Customer Info CSV
    updateProgress('Parsing Files', 1, 5, `Parsing ${files.customerInfo.name}...`)
    console.log(`📄 Parsing Customer Info CSV: ${files.customerInfo.name}`)
    const rawCustomerData = await parseCSVFile<RawCustomerInfoRow>(files.customerInfo)
    console.log(`✅ Parsed ${rawCustomerData.length} customer rows\n`)

    // Parse Sales Detailed CSV (skipRows: 15)
    updateProgress('Parsing Files', 2, 5, `Parsing ${files.salesDetailed.name} (skip 15 rows)...`)
    console.log(`📄 Parsing Sales Detailed CSV: ${files.salesDetailed.name}`)
    console.log(`   ⏭️  Skipping first 15 rows (header at row 16)`)
    const rawSalesData = await parseCSVFile<RawSalesRow>(files.salesDetailed, 15)
    console.log(`✅ Parsed ${rawSalesData.length} sales rows\n`)

    // Parse Payment Excel
    updateProgress('Parsing Files', 3, 5, `Parsing ${files.payment.name}...`)
    console.log(`📄 Parsing Payment Excel: ${files.payment.name}`)
    const rawPaymentData = await parseExcelFile(files.payment)
    console.log(`✅ Parsed ${rawPaymentData.length} payment rows\n`)

    // Parse Item Sales Excel (skipRows: 18)
    updateProgress('Parsing Files', 4, 5, `Parsing ${files.itemSales.name} (skip 18 rows)...`)
    console.log(`📄 Parsing Item Sales Excel: ${files.itemSales.name}`)
    console.log(`   ⏭️  Skipping first 18 rows (header at row 19)`)
    const rawItemData = await parseExcelFile(files.itemSales, { skipRows: 18 })
    console.log(`✅ Parsed ${rawItemData.length} item rows\n`)

    // Parse Service Sales CSV (skipRows: 15)
    updateProgress('Parsing Files', 5, 5, `Parsing ${files.serviceSales.name} (skip 15 rows)...`)
    console.log(`📄 Parsing Service Sales CSV: ${files.serviceSales.name}`)
    console.log(`   ⏭️  Skipping first 15 rows (header at row 16)`)
    const rawServiceData = await parseServiceSalesFile(files.serviceSales)
    console.log(`✅ Parsed ${rawServiceData.length} service rows\n`)

    updateProgress('Parsing Files', 5, 5, 'All files parsed successfully')
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

    updateProgress('Deleting Old Data', 0, 5, 'Starting data deletion...')
    console.log('\n' + '─'.repeat(80))
    console.log('🗑️  STEP 3: DELETING OLD DATA')
    console.log('─'.repeat(80) + '\n')

    // Delete in reverse order of foreign key dependencies
    await deleteTableData('enhanced_items')
    updateProgress('Deleting Old Data', 1, 5, 'Deleted enhanced_items')

    await deleteTableData('items')
    updateProgress('Deleting Old Data', 2, 5, 'Deleted items')

    await deleteTableData('payments')
    updateProgress('Deleting Old Data', 3, 5, 'Deleted payments')

    await deleteTableData('transactions')
    updateProgress('Deleting Old Data', 4, 5, 'Deleted transactions')

    await deleteTableData('customers')
    updateProgress('Deleting Old Data', 5, 5, 'Deleted customers')

    console.log('✅ OLD DATA DELETION COMPLETE\n')

    // ========================================================================
    // STEP 4: INSERT CUSTOMERS
    // ========================================================================

    updateProgress('Inserting Customers', 0, 1, 'Inserting customers...')
    console.log('\n' + '─'.repeat(80))
    console.log('👥 STEP 4: INSERTING CUSTOMERS')
    console.log('─'.repeat(80) + '\n')

    const customersInserted = await batchInsert('customers', cleanedCustomers, 500)
    stats.customersInserted = customersInserted

    // Fetch inserted customers to build customerIdMap
    console.log('🗺️  Building customer ID map...')
    const { data: insertedCustomers, error: customerFetchError } = await supabase
      .from('customers')
      .select('id, membership_number')

    if (customerFetchError) {
      throw new Error(`Failed to fetch customers: ${customerFetchError.message}`)
    }

    if (!insertedCustomers || insertedCustomers.length === 0) {
      throw new Error('No customers were inserted')
    }

    // Build customer ID map
    for (const customer of insertedCustomers) {
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
    // STEP 5: CLEAN & INSERT TRANSACTIONS
    // ========================================================================

    updateProgress('Cleaning Data', 2, 5, 'Cleaning transaction data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING TRANSACTION DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Sales Detailed...')
    const cleanedTransactions = cleanSalesDetailedData(rawSalesData, customerIdMap)
    console.log(`✅ Cleaned ${cleanedTransactions.length} transactions\n`)

    updateProgress('Inserting Transactions', 0, 1, 'Inserting transactions...')
    console.log('\n' + '─'.repeat(80))
    console.log('💳 STEP 5: INSERTING TRANSACTIONS')
    console.log('─'.repeat(80) + '\n')

    const transactionsInserted = await batchInsert('transactions', cleanedTransactions, 500)
    stats.transactionsInserted = transactionsInserted

    // Fetch inserted transactions to build transactionIdMap
    console.log('🗺️  Building transaction ID map...')
    const { data: insertedTransactions, error: transactionFetchError } = await supabase
      .from('transactions')
      .select('id, so_number')

    if (transactionFetchError) {
      throw new Error(`Failed to fetch transactions: ${transactionFetchError.message}`)
    }

    if (!insertedTransactions || insertedTransactions.length === 0) {
      throw new Error('No transactions were inserted')
    }

    // Build transaction ID map (so_number → transaction_id)
    const transactionIdMap = new Map<string, string>()
    for (const transaction of insertedTransactions) {
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
    // STEP 6: CLEAN & INSERT PAYMENTS
    // ========================================================================

    updateProgress('Cleaning Data', 3, 5, 'Cleaning payment data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING PAYMENT DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Payments...')
    const cleanedPayments = cleanPaymentData(rawPaymentData as RawPaymentRow[], transactionIdMap)
    console.log(`✅ Cleaned ${cleanedPayments.length} payments\n`)

    updateProgress('Inserting Payments', 0, 1, 'Inserting payments...')
    console.log('\n' + '─'.repeat(80))
    console.log('💰 STEP 6: INSERTING PAYMENTS')
    console.log('─'.repeat(80) + '\n')

    const paymentsInserted = await batchInsert('payments', cleanedPayments, 500)
    stats.paymentsInserted = paymentsInserted

    updateProgress('Inserting Payments', 1, 1, `Inserted ${paymentsInserted} payments`)
    console.log('✅ PAYMENT INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 7: CLEAN & INSERT ITEMS
    // ========================================================================

    updateProgress('Cleaning Data', 4, 5, 'Cleaning item data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING ITEM DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Items...')
    const cleanedItems = cleanItemSalesData(rawItemData as RawItemRow[], transactionIdMap)
    console.log(`✅ Cleaned ${cleanedItems.length} items\n`)

    updateProgress('Inserting Items', 0, 1, 'Inserting items...')
    console.log('\n' + '─'.repeat(80))
    console.log('📦 STEP 7: INSERTING ITEMS')
    console.log('─'.repeat(80) + '\n')

    const itemsInserted = await batchInsert('items', cleanedItems, 500)
    stats.itemsInserted = itemsInserted

    updateProgress('Inserting Items', 1, 1, `Inserted ${itemsInserted} items`)
    console.log('✅ ITEM INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 8: CLEAN & INSERT ENHANCED ITEMS (SERVICE SALES)
    // ========================================================================

    updateProgress('Cleaning Data', 5, 5, 'Cleaning service sales data...')
    console.log('\n' + '─'.repeat(80))
    console.log('🧹 CLEANING SERVICE SALES DATA')
    console.log('─'.repeat(80) + '\n')

    console.log('🧹 Cleaning Service Sales...')
    const cleanedEnhancedItems = cleanServiceSalesData(rawServiceData, transactionIdMap)
    console.log(`✅ Cleaned ${cleanedEnhancedItems.length} enhanced items\n`)

    updateProgress('Inserting Enhanced Items', 0, 1, 'Inserting enhanced items...')
    console.log('\n' + '─'.repeat(80))
    console.log('✨ STEP 8: INSERTING ENHANCED ITEMS')
    console.log('─'.repeat(80) + '\n')

    const enhancedItemsInserted = await batchInsert('enhanced_items', cleanedEnhancedItems, 500)
    stats.enhancedItemsInserted = enhancedItemsInserted

    updateProgress('Inserting Enhanced Items', 1, 1, `Inserted ${enhancedItemsInserted} enhanced items`)
    console.log('✅ ENHANCED ITEM INSERTION COMPLETE\n')

    // ========================================================================
    // STEP 9: SAVE METADATA
    // ========================================================================

    updateProgress('Saving Metadata', 0, 1, 'Saving upload metadata...')
    console.log('\n' + '─'.repeat(80))
    console.log('💾 STEP 9: SAVING METADATA')
    console.log('─'.repeat(80) + '\n')

    const fileNames = {
      customerInfo: files.customerInfo.name,
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
    console.log(`   💳 Transactions Inserted: ${stats.transactionsInserted}`)
    console.log(`   💰 Payments Inserted: ${stats.paymentsInserted}`)
    console.log(`   📦 Items Inserted: ${stats.itemsInserted}`)
    console.log(`   ✨ Enhanced Items Inserted: ${stats.enhancedItemsInserted}`)
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
