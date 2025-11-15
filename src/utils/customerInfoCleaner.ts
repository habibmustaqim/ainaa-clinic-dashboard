import * as XLSX from 'xlsx'
import { Customer } from '@/lib/supabase'
import { detectGender } from './genderDetector'

/**
 * Interface for raw customer info data from CSV
 * Based on actual Customer Info Listing report structure from Aoikumo clinic system
 */
export interface RawCustomerInfoRow {
  // Main identifiers (from actual file)
  'Date'?: string
  'Time'?: string
  'Last Visit Date'?: string
  'Last Visit Time'?: string
  'Customer'?: string
  'Membership #'?: string
  'Contact #1'?: string
  'Contact #2'?: string
  'Identification #'?: string // IC Number
  'E-Mail'?: string
  'Consultant'?: string
  'Outlet'?: string
  'Membership Type'?: string
  'Occupation'?: string
  'Birth Date'?: string
  'Age'?: string | number
  'Address 1'?: string
  'Address 2'?: string
  'Address 3'?: string
  'Country'?: string
  'State'?: string
  'City'?: string
  'Postcode'?: string
  'Smoker?'?: string
  'Drug Allergies'?: string
  'Current Illness / Medical Condition'?: string
  'Patient Tag'?: string
  'Alert / Known Allergies'?: string
  'Department'?: string
  'Employee #'?: string
  'Payee Origin'?: string
  'Coverage Payors & Policies'?: string
  'Race'?: string
  'Religion'?: string
  'Income Range Per Year'?: string
  'Marital Status'?: string
  'Preferred Language'?: string
  'Referrer'?: string
  'Referrer Contact'?: string
  'Referrer Relationship'?: string
  'System Notifications'?: string
  'Promotional Notifications'?: string
  'VIP'?: string
  'Deceased'?: string

  // Legacy field names (for compatibility)
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
  'Postal Code'?: string
  'Zip Code'?: string
  'Date of Birth'?: string | number
  'DOB'?: string | number
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
 * Parse boolean values from string
 */
function parseBoolean(value: string | undefined, defaultValue: boolean = false): boolean {
  if (!value) return defaultValue
  const cleaned = value.toString().trim().toLowerCase()
  return cleaned === 'yes' || cleaned === 'y' || cleaned === 'true' || cleaned === '1'
}

/**
 * Parse age from string or number
 */
function parseAge(value: string | number | undefined): number | null {
  if (!value || value === '' || value === '-') return null
  const num = typeof value === 'number' ? value : parseInt(value.toString())
  return isNaN(num) ? null : num
}

/**
 * Parse time string
 */
function parseTime(value: string | undefined): string | null {
  if (!value || value === '' || value === '-') return null
  // Return as-is if it's already in HH:MM:SS format
  return value.trim()
}

/**
 * Cleans a single customer info row
 * Updated to handle actual Customer Info Listing file structure with IC number
 */
export function cleanCustomerInfoRow(
  raw: RawCustomerInfoRow
): Omit<Customer, 'id' | 'created_at'> | null {
  // Extract membership number - PRIMARY KEY (required field)
  const membershipNumber = (
    raw['Membership #'] ||
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
    raw['Customer'] ||
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

  // Extract IC Number (IMPORTANT - secondary identifier)
  const icNumber = (raw['Identification #'] || '').toString().trim() || null

  // Extract and clean contact numbers
  const contactNumber1 = cleanPhoneNumber(
    raw['Contact #1'] ||
    raw['Contact Number'] ||
    raw['Phone'] ||
    raw['Mobile']
  )

  const contactNumber2 = cleanPhoneNumber(raw['Contact #2'])

  // Extract and clean email
  const email = cleanEmail(
    raw['E-Mail'] ||
    raw['Email'] ||
    raw['Email Address']
  )

  // Parse address components (handle multiple address fields)
  const addressComponents = parseAddress(
    raw['Address 1'] || raw['Address'] || raw['Address Line 1'],
    raw['Address 2'] || raw['Address Line 2'],
    raw['City'],
    raw['State'],
    raw['Postcode'] || raw['Postal Code'] || raw['Zip Code'],
    raw['Country']
  )

  // Extract age
  const age = parseAge(raw['Age'])

  // Parse dates
  const dateOfBirth = parseDate(
    raw['Birth Date'] ||
    raw['Date of Birth'] ||
    raw['DOB'] ||
    raw['Birth Date'] ||
    raw['Birthdate']
  )

  // Parse all dates
  const registrationDate = parseDate(raw['Date'])
  const lastVisitDate = parseDate(raw['Last Visit Date'])
  const createdTime = parseTime(raw['Time'])
  const lastVisitTime = parseTime(raw['Last Visit Time'])

  // Extract additional address field
  const address3 = (raw['Address 3'] || '').toString().trim() || null

  // Clean string fields
  const cleanString = (val: any): string | null => {
    if (!val || val === '' || val === '-' || val === 'N/A') return null
    return val.toString().trim()
  }

  return {
    membership_number: membershipNumber,
    name: customerName,
    email: email,
    phone: contactNumber1,
    phone2: contactNumber2,

    // IC and Demographics
    ic_number: icNumber,
    age: age,
    birth_date: dateOfBirth,
    gender: gender,
    marital_status: cleanString(raw['Marital Status']),
    occupation: cleanString(raw['Occupation']),
    income_range: cleanString(raw['Income Range Per Year']),
    race: cleanString(raw['Race']),
    religion: cleanString(raw['Religion']),
    preferred_language: cleanString(raw['Preferred Language']),

    // Medical Information
    drug_allergies: cleanString(raw['Drug Allergies']),
    medical_conditions: cleanString(raw['Current Illness / Medical Condition']),
    alerts: cleanString(raw['Alert / Known Allergies']),
    smoker: parseBoolean(raw['Smoker?']),
    patient_tag: cleanString(raw['Patient Tag']),

    // Address
    address: addressComponents.address,
    address2: cleanString(raw['Address 2']),
    address3: address3,
    city: addressComponents.city,
    state: addressComponents.state,
    postcode: addressComponents.postcode,
    country: addressComponents.country,

    // Membership Information
    membership_type: cleanString(raw['Membership Type']) || 'BRONZE',
    consultant: cleanString(raw['Consultant']),
    outlet: cleanString(raw['Outlet']),
    vip: parseBoolean(raw['VIP']),
    deceased: parseBoolean(raw['Deceased']),
    department: cleanString(raw['Department']),
    employee_number: cleanString(raw['Employee #']),
    payee_origin: cleanString(raw['Payee Origin']),
    coverage_policies: cleanString(raw['Coverage Payors & Policies']),

    // Referral Information
    referrer: cleanString(raw['Referrer']),
    referrer_contact: cleanString(raw['Referrer Contact']),
    referrer_relationship: cleanString(raw['Referrer Relationship']),

    // Preferences
    system_notifications: parseBoolean(raw['System Notifications'], true),
    promotional_notifications: parseBoolean(raw['Promotional Notifications'], true),

    // Timestamps
    created_date: registrationDate,
    created_time: createdTime,
    last_visit_date: lastVisitDate,
    last_visit_time: lastVisitTime,
    registration_date: registrationDate,

    // Legacy fields for compatibility
    date_of_birth: dateOfBirth,
    contact_number: contactNumber1,
    total_spending: 0, // Will be updated from visit frequency
    visit_count: 0 // Will be updated from visit frequency
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
