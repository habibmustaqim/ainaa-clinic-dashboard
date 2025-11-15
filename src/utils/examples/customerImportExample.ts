/**
 * Example: Import Customer Information
 *
 * This example demonstrates how to import customer data from an Excel/CSV file
 * and insert it into the Supabase database.
 */

import { parseExcelFile } from '../excelParser'
import { cleanCustomerInfoData, createCustomerMap, RawCustomerInfoRow } from '../customerInfoCleaner'
import { supabase } from '@/lib/supabase'

/**
 * Import customers from an Excel file
 */
export async function importCustomersFromExcel(file: File): Promise<number> {
  try {
    console.log('Starting customer import...')

    // Step 1: Parse the Excel file
    console.log('Parsing Excel file:', file.name)
    const rawData: RawCustomerInfoRow[] = await parseExcelFile(file, {
      skipRows: 0 // Set to 1 if file has a header row to skip
    })

    console.log(`Parsed ${rawData.length} rows from Excel`)

    // Step 2: Clean and validate the data
    console.log('Cleaning and validating customer data...')
    const cleanedCustomers = cleanCustomerInfoData(rawData)

    if (cleanedCustomers.length === 0) {
      throw new Error('No valid customers found in file')
    }

    console.log(`Successfully cleaned ${cleanedCustomers.length} customers`)

    // Step 3: Insert into database using upsert
    // This will insert new customers and update existing ones
    console.log('Inserting customers into database...')
    const { data, error } = await supabase
      .from('customers')
      .upsert(cleanedCustomers, {
        onConflict: 'membership_number', // Use membership_number as unique key
        ignoreDuplicates: false // Update existing records
      })
      .select()

    if (error) {
      console.error('Database error:', error)
      throw error
    }

    console.log(`Successfully imported ${cleanedCustomers.length} customers`)
    return cleanedCustomers.length

  } catch (error) {
    console.error('Error importing customers:', error)
    throw error
  }
}

/**
 * Example: Manual data cleaning (without file upload)
 */
export function exampleManualCleaning() {
  // Example raw data
  const rawData: RawCustomerInfoRow[] = [
    {
      'Membership Number': 'M001',
      'Customer Name': 'Ahmad bin Abdullah',
      'Contact Number': '012-345 6789',
      'Email': 'ahmad@example.com',
      'Address': '123 Jalan Merdeka',
      'City': 'Kuala Lumpur',
      'State': 'KL',
      'Postcode': '50000',
      'Country': 'Malaysia',
      'Date of Birth': '15/01/1990',
      'Registration Date': '01/06/2023'
    },
    {
      'Membership Number': 'M002',
      'Customer Name': 'Siti binti Hassan',
      'Contact Number': '+60198765432',
      'Email': 'siti@example.com',
      'Address': '456 Jalan Raja',
      'City': 'Petaling Jaya',
      'State': 'SGR',
      'Postcode': '47400',
      'Date of Birth': '20/03/1995',
      'Registration Date': '15/07/2023'
    },
    {
      'Membership Number': 'M003',
      'Customer Name': 'Kumar a/l Rajan',
      'Contact Number': '03-2234 5678',
      'Email': 'kumar@example.com',
      'Address': '789 Jalan Ampang',
      'City': 'Kuala Lumpur',
      'State': 'WP',
      'Postcode': '50450',
      'Date of Birth': '10/11/1988',
      'Registration Date': '20/08/2023'
    }
  ]

  // Clean the data
  const cleanedCustomers = cleanCustomerInfoData(rawData)

  console.log('Cleaned customers:', cleanedCustomers)

  // Expected output:
  // [
  //   {
  //     membership_number: 'M001',
  //     name: 'Ahmad bin Abdullah',
  //     gender: 'Male', // Auto-detected from 'bin'
  //     contact_number: '0123456789',
  //     email: 'ahmad@example.com',
  //     address: '123 Jalan Merdeka',
  //     city: 'Kuala Lumpur',
  //     state: 'Kuala Lumpur', // Expanded from 'KL'
  //     postcode: '50000',
  //     country: 'Malaysia',
  //     date_of_birth: '1990-01-15',
  //     registration_date: '2023-06-01',
  //     total_spending: 0,
  //     visit_count: 0,
  //     last_visit_date: null
  //   },
  //   {
  //     membership_number: 'M002',
  //     name: 'Siti binti Hassan',
  //     gender: 'Female', // Auto-detected from 'binti'
  //     contact_number: '0198765432',
  //     email: 'siti@example.com',
  //     address: '456 Jalan Raja',
  //     city: 'Petaling Jaya',
  //     state: 'Selangor', // Expanded from 'SGR'
  //     postcode: '47400',
  //     country: 'Malaysia',
  //     date_of_birth: '1995-03-20',
  //     registration_date: '2023-07-15',
  //     total_spending: 0,
  //     visit_count: 0,
  //     last_visit_date: null
  //   },
  //   {
  //     membership_number: 'M003',
  //     name: 'Kumar a/l Rajan',
  //     gender: 'Male', // Auto-detected from 'a/l'
  //     contact_number: '0322345678',
  //     email: 'kumar@example.com',
  //     address: '789 Jalan Ampang',
  //     city: 'Kuala Lumpur',
  //     state: 'Wilayah Persekutuan', // Expanded from 'WP'
  //     postcode: '50450',
  //     country: 'Malaysia',
  //     date_of_birth: '1988-11-10',
  //     registration_date: '2023-08-20',
  //     total_spending: 0,
  //     visit_count: 0,
  //     last_visit_date: null
  //   }
  // ]

  return cleanedCustomers
}

