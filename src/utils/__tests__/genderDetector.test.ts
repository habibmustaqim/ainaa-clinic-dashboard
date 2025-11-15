import { describe, it, expect } from 'vitest'
import { detectGender, detectGenderBatch } from '../genderDetector'

describe('genderDetector', () => {
  describe('detectGender', () => {
    it('should detect male gender from Malay names with "bin"', () => {
      expect(detectGender('Ahmad bin Abdullah')).toBe('Male')
      expect(detectGender('Muhammad bin Hassan')).toBe('Male')
      expect(detectGender('Aziz bin Ismail')).toBe('Male')
    })

    it('should detect female gender from Malay names with "binti"', () => {
      expect(detectGender('Siti binti Ahmad')).toBe('Female')
      expect(detectGender('Nur binti Abdullah')).toBe('Female')
      expect(detectGender('Fatimah binti Hassan')).toBe('Female')
    })

    it('should detect gender from Indian names with "a/l" and "a/p"', () => {
      expect(detectGender('Kumar a/l Rajan')).toBe('Male')
      expect(detectGender('Priya a/p Selvam')).toBe('Female')
      expect(detectGender('Vijay al Murugan')).toBe('Male')
      expect(detectGender('Lakshmi ap Kumar')).toBe('Female')
    })

    it('should detect gender from titles', () => {
      expect(detectGender('Mr. Ahmad Abdullah')).toBe('Male')
      expect(detectGender('Ms. Sarah Lee')).toBe('Female')
      expect(detectGender('Mrs. Siti Nurhaliza')).toBe('Female')
      expect(detectGender('Encik Ahmad Hassan')).toBe('Male')
      expect(detectGender('Puan Fatimah Zahra')).toBe('Female')
      expect(detectGender('Cik Nur Aisyah')).toBe('Female')
    })

    it('should detect gender from common Malay first names', () => {
      expect(detectGender('Muhammad Hafiz')).toBe('Male')
      expect(detectGender('Nur Aisyah')).toBe('Female')
      expect(detectGender('Siti Sarah')).toBe('Female')
      expect(detectGender('Ahmad Faizal')).toBe('Male')
      expect(detectGender('Nurul Huda')).toBe('Female')
    })

    it('should detect gender from common Chinese names', () => {
      expect(detectGender('Lee Wei Ming')).toBe('Male')
      expect(detectGender('Tan Mei Ling')).toBe('Female')
      expect(detectGender('Wong Kai Jun')).toBe('Male')
      expect(detectGender('Lim Hui Ying')).toBe('Female')
    })

    it('should detect gender from common Indian names', () => {
      expect(detectGender('Raj Kumar')).toBe('Male')
      expect(detectGender('Lakshmi Devi')).toBe('Female')
      expect(detectGender('Vikram Prakash')).toBe('Male')
      expect(detectGender('Priya Rani')).toBe('Female')
    })

    it('should return null for ambiguous names', () => {
      expect(detectGender('Lee Chong')).toBe('Male')
      expect(detectGender('Unknown Person')).toBeNull()
      expect(detectGender('Test User')).toBeNull()
    })

    it('should return null for empty or invalid input', () => {
      expect(detectGender('')).toBeNull()
      expect(detectGender(null)).toBeNull()
      expect(detectGender(undefined)).toBeNull()
      expect(detectGender('   ')).toBeNull()
    })

    it('should be case-insensitive', () => {
      expect(detectGender('AHMAD BIN ABDULLAH')).toBe('Male')
      expect(detectGender('siti binti ahmad')).toBe('Female')
      expect(detectGender('MR. JOHN DOE')).toBe('Male')
    })

    it('should handle names with multiple gender indicators', () => {
      // More male indicators should result in Male
      expect(detectGender('Ahmad Hafiz bin Abdullah')).toBe('Male')

      // More female indicators should result in Female
      expect(detectGender('Siti Nur binti Ahmad')).toBe('Female')
    })
  })

  describe('detectGenderBatch', () => {
    it('should detect gender for multiple names', () => {
      const names = [
        'Ahmad bin Abdullah',
        'Siti binti Hassan',
        'Kumar a/l Rajan',
        'Priya a/p Selvam',
        null,
        'Unknown Name'
      ]

      const results = detectGenderBatch(names)

      expect(results).toHaveLength(6)
      expect(results[0]).toBe('Male')
      expect(results[1]).toBe('Female')
      expect(results[2]).toBe('Male')
      expect(results[3]).toBe('Female')
      expect(results[4]).toBeNull()
      expect(results[5]).toBeNull()
    })

    it('should handle empty array', () => {
      const results = detectGenderBatch([])
      expect(results).toHaveLength(0)
    })
  })
})
