import React, { useState, useEffect } from 'react'
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { supabase, Transaction } from '@/lib/supabase'
import { formatDate, formatCurrency } from '@/utils/formatters'

interface TransactionItem {
  id: string
  transaction_id: string
  item_name: string
  quantity: number
  unit_price: number
  discount: number
  total_amount: number
  category?: string
}

interface EnhancedItem {
  id: string
  transaction_id: string
  service_type: string
  service_details: string
  performed_by?: string
  notes?: string
}

interface TransactionHistoryProps {
  customerId: string
  transactions: Transaction[]
  onRefresh?: () => void
}

const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  customerId,
  transactions,
  onRefresh
}) => {
  const [expandedTransaction, setExpandedTransaction] = useState<string | null>(null)
  const [transactionItems, setTransactionItems] = useState<Record<string, TransactionItem[]>>({})
  const [enhancedItems, setEnhancedItems] = useState<Record<string, EnhancedItem[]>>({})
  const [loadingItems, setLoadingItems] = useState<Record<string, boolean>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const getPaymentStatusBadge = (status: string | null) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      'Paid': { variant: 'default', label: 'Paid' },
      'Partially Paid': { variant: 'secondary', label: 'Partial' },
      'Unpaid': { variant: 'destructive', label: 'Unpaid' }
    }
    const statusInfo = statusMap[status || 'Unpaid'] || { variant: 'outline' as const, label: status || 'Unknown' }
    return <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
  }

  const loadTransactionDetails = async (transactionId: string) => {
    setLoadingItems(prev => ({ ...prev, [transactionId]: true }))

    try {
      // Load transaction items
      const { data: itemsData, error: itemsError } = await supabase
        .from('transaction_items')
        .select('*')
        .eq('transaction_id', transactionId)

      if (itemsError) throw itemsError
      setTransactionItems(prev => ({ ...prev, [transactionId]: itemsData || [] }))

      // Load enhanced items (service details)
      const { data: enhancedData, error: enhancedError } = await supabase
        .from('transaction_enhanced_items')
        .select('*')
        .eq('transaction_id', transactionId)

      if (enhancedError) throw enhancedError
      setEnhancedItems(prev => ({ ...prev, [transactionId]: enhancedData || [] }))
    } catch (error) {
      console.error('Error loading transaction details:', error)
    } finally {
      setLoadingItems(prev => ({ ...prev, [transactionId]: false }))
    }
  }

  const handleToggleExpand = (transactionId: string) => {
    if (expandedTransaction === transactionId) {
      setExpandedTransaction(null)
    } else {
      setExpandedTransaction(transactionId)
      if (!transactionItems[transactionId]) {
        loadTransactionDetails(transactionId)
      }
    }
  }

  // Pagination
  const totalPages = Math.ceil(transactions.length / itemsPerPage)
  const paginatedTransactions = transactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaction History</CardTitle>
        <CardDescription>
          Complete record of all transactions ({transactions.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {transactions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No transactions found
          </div>
        ) : (
          <div className="space-y-4">
            {paginatedTransactions.map((transaction) => (
              <div key={transaction.id} className="border rounded-lg overflow-hidden">
                {/* Transaction Summary Row */}
                <div
                  className="p-4 bg-card hover:bg-accent/50 cursor-pointer flex items-center justify-between"
                  onClick={() => handleToggleExpand(transaction.id)}
                >
                  <div className="flex-1 grid grid-cols-6 gap-4 items-center">
                    <div>
                      <div className="text-sm font-medium">{formatDate(transaction.transaction_date, 'datetime')}</div>
                      <div className="text-xs text-gray-500">{transaction.so_number}</div>
                    </div>
                    <div className="text-sm">{transaction.transaction_type || 'N/A'}</div>
                    <div>{getPaymentStatusBadge(transaction.payment_status)}</div>
                    <div className="text-right">
                      <div className="text-sm font-medium">{formatCurrency(transaction.net_amount)}</div>
                      <div className="text-xs text-gray-500">Net Amount</div>
                    </div>
                    <div className="text-right">
                      {transaction.outstanding_amount > 0 ? (
                        <span className="text-sm text-red-600 font-medium">
                          {formatCurrency(transaction.outstanding_amount)}
                        </span>
                      ) : (
                        <span className="text-sm text-green-600">Paid</span>
                      )}
                    </div>
                    <div className="flex justify-end">
                      {expandedTransaction === transaction.id ? (
                        <ChevronUp className="h-5 w-5 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedTransaction === transaction.id && (
                  <div className="border-t bg-muted/50 p-4">
                    {loadingItems[transaction.id] ? (
                      <div className="flex items-center justify-center py-8">
                        <Loader2 className="h-6 w-6 animate-spin text-purple-600" />
                        <span className="ml-2 text-gray-600">Loading details...</span>
                      </div>
                    ) : (
                      <Tabs defaultValue="items" className="w-full">
                        <TabsList>
                          <TabsTrigger value="items">
                            Items ({transactionItems[transaction.id]?.length || 0})
                          </TabsTrigger>
                          <TabsTrigger value="services">
                            Service Details ({enhancedItems[transaction.id]?.length || 0})
                          </TabsTrigger>
                        </TabsList>

                        <TabsContent value="items" className="mt-4">
                          {transactionItems[transaction.id]?.length > 0 ? (
                            <div className="rounded-md border bg-card">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Item Name</TableHead>
                                    <TableHead>Category</TableHead>
                                    <TableHead className="text-right">Quantity</TableHead>
                                    <TableHead className="text-right">Unit Price</TableHead>
                                    <TableHead className="text-right">Discount</TableHead>
                                    <TableHead className="text-right">Total</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {transactionItems[transaction.id].map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell className="font-medium">{item.item_name}</TableCell>
                                      <TableCell>{item.category || 'N/A'}</TableCell>
                                      <TableCell className="text-right">{item.quantity}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.unit_price)}</TableCell>
                                      <TableCell className="text-right">{formatCurrency(item.discount)}</TableCell>
                                      <TableCell className="text-right font-medium">
                                        {formatCurrency(item.total_amount)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground bg-card rounded-md border">
                              No items found for this transaction
                            </div>
                          )}
                        </TabsContent>

                        <TabsContent value="services" className="mt-4">
                          {enhancedItems[transaction.id]?.length > 0 ? (
                            <div className="space-y-4">
                              {enhancedItems[transaction.id].map((item) => (
                                <div key={item.id} className="bg-card rounded-md border p-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <div className="text-sm font-medium text-gray-500">Service Type</div>
                                      <div className="text-base font-medium mt-1">{item.service_type}</div>
                                    </div>
                                    {item.performed_by && (
                                      <div>
                                        <div className="text-sm font-medium text-gray-500">Performed By</div>
                                        <div className="text-base mt-1">{item.performed_by}</div>
                                      </div>
                                    )}
                                  </div>
                                  <div className="mt-4">
                                    <div className="text-sm font-medium text-gray-500">Service Details</div>
                                    <div className="text-base mt-1">{item.service_details}</div>
                                  </div>
                                  {item.notes && (
                                    <div className="mt-4">
                                      <div className="text-sm font-medium text-gray-500">Notes</div>
                                      <div className="text-base mt-1 text-gray-600">{item.notes}</div>
                                    </div>
                                  )}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-center py-8 text-muted-foreground bg-card rounded-md border">
                              No service details available
                            </div>
                          )}
                        </TabsContent>
                      </Tabs>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between pt-4">
                <div className="text-sm text-gray-600">
                  Showing {((currentPage - 1) * itemsPerPage) + 1} to{' '}
                  {Math.min(currentPage * itemsPerPage, transactions.length)} of{' '}
                  {transactions.length} transactions
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                      <Button
                        key={page}
                        variant={currentPage === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className="w-10"
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default TransactionHistory
