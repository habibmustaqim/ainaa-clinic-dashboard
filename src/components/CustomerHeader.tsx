import React from 'react'
import { Phone, Mail, Calendar, MapPin, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Customer } from '@/lib/supabase'
import { formatDate, getInitials } from '@/utils/formatters'

interface CustomerHeaderProps {
  customer: Customer
}

const CustomerHeader: React.FC<CustomerHeaderProps> = ({ customer }) => {
  const getGenderBadgeColor = (gender: string | null) => {
    if (!gender) return 'outline'
    switch (gender.toLowerCase()) {
      case 'male':
        return 'default'
      case 'female':
        return 'secondary'
      default:
        return 'outline'
    }
  }

  return (
    <Card className="border-none shadow-lg">
      <CardContent className="pt-6">
        <div className="flex items-start gap-6">
          {/* Avatar */}
          <Avatar className="h-24 w-24 border-4 border-background shadow-lg">
            <AvatarFallback className="text-3xl bg-primary dark:bg-primary/30 text-primary-foreground font-bold">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>

          {/* Customer Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  {customer.name}
                </h1>
                <div className="flex items-center gap-3">
                  <Badge variant="outline" className="text-sm font-normal">
                    <User className="h-3 w-3 mr-1" />
                    Member ID: {customer.membership_number}
                  </Badge>
                  <Badge variant={getGenderBadgeColor(customer.gender) as any} className="text-sm">
                    {customer.gender || 'Not specified'}
                  </Badge>
                </div>
              </div>
              {customer.registration_date && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">Registered</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatDate(customer.registration_date)}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Phone */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Phone</div>
                  <div className="text-sm font-medium text-foreground">
                    {customer.contact_number || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/15 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Email</div>
                  <div className="text-sm font-medium text-foreground truncate max-w-[150px]">
                    {customer.email || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Date of Birth</div>
                  <div className="text-sm font-medium text-foreground">
                    {formatDate(customer.date_of_birth)}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-success/10 dark:bg-success/20 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-success" />
                </div>
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Location</div>
                  <div className="text-sm font-medium text-foreground">
                    {customer.city && customer.state
                      ? `${customer.city}, ${customer.state}`
                      : customer.city || customer.state || 'N/A'}
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Information */}
            {(customer.address || customer.country) && (
              <div className="mt-4 pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {customer.address && (
                    <div>
                      <span className="text-muted-foreground">Address: </span>
                      <span className="text-foreground">{customer.address}</span>
                    </div>
                  )}
                  {customer.country && (
                    <div>
                      <span className="text-muted-foreground">Country: </span>
                      <span className="text-foreground">{customer.country}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CustomerHeader
