/**
 * Gender detection utility for Malaysian names
 * Uses common Malaysian name patterns to detect gender
 */

// Common male Malaysian names (Malay, Chinese, Indian)
const MALE_NAMES = new Set([
  // Malay male names
  'ahmad', 'muhammad', 'mohd', 'mohamed', 'mohamad', 'mohammad', 'abdul', 'abdullah',
  'aziz', 'azman', 'azmi', 'faizal', 'hafiz', 'hakimi', 'hakim', 'haris', 'harith',
  'ismail', 'izzat', 'khairul', 'luqman', 'nazri', 'rahman', 'rashid', 'rizal',
  'shahrul', 'syafiq', 'syahir', 'umar', 'zaki', 'zulkifli', 'aiman', 'danish',
  'farhan', 'firdaus', 'irfan', 'iqbal', 'syukri', 'fahmi', 'hafizan',

  // Chinese male names (common patterns)
  'wei', 'chong', 'ken', 'ming', 'heng', 'jun', 'kai', 'kok', 'leong',
  'boon', 'chuan', 'hon', 'kian', 'wai', 'yong', 'wen', 'bin', 'liang',

  // Indian male names
  'kumar', 'raj', 'rajan', 'prakash', 'suresh', 'ramesh', 'vijay', 'anand',
  'ashok', 'dinesh', 'ganesh', 'krishnan', 'murugan', 'ravi', 'selvam', 'vikram',
  'arjun', 'karthik', 'naveen', 'pradeep', 'sanjay', 'arun'
])

// Common female Malaysian names
const FEMALE_NAMES = new Set([
  // Malay female names
  'nur', 'nurul', 'siti', 'noor', 'ain', 'aina', 'aini', 'aisyah', 'aliah',
  'amira', 'atiqah', 'ayu', 'azura', 'farah', 'fatin', 'fatimah', 'hana',
  'hannah', 'husna', 'izzah', 'najwa', 'nabilah', 'nadiah', 'nadia', 'nadhirah',
  'qaseh', 'qistina', 'safiah', 'sarah', 'sofea', 'sophia', 'syahirah', 'syairah',
  'syazwani', 'zahra', 'zara', 'zulaikha', 'balqis', 'batrisyia', 'damia',
  'huda', 'irdina', 'mariam', 'nabila', 'qasrina', 'safiyyah', 'sumayyah',

  // Chinese female names (common patterns)
  'mei', 'ling', 'yan', 'xin', 'hui', 'jia', 'li', 'ying', 'yee', 'yi',
  'fang', 'shan', 'qing', 'min', 'xuan', 'yun',

  // Indian female names
  'devi', 'priya', 'lakshmi', 'kavitha', 'radha', 'sita', 'uma', 'vani',
  'deepa', 'geetha', 'kamala', 'mala', 'meena', 'rani', 'shanti', 'malini',
  'indra', 'kala', 'latha', 'nisha', 'prema', 'sangeetha', 'sumathi', 'usha'
])

// Common male titles
const MALE_TITLES = new Set(['mr', 'mr.', 'encik', 'en', 'en.', 'tuan', 'haji', 'dr'])

// Common female titles
const FEMALE_TITLES = new Set(['ms', 'ms.', 'mrs', 'mrs.', 'miss', 'cik', 'puan', 'hajah', 'dr'])

/**
 * Detects gender from a full name
 * @param fullName - The full name to analyze
 * @returns 'Male', 'Female', or null if cannot determine
 */
export function detectGender(fullName: string | null | undefined): string | null {
  if (!fullName || fullName.trim() === '') {
    return null
  }

  const name = fullName.toLowerCase().trim()

  // Split into parts and filter out empty strings
  const parts = name.split(/\s+/).filter(p => p.length > 0)

  if (parts.length === 0) {
    return null
  }

  // Check for titles first (most reliable)
  const firstPart = parts[0].replace(/[.,]/g, '')

  if (MALE_TITLES.has(firstPart)) {
    return 'Male'
  }

  if (FEMALE_TITLES.has(firstPart)) {
    return 'Female'
  }

  // Check all name parts for gender indicators
  let maleScore = 0
  let femaleScore = 0

  for (const part of parts) {
    const cleanPart = part.replace(/[.,]/g, '')

    if (MALE_NAMES.has(cleanPart)) {
      maleScore += 1
    }

    if (FEMALE_NAMES.has(cleanPart)) {
      femaleScore += 1
    }

    // Special handling for common patterns
    // "bin" indicates male (son of)
    if (cleanPart === 'bin' || cleanPart === 'b') {
      maleScore += 2
    }

    // "binti" indicates female (daughter of)
    if (cleanPart === 'binti' || cleanPart === 'bte' || cleanPart === 'bt') {
      femaleScore += 2
    }

    // "a/l" (anak lelaki) indicates male
    if (cleanPart === 'a/l' || cleanPart === 'al') {
      maleScore += 2
    }

    // "a/p" (anak perempuan) indicates female
    if (cleanPart === 'a/p' || cleanPart === 'ap') {
      femaleScore += 2
    }
  }

  // Determine gender based on scores
  if (maleScore > femaleScore) {
    return 'Male'
  } else if (femaleScore > maleScore) {
    return 'Female'
  }

  // If no clear indicator, return null
  return null
}

/**
 * Batch detect gender for multiple names
 * @param names - Array of names to analyze
 * @returns Array of detected genders in same order
 */
export function detectGenderBatch(names: (string | null | undefined)[]): (string | null)[] {
  return names.map(name => detectGender(name))
}