/**
 * Example: Creating a customer lookup map
 */
export async function exampleCustomerLookup() {
  // Fetch all customers from database
  const { data: customers, error } = await supabase
    .from('customers')
    .select('*')

  if (error) throw error

  // Create a map for quick lookup by membership number
  const customerMap = createCustomerMap(customers || [])

  // Look up a customer
  const customer = customerMap.get('M001')
  console.log('Found customer:', customer)

  return customerMap
}

/**
 * Example: Update customer statistics after importing transactions
 */
export async function updateCustomerStatistics(membershipNumber: string) {
  try {
    // Get customer
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id')
      .eq('membership_number', membershipNumber)
      .single()

    if (customerError) throw customerError

    // Calculate total spending and visit count from transactions
    const { data: transactions, error: transError } = await supabase
      .from('transactions')
      .select('total_amount, transaction_date')
      .eq('customer_id', customer.id)
      .eq('is_cancelled', false)

    if (transError) throw transError

    const totalSpending = transactions?.reduce((sum, t) => sum + t.total_amount, 0) || 0
    const visitCount = transactions?.length || 0
    const lastVisitDate = transactions && transactions.length > 0
      ? transactions.sort((a, b) =>
          new Date(b.transaction_date || 0).getTime() - new Date(a.transaction_date || 0).getTime()
        )[0].transaction_date
      : null

    // Update customer
    const { error: updateError } = await supabase
      .from('customers')
      .update({
        total_spending: totalSpending,
        visit_count: visitCount,
        last_visit_date: lastVisitDate
      })
      .eq('id', customer.id)

    if (updateError) throw updateError

    console.log(`Updated statistics for ${membershipNumber}:`)
    console.log(`- Total Spending: RM ${totalSpending.toFixed(2)}`)
    console.log(`- Visit Count: ${visitCount}`)
    console.log(`- Last Visit: ${lastVisitDate}`)

  } catch (error) {
    console.error('Error updating customer statistics:', error)
    throw error
  }
}

/**
 * Example: Batch update all customer statistics
 */
export async function batchUpdateAllCustomerStatistics() {
  try {
    console.log('Fetching all customers...')
    const { data: customers, error: customerError } = await supabase
      .from('customers')
      .select('id, membership_number')

    if (customerError) throw customerError

    console.log(`Updating statistics for ${customers?.length || 0} customers...`)

    for (const customer of customers || []) {
      await updateCustomerStatistics(customer.membership_number)
    }

    console.log('Finished updating all customer statistics')

  } catch (error) {
    console.error('Error in batch update:', error)
    throw error
  }
}
