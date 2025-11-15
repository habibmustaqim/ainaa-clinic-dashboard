# Customer Info Cleaner Utility

This utility provides functions to clean and validate customer information data imported from CSV or Excel files.

## Files

- **customerInfoCleaner.ts** - Main customer data cleaning and validation
- **genderDetector.ts** - Malaysian name-based gender detection utility

## Features

### Customer Info Cleaner

#### Data Cleaning
- **Phone Number Cleaning**: Removes spaces, hyphens, and standardizes Malaysian phone formats
  - Handles formats: `012-345 6789`, `+60123456789`, `60123456789`
  - Validates mobile (10-11 digits starting with 01) and landline (9-10 digits)

- **Email Validation**:
  - Validates email format
  - Converts to lowercase
  - Filters out placeholder/invalid emails (noemail, test@test, etc.)

- **Date Parsing**:
  - Excel serial dates
  - DD/MM/YYYY format (Malaysian standard)
  - DD-MM-YYYY format
  - YYYY-MM-DD format (ISO)

- **Address Parsing**:
  - Combines address line 1 and 2
  - Extracts city, state, postcode, country
  - Maps Malaysian state abbreviations to full names (KL → Kuala Lumpur, etc.)
  - Validates 5-digit Malaysian postcodes

#### Malaysian State Mapping

The utility automatically converts common state abbreviations:

```typescript
KL  → Kuala Lumpur
WP  → Wilayah Persekutuan
JHR → Johor
KDH → Kedah
KTN → Kelantan
MLK → Melaka
NS  → Negeri Sembilan
PHG → Pahang
PNG → Penang
PRK → Perak
PLS → Perlis
SBH → Sabah
SGR → Selangor
SWK → Sarawak
TRG → Terengganu
```

### Gender Detector

Detects gender from Malaysian names using:

1. **Titles**: Mr, Mrs, Ms, Encik, Puan, Cik, Haji, Hajah
2. **Malay Patterns**:
   - `bin` (son of) → Male
   - `binti`, `bte`, `bt` (daughter of) → Female
3. **Indian Patterns**:
   - `a/l`, `al` (anak lelaki) → Male
   - `a/p`, `ap` (anak perempuan) → Female
4. **Common Names**: Database of Malaysian, Chinese, and Indian names

## Usage

### Basic Usage

```typescript
import { cleanCustomerInfoData, cleanCustomerInfoRow } from '@/utils/customerInfoCleaner'
import { parseExcelFile } from '@/utils/excelParser'

// Parse Excel file
const rawData = await parseExcelFile(file, { skipRows: 0 })

// Clean customer data
const cleanedCustomers = cleanCustomerInfoData(rawData)

// Insert into database
for (const customer of cleanedCustomers) {
  const { data, error } = await supabase
    .from('customers')
    .insert(customer)
}
```

### Single Row Cleaning

```typescript
const rawRow: RawCustomerInfoRow = {
  'Membership Number': 'M001',
  'Customer Name': 'Ahmad bin Abdullah',
  'Contact Number': '012-345 6789',
  'Email': 'ahmad@example.com',
  'Address': '123 Jalan Merdeka',
  'City': 'Kuala Lumpur',
  'State': 'KL',
  'Postcode': '50000',
  'Date of Birth': '15/01/1990',
  'Registration Date': '01/06/2023'
}

const cleaned = cleanCustomerInfoRow(rawRow)
// Result:
// {
//   membership_number: 'M001',
//   name: 'Ahmad bin Abdullah',
//   gender: 'Male', // Auto-detected from "bin"
//   contact_number: '0123456789', // Cleaned
//   email: 'ahmad@example.com',
//   address: '123 Jalan Merdeka',
//   city: 'Kuala Lumpur',
//   state: 'Kuala Lumpur', // Expanded from 'KL'
//   postcode: '50000',
//   country: 'Malaysia',
//   date_of_birth: '1990-01-15', // Converted to ISO
//   registration_date: '2023-06-01', // Converted to ISO
//   total_spending: 0,
//   visit_count: 0,
//   last_visit_date: null
// }
```

### Gender Detection

```typescript
import { detectGender, detectGenderBatch } from '@/utils/genderDetector'

// Single name
const gender = detectGender('Ahmad bin Abdullah')
// Returns: 'Male'

const gender2 = detectGender('Siti binti Hassan')
// Returns: 'Female'

// Batch detection
const names = ['Ahmad bin Abdullah', 'Priya a/p Kumar', 'Unknown Name']
const genders = detectGenderBatch(names)
// Returns: ['Male', 'Female', null]
```

### Creating Customer Map

```typescript
import { createCustomerMap } from '@/utils/customerInfoCleaner'

const cleanedCustomers = cleanCustomerInfoData(rawData)
const customerMap = createCustomerMap(cleanedCustomers)

// Look up customer by membership number
const customer = customerMap.get('M001')
```

