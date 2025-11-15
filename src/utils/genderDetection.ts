export type Gender = 'male' | 'female' | 'unknown';

interface NameDatabase {
  male: Set<string>;
  female: Set<string>;
}

/**
 * Common Malaysian names database
 */
const malaysianNames: NameDatabase = {
  // Common Malay male names
  male: new Set([
    'ahmad', 'muhammad', 'mohd', 'mohamed', 'mohammad', 'muhamad',
    'ali', 'hassan', 'husain', 'hussein', 'ismail', 'ibrahim',
    'adam', 'amir', 'arif', 'aziz', 'faiz', 'faisal',
    'hafiz', 'hakim', 'haris', 'iqbal', 'imran', 'irfan',
    'jamal', 'kamal', 'khalid', 'latif', 'malik', 'nasir',
    'omar', 'rashid', 'rizal', 'said', 'salim', 'syafiq',
    'tahir', 'umar', 'yusof', 'yusuf', 'zain', 'zakaria',
    // Common Chinese male names
    'wei', 'chong', 'keong', 'heng', 'boon', 'seng',
    'kok', 'hock', 'hong', 'ming', 'yong', 'cheng',
    'liang', 'kang', 'kai', 'jun', 'jie', 'bin',
    // Common Indian male names
    'kumar', 'raj', 'rajan', 'krishnan', 'murugan', 'samy',
    'devi', 'prakash', 'ganesh', 'ravi', 'suresh', 'vijay',
    'arjun', 'deepak', 'dinesh', 'manoj', 'rajesh', 'sankar',
  ]),

  // Common Malay female names
  female: new Set([
    'aisyah', 'aisha', 'aishah', 'aminah', 'fatimah', 'farah',
    'nur', 'noor', 'noorul', 'norfazilah', 'noraini', 'nurul',
    'siti', 'suria', 'sarah', 'sofia', 'sofea', 'sophia',
    'zainab', 'zaiton', 'zuraina', 'zurina', 'zulaikha',
    'hana', 'hannah', 'hawa', 'hidayah', 'izzah', 'julia',
    'liyana', 'maryam', 'mariam', 'nabila', 'najwa', 'natasha',
    'qistina', 'rania', 'raudhah', 'salma', 'syahira', 'syaza',
    // Common Chinese female names
    'lee', 'mei', 'ling', 'li', 'xin', 'yan',
    'fang', 'hui', 'jing', 'min', 'ping', 'qing',
    'ying', 'yun', 'zhen', 'xiao', 'shan', 'rui',
    // Common Indian female names
    'devi', 'lakshmi', 'priya', 'kavitha', 'deepa', 'radha',
    'sita', 'geetha', 'kamala', 'lalitha', 'maya', 'nisha',
    'parvati', 'rajani', 'savitri', 'shanti', 'suja', 'uma',
  ]),
};

/**
 * Malay patronymic indicators
 */
const malayPatronymics = {
  male: ['bin', 'b.', 'b', 'ibn'],
  female: ['binti', 'bte', 'bte.', 'bt.', 'bt', 'ibnu'],
};

/**
 * Indian patronymic indicators
 */
const indianPatronymics = {
  male: ['a/l', 'al', 's/o', 'son of'],
  female: ['a/p', 'ap', 'd/o', 'daughter of'],
};

/**
 * Title-based gender indicators
 */
const titles = {
  male: [
    'mr', 'mr.', 'encik', 'en', 'en.',
    'tuan', 'tn', 'tn.',
    'dato', "dato'", 'datuk', 'tan sri',
    'dr', 'dr.', // when combined with male names
    'haji', 'hj', 'hj.',
  ],
  female: [
    'mrs', 'mrs.', 'ms', 'ms.', 'miss',
    'puan', 'pn', 'pn.',
    'cik', 'ck', 'ck.',
    'datin', 'puan sri',
    'dr', 'dr.', // when combined with female names
    'hajjah', 'hjh', 'hjh.',
  ],
};

/**
 * Detect gender from a Malaysian name
 */
