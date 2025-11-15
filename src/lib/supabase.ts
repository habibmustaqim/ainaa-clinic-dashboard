import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Database types
export interface Customer {
  id: string
  membership_number: string
  name: string
  gender: string | null
  contact_number: string | null
  email: string | null
  address: string | null
  city: string | null
  state: string | null
  postcode: string | null
  country: string | null
  date_of_birth: string | null
  registration_date: string | null
  total_spending: number
  visit_count: number
  last_visit_date: string | null
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
  created_at: string
}
