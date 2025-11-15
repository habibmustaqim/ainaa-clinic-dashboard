import React, { createContext, useContext, useState, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Customer } from '../lib/supabase'

interface CustomerContextType {
  selectedCustomer: Customer | null
  setSelectedCustomer: (customer: Customer | null) => void
  selectCustomer: (customer: Customer) => void
  clearCustomer: () => void
}

const CustomerContext = createContext<CustomerContextType | undefined>(undefined)

interface CustomerProviderProps {
  children: ReactNode
}

export const CustomerProvider: React.FC<CustomerProviderProps> = ({ children }) => {
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const navigate = useNavigate()

  const selectCustomer = (customer: Customer) => {
    console.log('[CustomerContext] Selecting customer:', customer.id, customer.name)
    setSelectedCustomer(customer)
    navigate(`/patient/${customer.id}`)
  }

  const clearCustomer = () => {
    console.log('[CustomerContext] Clearing selected customer')
    setSelectedCustomer(null)
    navigate('/')
  }

  const value: CustomerContextType = {
    selectedCustomer,
    setSelectedCustomer,
    selectCustomer,
    clearCustomer,
  }

  return (
    <CustomerContext.Provider value={value}>
      {children}
    </CustomerContext.Provider>
  )
}

export const useCustomer = (): CustomerContextType => {
  const context = useContext(CustomerContext)
  if (context === undefined) {
    throw new Error('useCustomer must be used within a CustomerProvider')
  }
  return context
}