export function detectGender(fullName: string): Gender {
  if (!fullName || typeof fullName !== 'string') {
    return 'unknown';
  }

  const normalized = fullName.toLowerCase().trim();

  // Check by title
  const titleGender = detectByTitle(normalized);
  if (titleGender !== 'unknown') {
    return titleGender;
  }

  // Check by Malay patronymic
  const malayGender = detectByMalayPatronymic(normalized);
  if (malayGender !== 'unknown') {
    return malayGender;
  }

  // Check by Indian patronymic
  const indianGender = detectByIndianPatronymic(normalized);
  if (indianGender !== 'unknown') {
    return indianGender;
  }

  // Check by name database
  const nameGender = detectByNameDatabase(normalized);
  if (nameGender !== 'unknown') {
    return nameGender;
  }

  // Special case: Check for common patterns
  const patternGender = detectByPattern(normalized);
  if (patternGender !== 'unknown') {
    return patternGender;
  }

  return 'unknown';
}

/**
 * Detect gender by title
 */
function detectByTitle(name: string): Gender {
  const words = name.split(/\s+/);
  const firstWord = words[0];

  if (titles.male.includes(firstWord)) {
    return 'male';
  }

  if (titles.female.includes(firstWord)) {
    return 'female';
  }

  return 'unknown';
}

/**
 * Detect gender by Malay patronymic (bin/binti)
 */
function detectByMalayPatronymic(name: string): Gender {
  const words = name.split(/\s+/);

  for (const word of words) {
    if (malayPatronymics.male.includes(word)) {
      return 'male';
    }
    if (malayPatronymics.female.includes(word)) {
      return 'female';
    }
  }

  return 'unknown';
}

/**
 * Detect gender by Indian patronymic (a/l, a/p)
 */
function detectByIndianPatronymic(name: string): Gender {
  const normalized = name.replace(/\s/g, '');

  for (const patronymic of indianPatronymics.male) {
    if (normalized.includes(patronymic.replace(/\s/g, ''))) {
      return 'male';
    }
  }

  for (const patronymic of indianPatronymics.female) {
    if (normalized.includes(patronymic.replace(/\s/g, ''))) {
      return 'female';
    }
  }

  return 'unknown';
}

/**
 * Detect gender by checking against name database
 */
function detectByNameDatabase(name: string): Gender {
  const words = name.split(/\s+/);

  // Check each word against the database
  for (const word of words) {
    const cleaned = word.replace(/[^a-z]/g, '');

    if (malaysianNames.male.has(cleaned)) {
      return 'male';
    }

    if (malaysianNames.female.has(cleaned)) {
      return 'female';
    }
  }

  return 'unknown';
}

/**
 * Detect gender by common name patterns
 */
function detectByPattern(name: string): Gender {
  // Common female name patterns
  if (
    name.includes('siti ') ||
    name.includes('nur ') ||
    name.includes('noor ') ||
    name.startsWith('wan ') && name.split(' ').length > 2
  ) {
    return 'female';
  }

  // Common male prefixes
  if (
    name.startsWith('muhammad ') ||
    name.startsWith('mohd ') ||
    name.startsWith('mohammad ') ||
    name.startsWith('mohamed ')
  ) {
    return 'male';
  }

  return 'unknown';
}

/**
 * Add a name to the database
 */
export function addToNameDatabase(name: string, gender: 'male' | 'female'): void {
  const normalized = name.toLowerCase().trim().replace(/[^a-z]/g, '');

  if (normalized) {
    malaysianNames[gender].add(normalized);
  }
}

/**
 * Get gender statistics from a list of names
 */
export interface GenderStatistics {
  male: number;
  female: number;
  unknown: number;
  total: number;
  malePercentage: number;
  femalePercentage: number;
  unknownPercentage: number;
}

export function getGenderStatistics(names: string[]): GenderStatistics {
  const stats = {
    male: 0,
    female: 0,
    unknown: 0,
    total: names.length,
    malePercentage: 0,
    femalePercentage: 0,
    unknownPercentage: 0,
  };

  names.forEach(name => {
    const gender = detectGender(name);
    stats[gender]++;
  });

  if (stats.total > 0) {
    stats.malePercentage = (stats.male / stats.total) * 100;
    stats.femalePercentage = (stats.female / stats.total) * 100;
    stats.unknownPercentage = (stats.unknown / stats.total) * 100;
  }

  return stats;
}

/**
 * Extract first name from full name (considering Malaysian naming conventions)
 */
