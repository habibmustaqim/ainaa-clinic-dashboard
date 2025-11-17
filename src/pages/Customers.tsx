import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Layout } from '@/components/Layout'
import { Search, Users, User, Mail, Phone, Shield, MapPin } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { PageContainer } from '@/components/layout/PageContainer'
import { PageHeader } from '@/components/layout/PageHeader'
import { SearchInput } from '@/components/ui/SearchInput'
import { LoadingSpinner } from '@/components/ui/LoadingSpinner'
import { EmptyState } from '@/components/ui/EmptyState'
import { getInitials, formatIcNumber } from '@/utils/formatters'
import { supabase, Customer } from '@/lib/supabase'

const Customers: React.FC = () => {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  // Load all customers on mount (like Homepage does)
  useEffect(() => {
    loadCustomers()
  }, [])

  // Filter customers locally when search query changes (like Homepage)
  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredCustomers([])
    } else {
      const query = searchQuery.toLowerCase()
      const filtered = customers.filter(customer => {
        // Search by name
        if (customer.name?.toLowerCase().includes(query)) return true
        // Search by membership number/customer code
        if (customer.membership_number?.toLowerCase().includes(query)) return true
        // Search by IC number
        if (customer.ic_number?.toLowerCase().includes(query)) return true
        // Search by email
        if (customer.email?.toLowerCase().includes(query)) return true
        // Search by phone
        if (customer.phone?.toLowerCase().includes(query)) return true
        return false
      })
      // Limit to 50 results for performance
      setFilteredCustomers(filtered.slice(0, 50))
    }
  }, [searchQuery, customers])

  const loadCustomers = async () => {
    setLoading(true)
    try {
      let allCustomers: Customer[] = []
      let pageSize = 1000
      let start = 0
      let hasMore = true

      // Fetch all customers using pagination (Supabase has 1000 row limit per query)
      while (hasMore) {
        const { data, error } = await supabase
          .from('customers')
          .select('*')
          .order('name')
          .range(start, start + pageSize - 1)

        if (error) {
          console.error('Error loading customers:', error)
          throw error
        }

        if (!data || data.length === 0) {
          hasMore = false
        } else {
          allCustomers = allCustomers.concat(data)
          console.log(`📄 Loaded ${allCustomers.length} customers so far...`)

          if (data.length < pageSize) {
            hasMore = false // Last page
          } else {
            start += pageSize
          }
        }
      }

      setCustomers(allCustomers)
      console.log(`✅ Loaded total ${allCustomers.length} customers`)
      // Log first customer to see data structure
      if (allCustomers.length > 0) {
        console.log('[Customers] Sample customer data:', allCustomers[0])
      }
    } catch (error) {
      console.error('Error loading customers:', error)
      setCustomers([])
    } finally {
      setLoading(false)
    }
  }

  const handleSelectCustomer = (customer: Customer) => {
    console.log('[Customers] Selected customer:', customer.id, customer.name, 'Membership:', customer.membership_number)
    // Use membership number if available, otherwise use prefixed ID
    const identifier = customer.membership_number || `id-${customer.id}`
    console.log('[Customers] Navigating to:', `/customer/${identifier}`)
    navigate(`/customer/${identifier}`)
  }

  return (
    <Layout>
      <PageContainer maxWidth="wide">
        <PageHeader
          title="Customer Directory"
          subtitle={`Search and view customer profiles • ${customers.length} total customers`}
          icon={Users}
          iconVariant="gradient"
          iconColor="primary"
          size="lg"
          animation="fade-in"
        />

        {/* Search Bar */}
        <div className="mb-8 animate-fade-in">
          <Card className="border-none shadow-lg">
            <CardContent className="pt-6">
              <SearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Search by name, IC number, membership number, or email..."
                size="lg"
                autoFocus
                disabled={loading}
              />
              {loading && (
                <div className="mt-3 text-sm text-muted-foreground flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                  Loading customers...
                </div>
              )}
              {!loading && searchQuery && (
                <div className="mt-2 text-sm text-muted-foreground">
                  Found {filteredCustomers.length} result{filteredCustomers.length !== 1 ? 's' : ''}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Search Results */}
        {searchQuery && !loading && (
          <div className="animate-fade-in">
            {filteredCustomers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredCustomers.map((customer) => (
                  <Card
                    key={customer.id}
                    className="border-none shadow-md hover:shadow-xl transition-all cursor-pointer group hover:scale-[1.02]"
                    onClick={() => handleSelectCustomer(customer)}
                  >
                    <CardContent className="pt-6">
                      <div className="flex items-start gap-4">
                        {/* Avatar */}
                        <Avatar className="h-16 w-16 border-2 border-background shadow-md">
                          <AvatarFallback className="text-lg bg-primary dark:bg-primary/30 text-primary-foreground font-bold">
                            {getInitials(customer.name)}
                          </AvatarFallback>
                        </Avatar>

                        {/* Customer Info */}
                        <div className="flex-1 min-w-0">
                          <div className="mb-2">
                            <h3 className="text-lg font-semibold text-foreground truncate group-hover:text-primary transition-colors">
                              {customer.name || 'Unknown Customer'}
                            </h3>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <Badge variant="outline" className="text-xs font-normal">
                                <Shield className="h-3 w-3 mr-1" />
                                {customer.membership_number || 'No ID'}
                              </Badge>
                              {customer.gender && (
                                <Badge variant="secondary" className="text-xs">
                                  {customer.gender}
                                </Badge>
                              )}
                              {customer.vip && (
                                <Badge className="bg-primary text-primary-foreground border-0 text-xs">
                                  VIP
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Contact Information */}
                          <div className="space-y-1.5">
                            {customer.ic_number && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <User className="h-3.5 w-3.5" />
                                <span>IC: {formatIcNumber(customer.ic_number, true)}</span>
                              </div>
                            )}
                            {customer.email && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground truncate">
                                <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                                <span className="truncate">{customer.email}</span>
                              </div>
                            )}
                            {customer.phone && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <Phone className="h-3.5 w-3.5" />
                                <span>{customer.phone}</span>
                              </div>
                            )}
                            {(customer.city || customer.state) && (
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <MapPin className="h-3.5 w-3.5" />
                                <span>{[customer.city, customer.state].filter(Boolean).join(', ')}</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No customers found"
                description="Try adjusting your search query"
                size="md"
              />
            )}
          </div>
        )}

        {/* Empty State */}
        {!searchQuery && !loading && (
          <EmptyState
            icon={Search}
            title="Search for Customers"
            description={`Start typing to search through ${customers.length} customers by name, IC number, membership number, or email address.`}
            size="lg"
            badges={[
              'Search by name',
              'Search by IC number',
              'Search by membership #',
              'Search by email'
            ]}
          />
        )}

        {/* Loading State */}
        {loading && <LoadingSpinner message="Loading customers..." />}
      </PageContainer>
    </Layout>
  )
}

export default Customers