import { describe, it, expect } from 'vitest'
import { cleanCustomerInfoRow, cleanCustomerInfoData, RawCustomerInfoRow } from '../customerInfoCleaner'

describe('customerInfoCleaner', () => {
  describe('cleanCustomerInfoRow', () => {
    it('should clean a valid customer row', () => {
      const rawRow: RawCustomerInfoRow = {
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
      }

      const result = cleanCustomerInfoRow(rawRow)

      expect(result).not.toBeNull()
      expect(result?.membership_number).toBe('M001')
      expect(result?.name).toBe('Ahmad bin Abdullah')
      expect(result?.gender).toBe('Male') // Should detect male from "bin"
      expect(result?.contact_number).toBe('0123456789') // Cleaned phone
      expect(result?.email).toBe('ahmad@example.com')
      expect(result?.city).toBe('Kuala Lumpur')
      expect(result?.state).toBe('Kuala Lumpur') // KL mapped to full name
      expect(result?.postcode).toBe('50000')
      expect(result?.date_of_birth).toBe('1990-01-15')
      expect(result?.registration_date).toBe('2023-06-01')
      expect(result?.total_spending).toBe(0)
      expect(result?.visit_count).toBe(0)
    })

    it('should detect female gender from "binti"', () => {
      const rawRow: RawCustomerInfoRow = {
        'Membership Number': 'M002',
        'Customer Name': 'Siti binti Ahmad',
        'Contact Number': '0123456789'
      }

      const result = cleanCustomerInfoRow(rawRow)
      expect(result?.gender).toBe('Female')
    })

    it('should clean Malaysian phone numbers correctly', () => {
      const testCases = [
        { input: '012-345 6789', expected: '0123456789' },
        { input: '+60123456789', expected: '0123456789' },
        { input: '60123456789', expected: '0123456789' },
        { input: '03-2234 5678', expected: '0322345678' }
      ]

      testCases.forEach(({ input, expected }) => {
        const rawRow: RawCustomerInfoRow = {
          'Membership Number': 'M003',
          'Customer Name': 'Test User',
          'Contact Number': input
        }

        const result = cleanCustomerInfoRow(rawRow)
        expect(result?.contact_number).toBe(expected)
      })
    })

    it('should validate and clean email addresses', () => {
      const validEmail: RawCustomerInfoRow = {
        'Membership Number': 'M004',
        'Customer Name': 'Test User',
        'Email': '  TEST@EXAMPLE.COM  '
      }

      const result = cleanCustomerInfoRow(validEmail)
      expect(result?.email).toBe('test@example.com')

      const invalidEmail: RawCustomerInfoRow = {
        'Membership Number': 'M005',
        'Customer Name': 'Test User',
        'Email': 'noemail@noemail.com'
      }

      const result2 = cleanCustomerInfoRow(invalidEmail)
      expect(result2?.email).toBeNull()
    })

    it('should return null for missing membership number', () => {
      const rawRow: RawCustomerInfoRow = {
        'Customer Name': 'Test User'
      }

      const result = cleanCustomerInfoRow(rawRow)
      expect(result).toBeNull()
    })

    it('should return null for missing customer name', () => {
      const rawRow: RawCustomerInfoRow = {
        'Membership Number': 'M006'
      }

      const result = cleanCustomerInfoRow(rawRow)
      expect(result).toBeNull()
    })

    it('should parse date formats correctly', () => {
      const testCases = [
        { input: '15/01/1990', expected: '1990-01-15' }, // DD/MM/YYYY
        { input: '15-01-1990', expected: '1990-01-15' }, // DD-MM-YYYY
        { input: '1990-01-15', expected: '1990-01-15' }  // YYYY-MM-DD
      ]

      testCases.forEach(({ input, expected }) => {
        const rawRow: RawCustomerInfoRow = {
          'Membership Number': 'M007',
          'Customer Name': 'Test User',
          'Date of Birth': input
        }

        const result = cleanCustomerInfoRow(rawRow)
        expect(result?.date_of_birth).toBe(expected)
      })
    })
  })

  describe('cleanCustomerInfoData', () => {
    it('should clean multiple customer rows and detect duplicates', () => {
      const rawData: RawCustomerInfoRow[] = [
        {
          'Membership Number': 'M001',
          'Customer Name': 'Ahmad bin Abdullah',
          'Contact Number': '0123456789'
        },
        {
          'Membership Number': 'M002',
          'Customer Name': 'Siti Nurhaliza',
          'Contact Number': '0198765432'
        },
        {
          'Membership Number': 'M001', // Duplicate
          'Customer Name': 'Duplicate User',
          'Contact Number': '0111111111'
        },
        {
          // Missing membership number
          'Customer Name': 'No Membership'
        }
      ]

      const result = cleanCustomerInfoData(rawData)

      expect(result).toHaveLength(2) // Only 2 valid unique customers
      expect(result[0].membership_number).toBe('M001')
      expect(result[1].membership_number).toBe('M002')
    })
  })
})
