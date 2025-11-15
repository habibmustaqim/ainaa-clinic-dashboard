import * as XLSX from 'xlsx'
import { Customer } from '@/lib/supabase'
import { detectGender } from './genderDetector'

/**
 * Interface for raw customer info data from CSV/Excel
 * Matches the expected columns from the customer information export
 */
export interface RawCustomerInfoRow {
  'Membership Number'?: string | number
  'Customer Name'?: string
  'Name'?: string
  'Gender'?: string
  'Contact Number'?: string
  'Phone'?: string
  'Mobile'?: string
  'Email'?: string
  'Email Address'?: string
  'Address'?: string
  'Full Address'?: string
  'Address Line 1'?: string
  'Address Line 2'?: string
  'City'?: string
  'State'?: string
  'Postcode'?: string
  'Postal Code'?: string
  'Zip Code'?: string
  'Country'?: string
  'Date of Birth'?: string | number
  'DOB'?: string | number
  'Birth Date'?: string | number
  'Registration Date'?: string | number
  'Member Since'?: string | number
  'Join Date'?: string | number
  [key: string]: any
}

/**
 * Validates and cleans email address
 */
function cleanEmail(email: string | undefined | null): string | null {
  if (!email || typeof email !== 'string') return null

  const cleaned = email.trim().toLowerCase()

  // Basic email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

  if (!emailRegex.test(cleaned)) {
    return null
  }

  // Filter out invalid/placeholder emails
  const invalidPatterns = [
    'noemail',
    'no-email',
    'no_email',
    'test@test',
    'example@example',
    'dummy@dummy',
    'na@na',
    'none@none',
    'null@null'
  ]

  if (invalidPatterns.some(pattern => cleaned.includes(pattern))) {
    return null
  }

  return cleaned
}

/**
 * Cleans Malaysian phone number
 * Removes spaces, hyphens, and standardizes format
 */
function cleanPhoneNumber(phone: string | number | undefined | null): string | null {
  if (!phone) return null

  let cleaned = phone.toString().trim()

  // Remove common separators
  cleaned = cleaned.replace(/[\s\-()]/g, '')

  // Remove any non-digit characters except leading +
  cleaned = cleaned.replace(/[^\d+]/g, '')

  // Handle Malaysian phone number formats
  if (cleaned.startsWith('+60')) {
    // Already in international format
    cleaned = cleaned.replace('+60', '0')
  } else if (cleaned.startsWith('60')) {
    // International format without +
    cleaned = '0' + cleaned.substring(2)
  } else if (cleaned.startsWith('00')) {
    // Alternative international format
    cleaned = '0' + cleaned.substring(4)
  }

  // Validate Malaysian phone number patterns
  // Mobile: 01X-XXXXXXX or 01X-XXXXXXXX (10-11 digits starting with 01)
  // Landline: 0X-XXXXXXX or 0X-XXXXXXXX (9-10 digits starting with 0)
  if (cleaned.startsWith('01')) {
    // Mobile number
    if (cleaned.length >= 10 && cleaned.length <= 11) {
      return cleaned
    }
  } else if (cleaned.startsWith('0')) {
    // Landline
    if (cleaned.length >= 9 && cleaned.length <= 10) {
      return cleaned
    }
  }

  // If validation fails but we have a number starting with 0, return it anyway
  if (cleaned.startsWith('0') && cleaned.length >= 9) {
    return cleaned
  }

  return null
}

/**
 * Parse date from Excel or string format
 * Handles Excel serial dates and common date string formats
 */
