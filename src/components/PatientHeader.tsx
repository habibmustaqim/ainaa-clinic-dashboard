import React from 'react'
import { Phone, Mail, Calendar, MapPin, User } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Customer } from '@/lib/supabase'

interface PatientHeaderProps {
  customer: Customer
}

const PatientHeader: React.FC<PatientHeaderProps> = ({ customer }) => {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (date: string | null) => {
    if (!date) return 'N/A'
    return new Date(date).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

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
          <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
            <AvatarFallback className="text-3xl bg-gradient-to-br from-purple-600 to-pink-600 text-white font-bold">
              {getInitials(customer.name)}
            </AvatarFallback>
          </Avatar>

          {/* Customer Details */}
          <div className="flex-1">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
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
                  <div className="text-sm text-gray-500">Registered</div>
                  <div className="text-sm font-medium text-gray-700">
                    {formatDate(customer.registration_date)}
                  </div>
                </div>
              )}
            </div>

            {/* Contact Information Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {/* Phone */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Phone className="h-5 w-5 text-purple-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Phone</div>
                  <div className="text-sm font-medium text-gray-900">
                    {customer.contact_number || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Email */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-pink-100 flex items-center justify-center">
                  <Mail className="h-5 w-5 text-pink-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Email</div>
                  <div className="text-sm font-medium text-gray-900 truncate max-w-[150px]">
                    {customer.email || 'N/A'}
                  </div>
                </div>
              </div>

              {/* Date of Birth */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Date of Birth</div>
                  <div className="text-sm font-medium text-gray-900">
                    {formatDate(customer.date_of_birth)}
                  </div>
                </div>
              </div>

              {/* Location */}
              <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <MapPin className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <div className="text-xs text-gray-500 mb-1">Location</div>
                  <div className="text-sm font-medium text-gray-900">
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
                      <span className="text-gray-500">Address: </span>
                      <span className="text-gray-900">{customer.address}</span>
                    </div>
                  )}
                  {customer.country && (
                    <div>
                      <span className="text-gray-500">Country: </span>
                      <span className="text-gray-900">{customer.country}</span>
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

export default PatientHeader
