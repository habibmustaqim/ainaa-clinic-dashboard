import React, { useState, useEffect } from 'react'
import { Check, ChevronsUpDown, Search, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { useCustomer } from '@/context/CustomerContext'
import { fetchCustomers } from '@/services/supabaseDataService'
import type { Customer } from '@/lib/supabase'

export const CustomerSelector: React.FC = () => {
  const { selectedCustomer, selectCustomer } = useCustomer()
  const [open, setOpen] = useState(false)
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Fetch customers when component mounts or popover opens
  useEffect(() => {
    if (open && customers.length === 0) {
      loadCustomers()
    }
  }, [open])

  const loadCustomers = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchCustomers()
      setCustomers(data)
    } catch (err) {
      console.error('Error loading customers:', err)
      setError('Failed to load customers')
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    selectCustomer(customer)
    setOpen(false)
  }

  const filterCustomers = (search: string, customer: Customer) => {
    const searchLower = search.toLowerCase()

    // Search by name
    if (customer.name?.toLowerCase().includes(searchLower)) {
      return true
    }

    // Search by membership number
    if (customer.membership_number?.toLowerCase().includes(searchLower)) {
      return true
    }

    // Search by contact number
    if (customer.contact_number?.toLowerCase().includes(searchLower)) {
      return true
    }

    return false
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
        >
          <div className="flex items-center gap-2">
            <User size={16} className="text-slate-500" />
            {selectedCustomer ? (
              <span className="truncate">
                {selectedCustomer.name}
                <span className="text-slate-500 text-sm ml-2">
                  ({selectedCustomer.membership_number})
                </span>
              </span>
            ) : (
              <span className="text-slate-500">Select customer...</span>
            )}
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[400px] p-0" align="start">
        <Command filter={(value, search) => {
          const customer = customers.find(c => c.id === value)
          if (!customer) return 0
          return filterCustomers(search, customer) ? 1 : 0
        }}>
          <CommandInput placeholder="Search by name or membership..." />
          <CommandList>
            {loading ? (
              <div className="py-6 text-center text-sm text-slate-500">
                <div className="flex items-center justify-center gap-2">
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
                  Loading customers...
                </div>
              </div>
            ) : error ? (
              <div className="py-6 text-center text-sm text-red-600">
                {error}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={loadCustomers}
                  className="mt-2 w-full"
                >
                  Try Again
                </Button>
              </div>
            ) : customers.length === 0 ? (
              <CommandEmpty>
                <div className="py-6 text-center text-sm">
                  <p className="text-slate-600">No customers found</p>
                  <p className="text-slate-500 text-xs mt-1">
                    Upload customer data to get started
                  </p>
                </div>
              </CommandEmpty>
            ) : (
              <CommandGroup>
                {customers.map((customer) => (
                  <CommandItem
                    key={customer.id}
                    value={customer.id}
                    onSelect={() => handleSelectCustomer(customer)}
                    className="cursor-pointer"
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        selectedCustomer?.id === customer.id
                          ? 'opacity-100'
                          : 'opacity-0'
                      )}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-slate-900">
                        {customer.name}
                      </div>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                        <span>#{customer.membership_number}</span>
                        {customer.contact_number && (
                          <>
                            <span>•</span>
                            <span>{customer.contact_number}</span>
                          </>
                        )}
                        {customer.total_spending > 0 && (
                          <>
                            <span>•</span>
                            <span className="text-green-600 font-medium">
                              RM {customer.total_spending.toLocaleString('en-MY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
