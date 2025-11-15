import { supabase, Customer, Transaction, Payment, Item } from '../lib/supabase'
import { EnhancedItem } from '../types'

// ============================================================================
// CUSTOMER FUNCTIONS
// ============================================================================

export const fetchCustomers = async (): Promise<Customer[]> => {
  console.log('[supabaseDataService] Fetching all customers...')
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      console.error('[supabaseDataService] Error fetching customers:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} customers`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchCustomers:', error)
    throw error
  }
}

export const fetchCustomerById = async (customerId: string): Promise<Customer | null> => {
  console.log('[supabaseDataService] Fetching customer by ID:', customerId)
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', customerId)
      .single()

    if (error) {
      console.error('[supabaseDataService] Error fetching customer:', error)
      throw error
    }

    console.log('[supabaseDataService] Successfully fetched customer:', data?.name)
    return data
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchCustomerById:', error)
    throw error
  }
}

// ============================================================================
// TRANSACTION FUNCTIONS
// ============================================================================

export const fetchTransactions = async (): Promise<Transaction[]> => {
  console.log('[supabaseDataService] Fetching all transactions...')
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('transaction_date', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching transactions:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} transactions`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTransactions:', error)
    throw error
  }
}

export const fetchTransactionsByCustomerId = async (customerId: string): Promise<Transaction[]> => {
  console.log('[supabaseDataService] Fetching transactions for customer:', customerId)
  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .eq('customer_id', customerId)
      .order('transaction_date', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching customer transactions:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} transactions for customer`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTransactionsByCustomerId:', error)
    throw error
  }
}

// ============================================================================
// PAYMENT FUNCTIONS
// ============================================================================

export const fetchPayments = async (): Promise<Payment[]> => {
  console.log('[supabaseDataService] Fetching all payments...')
  try {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .order('payment_date', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching payments:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} payments`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchPayments:', error)
    throw error
  }
}

// ============================================================================
// ITEM FUNCTIONS
// ============================================================================

export const fetchItems = async (): Promise<Item[]> => {
  console.log('[supabaseDataService] Fetching all items...')
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching items:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} items`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchItems:', error)
    throw error
  }
}

export const fetchEnhancedItems = async (): Promise<EnhancedItem[]> => {
  console.log('[supabaseDataService] Fetching all enhanced items...')
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('*')
      .order('date', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching enhanced items:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} enhanced items`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchEnhancedItems:', error)
    throw error
  }
}

// ============================================================================
// TRANSACTION ITEM FUNCTIONS
// ============================================================================

export const fetchTransactionItems = async (transactionId: string): Promise<Item[]> => {
  console.log('[supabaseDataService] Fetching items for transaction:', transactionId)
  try {
    const { data, error } = await supabase
      .from('items')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching transaction items:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} items for transaction`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTransactionItems:', error)
    throw error
  }
}

export const fetchTransactionEnhancedItems = async (transactionId: string): Promise<EnhancedItem[]> => {
  console.log('[supabaseDataService] Fetching enhanced items for transaction:', transactionId)
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('*')
      .eq('transaction_id', transactionId)
      .order('date', { ascending: false })

    if (error) {
      console.error('[supabaseDataService] Error fetching transaction enhanced items:', error)
      throw error
    }

    console.log(`[supabaseDataService] Successfully fetched ${data?.length || 0} enhanced items for transaction`)
    return data || []
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTransactionEnhancedItems:', error)
    throw error
  }
}

// ============================================================================
// ANALYTICS FUNCTIONS
// ============================================================================

export interface ServiceCategoryStat {
  service_type: string
  total_revenue: number
  transaction_count: number
}

