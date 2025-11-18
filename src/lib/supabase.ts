import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Customer {
  id: string
  membership_number: string
  name: string
  email: string | null
  phone: string | null
  phone2: string | null

  // IC and Demographics
  ic_number: string | null
  age: number | null
  birth_date: string | null
  gender: string | null
  marital_status: string | null
  occupation: string | null
  income_range: string | null
  race: string | null
  religion: string | null
  preferred_language: string | null

  // Medical Information
  drug_allergies: string | null
  medical_conditions: string | null
  alerts: string | null
  smoker: boolean
  patient_tag: string | null

  // Address
  address: string | null
  address2: string | null
  address3: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null

  // Membership Information
  membership_type: string | null
  consultant: string | null
  outlet: string | null
  vip: boolean
  deceased: boolean
  department: string | null
  employee_number: string | null
  payee_origin: string | null
  coverage_policies: string | null

  // Referral Information
  referrer: string | null
  referrer_contact: string | null
  referrer_relationship: string | null

  // Preferences
  system_notifications: boolean
  promotional_notifications: boolean

  // Timestamps
  created_date: string | null
  created_time: string | null
  last_visit_date: string | null
  last_visit_time: string | null
  registration_date: string | null

  // Legacy fields (kept for compatibility)
  date_of_birth: string | null
  contact_number: string | null
  total_spending: number
  visit_count: number
  created_at: string
}

export interface Transaction {
  id: string
  customer_id: string
  so_number: string
  transaction_date: string | null
  transaction_type: string | null
  payment_status: string | null
  total_amount: number
  total_discount: number
  tax_amount: number
  net_amount: number
  payment_to_date: number
  outstanding_amount: number
  is_cancelled: boolean
  created_at: string
}

export interface Payment {
  id: string
  transaction_id: string
  payment_method: string | null
  amount: number
  payment_date: string | null
  status: string
  created_at: string
}

export interface Item {
  id: string
  transaction_id: string
  item_name: string
  quantity: number
  unit_price: number
  total_price: number
  category: string | null
  sale_date: string | null
  sales_person: string | null
  created_at: string
}

export interface CustomerVisitFrequency {
  id: string
  customer_id: string
  membership_number: string
  consultant: string | null

  // Spending metrics
  total_spent: number
  spent_for_period: number

  // Visit metrics
  total_visits: number
  avg_visit_week: number
  avg_visit_month: number
  avg_visit_year: number

  // Transaction tracking
  transaction_count: number

  // Last activity
  last_visit_action: string | null
  last_visit_date: string | null
  last_visit_time: string | null

  // Monthly visit breakdown
  visits_oct_2025: number
  visits_sep_2025: number
  visits_aug_2025: number
  visits_jul_2025: number
  visits_jun_2025: number
  visits_may_2025: number
  visits_apr_2025: number
  visits_mar_2025: number
  visits_feb_2025: number
  visits_jan_2025: number
  visits_dec_2024: number
  visits_nov_2024: number

  // Derived metrics
  first_visit_date: string | null
  customer_lifetime_days: number
  average_transaction_value: number

  // Segmentation
  is_active: boolean
  is_vip: boolean
  is_at_risk: boolean
  is_dormant: boolean

  // Timestamps
  created_at: string
  updated_at: string
}

export interface ServiceSales {
  id: string
  transaction_id: string
  customer_id: string
  membership_number: string

  // Transaction reference
  sales_number: string
  invoice_number: string | null
  sale_date: string
  sale_time: string | null
  sale_type: string | null

  // Customer info
  customer_name: string | null
  customer_phone: string | null

  // Service details
  service_type: string | null
  sku: string | null
  service_name: string
  quantity: number

  // Pricing
  original_retail_price: number
  gross_amount: number
  voucher_amount: number
  discount_amount: number
  nett_before_deduction: number

  // Promotions
  promo: string | null
  promo_group: string | null

  // Tax
  tax_name: string | null
  tax_rate: number
  tax_amount: number

  // Cash Wallet
  cw_used_gross: number
  cw_used_tax: number
  cw_cancelled_gross: number
  cw_cancelled_tax: number

  // Cancellations
  cancelled_gross: number
  cancelled_tax: number
  is_cancelled: boolean

  // Payment details
  payment_amount: number
  payment_outstanding: number
  payment_mode: string | null
  payment_type: string | null
  approval_code: string | null
  bank: string | null

  // Final amount
  nett_amount: number

  // Staff
  sales_person: string | null
  processed_by: string | null

  // Service-specific
  therapist: string | null
  room_number: string | null
  duration_minutes: number | null

  // Analytics helpers
  service_category: string | null
  is_promotional: boolean
  discount_percentage: number

  // Timestamps
  created_at: string
  updated_at: string
}
