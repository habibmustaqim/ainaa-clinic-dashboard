export interface EnhancedItem {
  id: string
  transaction_id: string
  date: string
  time: string
  sales_number: string
  transaction_type: string
  customer_name: string
  customer_phone: string
  membership_number: string
  service_type: string
  sku: string
  service_name: string
  quantity: number
  promo: string | null
  promo_group: string | null
  tax_name: string | null
  tax_rate: number
  tax_amount: number
  gross: number
  original_retail_price: number
  voucher: number
  discount: number
  nett_before_deduction: number
  cw_used_gross: number
  cw_used_tax: number
  cw_cancelled_gross: number
  cw_cancelled_tax: number
  cancelled_gross: number
  cancelled_tax: number
  payment_to_date: number
  outstanding: number
  outstanding_percentage: number
  payment_mode: string | null
  payment_type: string | null
  approval_code: string | null
  bank: string | null
  nett: number
  sales_person: string
  processed_by: string
  created_at: string
}