export const fetchServiceCategoryStats = async (): Promise<ServiceCategoryStat[]> => {
  console.log('[supabaseDataService] Fetching service category statistics...')
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('service_type, nett')
      .not('service_type', 'is', null)

    if (error) {
      console.error('[supabaseDataService] Error fetching service category stats:', error)
      throw error
    }

    // Aggregate data on the client side
    const statsMap = new Map<string, { total_revenue: number; transaction_count: number }>()

    data?.forEach((item) => {
      const serviceType = item.service_type || 'Unknown'
      const revenue = item.nett || 0

      if (statsMap.has(serviceType)) {
        const existing = statsMap.get(serviceType)!
        existing.total_revenue += revenue
        existing.transaction_count += 1
      } else {
        statsMap.set(serviceType, {
          total_revenue: revenue,
          transaction_count: 1
        })
      }
    })

    const stats: ServiceCategoryStat[] = Array.from(statsMap.entries()).map(([service_type, values]) => ({
      service_type,
      ...values
    }))

    console.log(`[supabaseDataService] Successfully calculated stats for ${stats.length} service categories`)
    return stats
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchServiceCategoryStats:', error)
    throw error
  }
}

export interface PaymentMethodStat {
  payment_mode: string
  total_amount: number
  transaction_count: number
}

export const fetchPaymentMethodStats = async (): Promise<PaymentMethodStat[]> => {
  console.log('[supabaseDataService] Fetching payment method statistics...')
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('payment_mode, payment_to_date')
      .not('payment_mode', 'is', null)
      .gt('payment_to_date', 0)

    if (error) {
      console.error('[supabaseDataService] Error fetching payment method stats:', error)
      throw error
    }

    // Aggregate data on the client side
    const statsMap = new Map<string, { total_amount: number; transaction_count: number }>()

    data?.forEach((item) => {
      const paymentMode = item.payment_mode || 'Unknown'
      const amount = item.payment_to_date || 0

      if (statsMap.has(paymentMode)) {
        const existing = statsMap.get(paymentMode)!
        existing.total_amount += amount
        existing.transaction_count += 1
      } else {
        statsMap.set(paymentMode, {
          total_amount: amount,
          transaction_count: 1
        })
      }
    })

    const stats: PaymentMethodStat[] = Array.from(statsMap.entries()).map(([payment_mode, values]) => ({
      payment_mode,
      ...values
    }))

    console.log(`[supabaseDataService] Successfully calculated stats for ${stats.length} payment methods`)
    return stats
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchPaymentMethodStats:', error)
    throw error
  }
}

export interface PromotionStat {
  promo: string
  total_revenue: number
  usage_count: number
}

export const fetchPromotionStats = async (): Promise<PromotionStat[]> => {
  console.log('[supabaseDataService] Fetching promotion statistics...')
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('promo, nett')
      .not('promo', 'is', null)
      .neq('promo', '')

    if (error) {
      console.error('[supabaseDataService] Error fetching promotion stats:', error)
      throw error
    }

    // Aggregate data on the client side
    const statsMap = new Map<string, { total_revenue: number; usage_count: number }>()

    data?.forEach((item) => {
      const promo = item.promo || 'No Promo'
      const revenue = item.nett || 0

      if (statsMap.has(promo)) {
        const existing = statsMap.get(promo)!
        existing.total_revenue += revenue
        existing.usage_count += 1
      } else {
        statsMap.set(promo, {
          total_revenue: revenue,
          usage_count: 1
        })
      }
    })

    const stats: PromotionStat[] = Array.from(statsMap.entries()).map(([promo, values]) => ({
      promo,
      ...values
    }))

    console.log(`[supabaseDataService] Successfully calculated stats for ${stats.length} promotions`)
    return stats
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchPromotionStats:', error)
    throw error
  }
}

export interface TopService {
  service_name: string
  service_type: string
  total_revenue: number
  quantity_sold: number
}

