import { CustomerVisitFrequency } from '@/lib/supabase'

/**
 * Interface for raw customer visit frequency data from CSV
 * Based on actual Customer Visit Frequency report structure from Aoikumo clinic system
 */
export interface RawVisitFrequencyRow {
  // Customer identification
  'Customer'?: string
  'Consultant'?: string
  'Age'?: string | number
  'Membership #'?: string
  'Contact #1'?: string
  'Contact #2'?: string
  'Identification #'?: string // IC Number
  'Email Address'?: string

  // Address fields
  'Address 1'?: string
  'Address 2'?: string
  'Address 3'?: string
  'Country'?: string
  'State'?: string
  'City'?: string
  'Postcode'?: string

  // Visit timestamps
  'Created Date'?: string
  'Created Time'?: string
  'Last Visit Date (Completed Appointments)'?: string
  'Last Visit Time (Completed Appointments)'?: string

  // Financial metrics
  'Total Spent'?: string | number
  'Spent for Period'?: string | number

  // Transaction metrics
  'Transaction #'?: string | number
  'Last Visit Action'?: string

  // Visit frequency metrics
  'Average Visit/week'?: string | number
  'Average Visit/month'?: string | number
  'Average Visit/year'?: string | number
  'Total Visits (Completed Appointments)'?: string | number

  // Monthly breakdown (specific months)
  'Total Visits (October 2025)'?: string | number
  'Total Visits (September 2025)'?: string | number
  'Total Visits (August 2025)'?: string | number
  'Total Visits (July 2025)'?: string | number
  'Total Visits (June 2025)'?: string | number
  'Total Visits (May 2025)'?: string | number
  'Total Visits (April 2025)'?: string | number
  'Total Visits (March 2025)'?: string | number
  'Total Visits (February 2025)'?: string | number
  'Total Visits (January 2025)'?: string | number
  'Total Visits (December 2024)'?: string | number
  'Total Visits (November 2024)'?: string | number

  [key: string]: any
}

/**
 * Clean string value
 */
function cleanString(value: string | undefined): string | null {
  if (!value || value === '' || value === '-' || value === 'N/A') return null
  return value.trim()
}

/**
 * Clean monetary value
 */
function cleanMonetaryValue(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return value

  try {
    // Remove currency symbols and commas
    const cleaned = value.toString()
      .replace(/[RM$,\s]/g, '')
      .replace(/^-$/, '0')
    const num = parseFloat(cleaned)
    return isNaN(num) ? 0 : num
  } catch (e) {
    return 0
  }
}

/**
 * Parse numeric value
 */
function parseNumeric(value: string | number | undefined): number {
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
 * Parse integer value
 */
function parseInteger(value: string | number | undefined): number {
  if (value === undefined || value === null || value === '') return 0
  if (typeof value === 'number') return Math.floor(value)

  try {
    const cleaned = value.toString().replace(/[,\s]/g, '')
    const num = parseInt(cleaned)
    return isNaN(num) ? 0 : num
  } catch (e) {
    return 0
  }
}

/**
 * Parse date string
 */
function parseDate(value: string | undefined): string | null {
  if (!value || value === '' || value === '-') return null

  try {
    // Handle DD/MM/YYYY format
    if (value.includes('/')) {
      const parts = value.split('/')
      if (parts.length === 3) {
        const [day, month, year] = parts
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
      }
    }

    // Handle YYYY-MM-DD format (already ISO)
    if (value.includes('-') && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      return value.split(' ')[0] // Remove time part if present
    }

    // Try to parse as date
    const date = new Date(value)
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0]
    }

    return null
  } catch {
    return null
  }
}

/**
 * Parse time string
 */
function parseTime(value: string | undefined): string | null {
  if (!value || value === '' || value === '-') return null

  try {
    // Extract time part if date-time string
    if (value.includes(' ')) {
      const parts = value.split(' ')
      return parts[parts.length - 1]
    }

    // Return as-is if it's already in HH:MM:SS format
    if (value.match(/^\d{1,2}:\d{2}(:\d{2})?$/)) {
      return value
    }

    return null
  } catch {
    return null
  }
}