export function extractFirstName(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  const normalized = fullName.trim();
  const words = normalized.split(/\s+/);

  // Remove title if present
  let startIndex = 0;
  const firstWord = words[0].toLowerCase();
  if ([...titles.male, ...titles.female].includes(firstWord)) {
    startIndex = 1;
  }

  // For Malay names with bin/binti, return everything before bin/binti
  for (let i = startIndex; i < words.length; i++) {
    const word = words[i].toLowerCase();
    if ([...malayPatronymics.male, ...malayPatronymics.female].includes(word)) {
      return words.slice(startIndex, i).join(' ');
    }
  }

  // For Indian names with a/l, a/p, return everything before the patronymic
  for (let i = startIndex; i < words.length; i++) {
    const word = words[i].toLowerCase().replace(/\s/g, '');
    const allPatronymics = [...indianPatronymics.male, ...indianPatronymics.female].map(p =>
      p.replace(/\s/g, '')
    );
    if (allPatronymics.includes(word)) {
      return words.slice(startIndex, i).join(' ');
    }
  }

  // Default: return first word after title
  return words[startIndex] || '';
}

/**
 * Validate if a name appears to be Malaysian
 */
export function isMalaysianName(fullName: string): boolean {
  if (!fullName || typeof fullName !== 'string') {
    return false;
  }

  const normalized = fullName.toLowerCase();

  // Check for Malay patronymic
  const hasMalayPatronymic = [
    ...malayPatronymics.male,
    ...malayPatronymics.female,
  ].some(p => normalized.includes(p));

  // Check for Indian patronymic
  const hasIndianPatronymic = [
    ...indianPatronymics.male,
    ...indianPatronymics.female,
  ].some(p => normalized.includes(p.replace(/\s/g, '')));

  // Check for Malaysian titles
  const hasMalaysianTitle = [
    ...titles.male,
    ...titles.female,
  ].some(t => normalized.startsWith(t + ' '));

  // Check for common Malaysian name patterns
  const hasCommonPattern =
    normalized.includes('siti ') ||
    normalized.includes('nur ') ||
    normalized.startsWith('muhammad ') ||
    normalized.startsWith('mohd ');

  return hasMalayPatronymic || hasIndianPatronymic || hasMalaysianTitle || hasCommonPattern;
}

/**
 * Get honorific/title from name
 */
export function extractTitle(fullName: string): string {
  if (!fullName || typeof fullName !== 'string') {
    return '';
  }

  const words = fullName.trim().split(/\s+/);
  const firstWord = words[0].toLowerCase();

  const allTitles = [...titles.male, ...titles.female];

  if (allTitles.includes(firstWord)) {
    return words[0];
  }

  return '';
}

/**
 * Suggest gender based on partial name match
 */
export function suggestGender(partialName: string): {
  gender: Gender;
  confidence: 'high' | 'medium' | 'low';
  matches: string[];
} {
  const normalized = partialName.toLowerCase().trim();
  const maleMatches: string[] = [];
  const femaleMatches: string[] = [];

  // Check for matches in database
  malaysianNames.male.forEach(name => {
    if (name.includes(normalized) || normalized.includes(name)) {
      maleMatches.push(name);
    }
  });

  malaysianNames.female.forEach(name => {
    if (name.includes(normalized) || normalized.includes(name)) {
      femaleMatches.push(name);
    }
  });

  const totalMatches = maleMatches.length + femaleMatches.length;

  if (totalMatches === 0) {
    return { gender: 'unknown', confidence: 'low', matches: [] };
  }

  const maleRatio = maleMatches.length / totalMatches;
  const femaleRatio = femaleMatches.length / totalMatches;

  let gender: Gender;
  let confidence: 'high' | 'medium' | 'low';

  if (maleRatio > 0.8) {
    gender = 'male';
    confidence = 'high';
  } else if (femaleRatio > 0.8) {
    gender = 'female';
    confidence = 'high';
  } else if (maleRatio > 0.6) {
    gender = 'male';
    confidence = 'medium';
  } else if (femaleRatio > 0.6) {
    gender = 'female';
    confidence = 'medium';
  } else {
    gender = 'unknown';
    confidence = 'low';
  }

  const matches = gender === 'male' ? maleMatches : femaleMatches;

  return { gender, confidence, matches };
}