## Expected CSV/Excel Columns

The utility supports various column name variations:

### Required Columns
- **Membership Number**: `Membership Number`, `Member Number`, `Member ID`
- **Customer Name**: `Customer Name`, `Name`, `Full Name`

### Optional Columns
- **Gender**: `Gender`
- **Contact**: `Contact Number`, `Phone`, `Mobile`, `Phone Number`, `Mobile Number`
- **Email**: `Email`, `Email Address`, `E-mail`
- **Address**: `Address`, `Address Line 1`, `Full Address`
- **Address Line 2**: `Address Line 2`
- **City**: `City`
- **State**: `State`
- **Postcode**: `Postcode`, `Postal Code`, `Zip Code`
- **Country**: `Country`
- **Date of Birth**: `Date of Birth`, `DOB`, `Birth Date`, `Birthdate`
- **Registration Date**: `Registration Date`, `Member Since`, `Join Date`, `Created Date`, `Signup Date`
- **Last Visit**: `Last Visit`, `Last Visit Date`, `Last Transaction Date`

## Data Validation

The cleaner performs the following validations:

1. **Required Fields**: Membership number and customer name must be present
2. **Duplicate Detection**: Warns about duplicate membership numbers
3. **Phone Number**: Must be valid Malaysian format (9-11 digits)
4. **Email**: Must match email regex pattern
5. **Postcode**: Must be exactly 5 digits for Malaysian postcodes
6. **Dates**: Must be parseable to valid date format

## Output Format

Returns array of customer objects matching the Supabase `Customer` interface:

```typescript
interface Customer {
  membership_number: string      // Primary key
  name: string                   // Required
  gender: string | null          // Auto-detected if not provided
  contact_number: string | null  // Cleaned Malaysian format
  email: string | null           // Validated and lowercased
  address: string | null         // Combined address lines
  city: string | null
  state: string | null           // Expanded from abbreviation
  postcode: string | null        // Validated 5 digits
  country: string | null         // Defaults to 'Malaysia'
  date_of_birth: string | null   // ISO format (YYYY-MM-DD)
  registration_date: string | null // ISO format (YYYY-MM-DD)
  total_spending: number         // Initialized to 0
  visit_count: number            // Initialized to 0
  last_visit_date: string | null // From CSV or null
}
```

## Error Handling

The cleaner logs rejection reasons:

```
Cleaned 450 customers from 500 raw rows
Customer rejection breakdown:
   No membership number: 20
   No customer name: 15
   Duplicate membership: 15
```

## Example: Complete Data Import

```typescript
import { parseExcelFile } from '@/utils/excelParser'
import { cleanCustomerInfoData } from '@/utils/customerInfoCleaner'
import { supabase } from '@/lib/supabase'

async function importCustomers(file: File) {
  try {
    // 1. Parse Excel file
    console.log('Parsing Excel file...')
    const rawData = await parseExcelFile(file, { skipRows: 0 })

    // 2. Clean data
    console.log('Cleaning customer data...')
    const cleanedCustomers = cleanCustomerInfoData(rawData)

    if (cleanedCustomers.length === 0) {
      throw new Error('No valid customers found')
    }

    // 3. Insert into database (batch insert)
    console.log(`Inserting ${cleanedCustomers.length} customers...`)
    const { data, error } = await supabase
      .from('customers')
      .upsert(cleanedCustomers, {
        onConflict: 'membership_number'
      })

    if (error) throw error

    console.log(`Successfully imported ${cleanedCustomers.length} customers`)
    return cleanedCustomers.length

  } catch (error) {
    console.error('Error importing customers:', error)
    throw error
  }
}
```

## Testing

Test files are provided in `__tests__/` directory:

- `customerInfoCleaner.test.ts` - Tests for data cleaning functions
- `genderDetector.test.ts` - Tests for gender detection

Run tests with:
```bash
npm run test
```

## Malaysian-Specific Handling

This utility is optimized for Malaysian data:

1. **Phone Numbers**: Malaysian mobile (01X) and landline (0X) formats
2. **Addresses**: Malaysian state abbreviations and postcode format
3. **Names**: Malay (bin/binti), Chinese, and Indian naming conventions
4. **Date Formats**: DD/MM/YYYY format commonly used in Malaysia
5. **Default Country**: Malaysia

## Notes

- **Gender Detection**: Returns `null` if gender cannot be determined with confidence
- **Phone Validation**: Returns `null` for invalid formats rather than throwing errors
- **Email Validation**: Filters out common placeholder emails
- **Duplicate Handling**: Only first occurrence is kept, duplicates are logged
- **Total Spending & Visit Count**: Initialized to 0, should be updated from transaction data
- **Case Sensitivity**: Email is lowercased, names preserve original case