/**
 * Clean a single visit frequency row
 */
export function cleanVisitFrequencyRow(
  raw: RawVisitFrequencyRow,
  customerIdMap: Map<string, string>
): Omit<CustomerVisitFrequency, 'id' | 'created_at' | 'updated_at'> | null {
  // Extract membership number (required)
  const membershipNumber = cleanString(raw['Membership #'])
  if (!membershipNumber) {
    console.warn('Visit frequency row missing Membership #, skipping')
    return null
  }

  // Get customer ID from map
  const customerId = customerIdMap.get(membershipNumber)
  if (!customerId) {
    console.warn(`Customer ID not found for Membership #: ${membershipNumber}`)
    return null
  }

  // Parse dates and times
  const lastVisitDate = parseDate(raw['Last Visit Date (Completed Appointments)'])
  const lastVisitTime = parseTime(raw['Last Visit Time (Completed Appointments)'])
  const firstVisitDate = parseDate(raw['Created Date'])

  // Calculate customer lifetime days
  let customerLifetimeDays = 0
  if (firstVisitDate && lastVisitDate) {
    const first = new Date(firstVisitDate)
    const last = new Date(lastVisitDate)
    customerLifetimeDays = Math.floor((last.getTime() - first.getTime()) / (1000 * 60 * 60 * 24))
  }

  // Parse financial metrics
  const totalSpent = cleanMonetaryValue(raw['Total Spent'])
  const spentForPeriod = cleanMonetaryValue(raw['Spent for Period'])

  // Parse visit metrics
  const totalVisits = parseInteger(raw['Total Visits (Completed Appointments)'])
  const avgVisitWeek = parseNumeric(raw['Average Visit/week'])
  const avgVisitMonth = parseNumeric(raw['Average Visit/month'])
  const avgVisitYear = parseNumeric(raw['Average Visit/year'])

  // Calculate average transaction value
  const averageTransactionValue = totalVisits > 0 ? totalSpent / totalVisits : 0

  // Parse monthly visit breakdown
  const visitsOct2025 = parseInteger(raw['Total Visits (October 2025)'])
  const visitsSep2025 = parseInteger(raw['Total Visits (September 2025)'])
  const visitsAug2025 = parseInteger(raw['Total Visits (August 2025)'])
  const visitsJul2025 = parseInteger(raw['Total Visits (July 2025)'])
  const visitsJun2025 = parseInteger(raw['Total Visits (June 2025)'])
  const visitsMay2025 = parseInteger(raw['Total Visits (May 2025)'])
  const visitsApr2025 = parseInteger(raw['Total Visits (April 2025)'])
  const visitsMar2025 = parseInteger(raw['Total Visits (March 2025)'])
  const visitsFeb2025 = parseInteger(raw['Total Visits (February 2025)'])
  const visitsJan2025 = parseInteger(raw['Total Visits (January 2025)'])
  const visitsDec2024 = parseInteger(raw['Total Visits (December 2024)'])
  const visitsNov2024 = parseInteger(raw['Total Visits (November 2024)'])

  // Determine segmentation flags
  const today = new Date()
  const lastVisit = lastVisitDate ? new Date(lastVisitDate) : null
  const daysSinceLastVisit = lastVisit ? Math.floor((today.getTime() - lastVisit.getTime()) / (1000 * 60 * 60 * 24)) : 999

  const isActive = daysSinceLastVisit <= 180
  const isAtRisk = daysSinceLastVisit > 90 && daysSinceLastVisit <= 180
  const isDormant = daysSinceLastVisit > 180
  const isVip = totalSpent >= 10000 // VIP if spent RM 10,000 or more

  return {
    customer_id: customerId,
    membership_number: membershipNumber,
    consultant: cleanString(raw['Consultant']),

    // Spending metrics
    total_spent: totalSpent,
    spent_for_period: spentForPeriod,

    // Visit metrics
    total_visits: totalVisits,
    avg_visit_week: avgVisitWeek,
    avg_visit_month: avgVisitMonth,
    avg_visit_year: avgVisitYear,

    // Transaction tracking
    transaction_count: parseInteger(raw['Transaction #']),

    // Last activity
    last_visit_action: cleanString(raw['Last Visit Action']),
    last_visit_date: lastVisitDate,
    last_visit_time: lastVisitTime,

    // Monthly visit breakdown
    visits_oct_2025: visitsOct2025,
    visits_sep_2025: visitsSep2025,
    visits_aug_2025: visitsAug2025,
    visits_jul_2025: visitsJul2025,
    visits_jun_2025: visitsJun2025,
    visits_may_2025: visitsMay2025,
    visits_apr_2025: visitsApr2025,
    visits_mar_2025: visitsMar2025,
    visits_feb_2025: visitsFeb2025,
    visits_jan_2025: visitsJan2025,
    visits_dec_2024: visitsDec2024,
    visits_nov_2024: visitsNov2024,

    // Derived metrics
    first_visit_date: firstVisitDate,
    customer_lifetime_days: customerLifetimeDays,
    average_transaction_value: averageTransactionValue,

    // Segmentation
    is_active: isActive,
    is_vip: isVip,
    is_at_risk: isAtRisk,
    is_dormant: isDormant
  }
}