export const fetchTopServices = async (limit: number = 10): Promise<TopService[]> => {
  console.log(`[supabaseDataService] Fetching top ${limit} services...`)
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('service_name, service_type, nett, quantity')
      .not('service_name', 'is', null)

    if (error) {
      console.error('[supabaseDataService] Error fetching top services:', error)
      throw error
    }

    // Aggregate data on the client side
    const serviceMap = new Map<string, { service_type: string; total_revenue: number; quantity_sold: number }>()

    data?.forEach((item) => {
      const serviceName = item.service_name || 'Unknown'
      const serviceType = item.service_type || 'Unknown'
      const revenue = item.nett || 0
      const quantity = item.quantity || 0

      if (serviceMap.has(serviceName)) {
        const existing = serviceMap.get(serviceName)!
        existing.total_revenue += revenue
        existing.quantity_sold += quantity
      } else {
        serviceMap.set(serviceName, {
          service_type: serviceType,
          total_revenue: revenue,
          quantity_sold: quantity
        })
      }
    })

    const services: TopService[] = Array.from(serviceMap.entries())
      .map(([service_name, values]) => ({
        service_name,
        ...values
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)

    console.log(`[supabaseDataService] Successfully fetched top ${services.length} services`)
    return services
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTopServices:', error)
    throw error
  }
}

export interface TopSellingItem {
  service_name: string
  quantity_sold: number
  total_revenue: number
}

export const fetchTopSellingItems = async (limit: number = 10): Promise<TopSellingItem[]> => {
  console.log(`[supabaseDataService] Fetching top ${limit} selling items by quantity...`)
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('service_name, quantity, nett')
      .not('service_name', 'is', null)

    if (error) {
      console.error('[supabaseDataService] Error fetching top selling items:', error)
      throw error
    }

    // Aggregate data on the client side
    const itemMap = new Map<string, { quantity_sold: number; total_revenue: number }>()

    data?.forEach((item) => {
      const serviceName = item.service_name || 'Unknown'
      const quantity = item.quantity || 0
      const revenue = item.nett || 0

      if (itemMap.has(serviceName)) {
        const existing = itemMap.get(serviceName)!
        existing.quantity_sold += quantity
        existing.total_revenue += revenue
      } else {
        itemMap.set(serviceName, {
          quantity_sold: quantity,
          total_revenue: revenue
        })
      }
    })

    const items: TopSellingItem[] = Array.from(itemMap.entries())
      .map(([service_name, values]) => ({
        service_name,
        ...values
      }))
      .sort((a, b) => b.quantity_sold - a.quantity_sold)
      .slice(0, limit)

    console.log(`[supabaseDataService] Successfully fetched top ${items.length} selling items`)
    return items
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTopSellingItems:', error)
    throw error
  }
}

export interface TopRevenueItem {
  service_name: string
  total_revenue: number
  quantity_sold: number
}

export const fetchTopRevenueItems = async (limit: number = 10): Promise<TopRevenueItem[]> => {
  console.log(`[supabaseDataService] Fetching top ${limit} revenue items...`)
  try {
    const { data, error } = await supabase
      .from('enhanced_items')
      .select('service_name, nett, quantity')
      .not('service_name', 'is', null)

    if (error) {
      console.error('[supabaseDataService] Error fetching top revenue items:', error)
      throw error
    }

    // Aggregate data on the client side
    const itemMap = new Map<string, { total_revenue: number; quantity_sold: number }>()

    data?.forEach((item) => {
      const serviceName = item.service_name || 'Unknown'
      const revenue = item.nett || 0
      const quantity = item.quantity || 0

      if (itemMap.has(serviceName)) {
        const existing = itemMap.get(serviceName)!
        existing.total_revenue += revenue
        existing.quantity_sold += quantity
      } else {
        itemMap.set(serviceName, {
          total_revenue: revenue,
          quantity_sold: quantity
        })
      }
    })

    const items: TopRevenueItem[] = Array.from(itemMap.entries())
      .map(([service_name, values]) => ({
        service_name,
        ...values
      }))
      .sort((a, b) => b.total_revenue - a.total_revenue)
      .slice(0, limit)

    console.log(`[supabaseDataService] Successfully fetched top ${items.length} revenue items`)
    return items
  } catch (error) {
    console.error('[supabaseDataService] Exception in fetchTopRevenueItems:', error)
    throw error
  }
}

// ============================================================================
// EXPORT ALL FUNCTIONS
// ============================================================================

export default {
  // Customer functions
  fetchCustomers,
  fetchCustomerById,

  // Transaction functions
  fetchTransactions,
  fetchTransactionsByCustomerId,

  // Payment functions
  fetchPayments,

  // Item functions
  fetchItems,
  fetchEnhancedItems,
  fetchTransactionItems,
  fetchTransactionEnhancedItems,

  // Analytics functions
  fetchServiceCategoryStats,
  fetchPaymentMethodStats,
  fetchPromotionStats,
  fetchTopServices,
  fetchTopSellingItems,
  fetchTopRevenueItems,
}