function parseDate(value: any): string | null {
  if (!value) return null

  try {
    // If it's an Excel serial date number
    if (typeof value === 'number') {
      const date = XLSX.SSF.parse_date_code(value)
      if (date) {
        // Return in YYYY-MM-DD format
        return `${date.y}-${String(date.m).padStart(2, '0')}-${String(date.d).padStart(2, '0')}`
      }
    }

    // If it's a string date
    if (typeof value === 'string') {
      const cleaned = value.trim()

      // Handle DD/MM/YYYY format (common in Malaysian exports)
      if (cleaned.match(/^\d{1,2}\/\d{1,2}\/\d{4}$/)) {
        const parts = cleaned.split('/')
        if (parts.length === 3) {
          const [day, month, year] = parts
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }

      // Handle DD-MM-YYYY format
      if (cleaned.match(/^\d{1,2}-\d{1,2}-\d{4}$/)) {
        const parts = cleaned.split('-')
        if (parts.length === 3) {
          const [day, month, year] = parts
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }

      // Handle YYYY-MM-DD format (ISO)
      if (cleaned.match(/^\d{4}-\d{1,2}-\d{1,2}$/)) {
        const parts = cleaned.split('-')
        if (parts.length === 3) {
          const [year, month, day] = parts
          return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`
        }
      }

      // Try parsing as ISO date
      const date = new Date(cleaned)
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0]
      }
    }

    return null
  } catch (e) {
    console.warn('Error parsing date:', value, e)
    return null
  }
}

/**
 * Parse and clean Malaysian address
 * Extracts address components from a full address string
 */
interface AddressComponents {
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string
}

function parseAddress(
  addressLine1: string | undefined,
  addressLine2: string | undefined,
  city: string | undefined,
  state: string | undefined,
  postcode: string | undefined,
  country: string | undefined
): AddressComponents {
  const components: AddressComponents = {
    address: null,
    city: null,
    state: null,
    postcode: null,
    country: 'Malaysia' // Default to Malaysia
  }

  // Combine address lines
  const addressParts: string[] = []
  if (addressLine1?.trim()) addressParts.push(addressLine1.trim())
  if (addressLine2?.trim()) addressParts.push(addressLine2.trim())

  if (addressParts.length > 0) {
    components.address = addressParts.join(', ')
  }

  // Clean city
  if (city?.trim()) {
    components.city = city.trim()
  }

  // Clean and standardize state
  if (state?.trim()) {
    const cleanedState = state.trim()
    // Map common abbreviations to full state names
    const stateMap: Record<string, string> = {
      'KL': 'Kuala Lumpur',
      'WP': 'Wilayah Persekutuan',
      'JHR': 'Johor',
      'KDH': 'Kedah',
      'KTN': 'Kelantan',
      'MLK': 'Melaka',
      'NS': 'Negeri Sembilan',
      'PHG': 'Pahang',
      'PNG': 'Penang',
      'PRK': 'Perak',
      'PLS': 'Perlis',
      'SBH': 'Sabah',
      'SGR': 'Selangor',
      'SWK': 'Sarawak',
      'TRG': 'Terengganu'
    }

    components.state = stateMap[cleanedState.toUpperCase()] || cleanedState
  }

  // Clean postcode
  if (postcode?.toString().trim()) {
    let cleanedPostcode = postcode.toString().trim().replace(/\s/g, '')
    // Malaysian postcodes are 5 digits
    if (cleanedPostcode.length === 5 && /^\d+$/.test(cleanedPostcode)) {
      components.postcode = cleanedPostcode
    }
  }

  // Clean country
  if (country?.trim()) {
    components.country = country.trim()
  }

  return components
}

/**
 * Cleans a single customer info row
 */
export function cleanCustomerInfoRow(
  raw: RawCustomerInfoRow
): Omit<Customer, 'id' | 'created_at'> | null {
  // Extract membership number (required field)
  const membershipNumber = (
    raw['Membership Number'] ||
    raw['Member Number'] ||
    raw['Member ID'] ||
    ''
  ).toString().trim()

  if (!membershipNumber) {
    return null
  }

  // Extract customer name (required field)
  const customerName = (
    raw['Customer Name'] ||
    raw['Name'] ||
    raw['Full Name'] ||
    ''
  ).toString().trim()

  if (!customerName) {
    return null
  }

  // Extract gender (or detect from name)
  let gender = raw['Gender']?.toString().trim() || null

  // Standardize gender values
  if (gender) {
    const genderLower = gender.toLowerCase()
    if (genderLower === 'm' || genderLower === 'male' || genderLower === 'lelaki') {
      gender = 'Male'
    } else if (genderLower === 'f' || genderLower === 'female' || genderLower === 'perempuan') {
      gender = 'Female'
    } else {
      gender = null
    }
  }

  // If gender not provided or invalid, try to detect from name
  if (!gender) {
    gender = detectGender(customerName)
  }

  // Extract and clean contact number
  const contactNumber = cleanPhoneNumber(
    raw['Contact Number'] ||
    raw['Phone'] ||
    raw['Mobile'] ||
    raw['Phone Number'] ||
    raw['Mobile Number']
  )

  // Extract and clean email
  const email = cleanEmail(
    raw['Email'] ||
    raw['Email Address'] ||
    raw['E-mail']
  )

  // Parse address components
  const addressComponents = parseAddress(
    raw['Address'] || raw['Address Line 1'] || raw['Full Address'],
    raw['Address Line 2'],
    raw['City'],
    raw['State'],
    raw['Postcode'] || raw['Postal Code'] || raw['Zip Code'],
    raw['Country']
  )

  // Parse dates
  const dateOfBirth = parseDate(
    raw['Date of Birth'] ||
    raw['DOB'] ||
    raw['Birth Date'] ||
    raw['Birthdate']
  )

  const registrationDate = parseDate(
    raw['Registration Date'] ||
    raw['Member Since'] ||
    raw['Join Date'] ||
    raw['Created Date'] ||
    raw['Signup Date']
  )

  // Parse last visit date if available
  const lastVisitDate = parseDate(
    raw['Last Visit'] ||
    raw['Last Visit Date'] ||
    raw['Last Transaction Date']
  )

  return {
    membership_number: membershipNumber,
    name: customerName,
    gender: gender,
    contact_number: contactNumber,
    email: email,
    address: addressComponents.address,
    city: addressComponents.city,
    state: addressComponents.state,
    postcode: addressComponents.postcode,
    country: addressComponents.country,
    date_of_birth: dateOfBirth,
    registration_date: registrationDate,
    total_spending: 0, // Will be calculated from transactions
    visit_count: 0, // Will be calculated from transactions
    last_visit_date: lastVisitDate
  }
}

/**
 * Cleans customer info data from CSV/Excel
 * @param rawData - Array of raw customer info rows
 * @returns Array of cleaned customer records
 */
export function cleanCustomerInfoData(
  rawData: RawCustomerInfoRow[]
): Omit<Customer, 'id' | 'created_at'>[] {
  const cleanedCustomers: Omit<Customer, 'id' | 'created_at'>[] = []
  const membershipNumbers = new Set<string>()

  // Track rejections for debugging
  let rejectedNoMembership = 0
  let rejectedNoName = 0
  let rejectedDuplicate = 0

  // DEBUG: Log first row to see actual structure
  if (rawData.length > 0) {
    console.log('DEBUG: First customer row keys:', Object.keys(rawData[0]).slice(0, 15))
    console.log('DEBUG: First customer row sample:', {
      'Membership Number': rawData[0]['Membership Number'],
      'Customer Name': rawData[0]['Customer Name'],
      'Name': rawData[0]['Name'],
      'Contact Number': rawData[0]['Contact Number'],
      'Email': rawData[0]['Email']
    })
  }

  for (const row of rawData) {
    const membershipNumber = (
      row['Membership Number'] ||
      row['Member Number'] ||
      row['Member ID'] ||
      ''
    ).toString().trim()

    if (!membershipNumber) {
      rejectedNoMembership++
      continue
    }

    // Check for duplicates
    if (membershipNumbers.has(membershipNumber)) {
      rejectedDuplicate++
      console.warn(`Duplicate membership number found: ${membershipNumber}`)
      continue
    }

    const customerName = (
      row['Customer Name'] ||
      row['Name'] ||
      row['Full Name'] ||
      ''
    ).toString().trim()

    if (!customerName) {
      rejectedNoName++
      continue
    }

    const cleaned = cleanCustomerInfoRow(row)
    if (cleaned) {
      cleanedCustomers.push(cleaned)
      membershipNumbers.add(membershipNumber)
    }
  }

  console.log(`Cleaned ${cleanedCustomers.length} customers from ${rawData.length} raw rows`)
  console.log(`Customer rejection breakdown:`)
  console.log(`   No membership number: ${rejectedNoMembership}`)
  console.log(`   No customer name: ${rejectedNoName}`)
  console.log(`   Duplicate membership: ${rejectedDuplicate}`)

  return cleanedCustomers
}

/**
 * Helper function to get customer by membership number
 * Useful for linking transactions to customers
 */
export function createCustomerMap(
  customers: Omit<Customer, 'id' | 'created_at'>[]
): Map<string, Omit<Customer, 'id' | 'created_at'>> {
  const customerMap = new Map<string, Omit<Customer, 'id' | 'created_at'>>()

  for (const customer of customers) {
    customerMap.set(customer.membership_number, customer)
  }

  return customerMap
}