/**
 * Clean visit frequency data from CSV
 */
export function cleanVisitFrequencyData(
  rawData: RawVisitFrequencyRow[],
  customerIdMap: Map<string, string>
): Omit<CustomerVisitFrequency, 'id' | 'created_at' | 'updated_at'>[] {
  const cleanedRecords: Omit<CustomerVisitFrequency, 'id' | 'created_at' | 'updated_at'>[] = []
  let skippedCount = 0
  let noCustomerCount = 0

  for (const row of rawData) {
    const cleaned = cleanVisitFrequencyRow(row, customerIdMap)
    if (cleaned) {
      cleanedRecords.push(cleaned)
    } else {
      // Check if skipped due to missing customer ID
      const membershipNumber = cleanString(row['Membership #'])
      if (membershipNumber && !customerIdMap.has(membershipNumber)) {
        noCustomerCount++
      } else {
        skippedCount++
      }
    }
  }

  console.log(`✅ Cleaned ${cleanedRecords.length} visit frequency records from ${rawData.length} raw rows`)
  if (skippedCount > 0) {
    console.log(`⚠️ Skipped ${skippedCount} invalid rows`)
  }
  if (noCustomerCount > 0) {
    console.log(`⚠️ ${noCustomerCount} rows skipped due to customer not found`)
  }

  // Log statistics
  const vipCount = cleanedRecords.filter(r => r.is_vip).length
  const activeCount = cleanedRecords.filter(r => r.is_active).length
  const atRiskCount = cleanedRecords.filter(r => r.is_at_risk).length
  const dormantCount = cleanedRecords.filter(r => r.is_dormant).length

  const totalRevenue = cleanedRecords.reduce((sum, r) => sum + r.total_spent, 0)
  const avgSpending = cleanedRecords.length > 0 ? totalRevenue / cleanedRecords.length : 0

  console.log(`📊 Visit Frequency Statistics:`)
  console.log(`   VIP Customers: ${vipCount}`)
  console.log(`   Active Customers: ${activeCount}`)
  console.log(`   At-Risk Customers: ${atRiskCount}`)
  console.log(`   Dormant Customers: ${dormantCount}`)
  console.log(`   Total Revenue: RM ${totalRevenue.toFixed(2)}`)
  console.log(`   Average Spending: RM ${avgSpending.toFixed(2)}`)

  return cleanedRecords
}

/**
 * Update customer spending metrics from visit frequency data
 * This updates the Customer table with aggregated spending and visit data
 */
export function createCustomerUpdateMap(
  visitFrequencyData: Omit<CustomerVisitFrequency, 'id' | 'created_at' | 'updated_at'>[]
): Map<string, { total_spending: number; visit_count: number }> {
  const updateMap = new Map<string, { total_spending: number; visit_count: number }>()

  for (const record of visitFrequencyData) {
    if (record.customer_id) {
      updateMap.set(record.customer_id, {
        total_spending: record.total_spent,
        visit_count: record.total_visits
      })
    }
  }

  console.log(`📋 Created customer update map with ${updateMap.size} entries`)
  return updateMap
}