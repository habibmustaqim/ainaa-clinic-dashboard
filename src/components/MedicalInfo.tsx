import React from 'react'
import { Activity, Calendar, Clock, FileText } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/utils/formatters'

interface MedicalInfoProps {
  lastVisitDate: string | null
  totalVisits: number
  medicalHistory?: string[]
  allergies?: string[]
  loading?: boolean
}

const MedicalInfo: React.FC<MedicalInfoProps> = ({
  lastVisitDate,
  totalVisits,
  medicalHistory = [],
  allergies = [],
  loading = false
}) => {
  const getDaysSinceLastVisit = (date: string | null) => {
    if (!date) return null
    const lastVisit = new Date(date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysSince = getDaysSinceLastVisit(lastVisitDate)

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-4 w-full bg-gray-200 rounded"></div>
            <div className="h-4 w-3/4 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-purple-600" />
          Medical Information
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Visit History */}
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-purple-600 flex items-center justify-center">
                <Calendar className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Last Visit</div>
                <div className="text-lg font-semibold text-gray-900">
                  {lastVisitDate ? formatDate(lastVisitDate) : 'No visits recorded'}
                </div>
                {daysSince && (
                  <div className="text-xs text-gray-500 mt-1">
                    {daysSince} days ago
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              <div>
                <div className="text-sm text-gray-600">Total Visits</div>
                <div className="text-lg font-semibold text-gray-900">
                  {totalVisits} {totalVisits === 1 ? 'visit' : 'visits'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Medical History */}
        {medicalHistory.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <FileText className="h-4 w-4 text-gray-600" />
              <h3 className="font-semibold text-gray-900">Medical History</h3>
            </div>
            <div className="space-y-2">
              {medicalHistory.map((item, index) => (
                <div key={index} className="text-sm text-gray-700 pl-6 border-l-2 border-purple-200 py-1">
                  {item}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Allergies */}
        {allergies.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="h-4 w-4 text-red-600" />
              <h3 className="font-semibold text-gray-900">Allergies</h3>
            </div>
            <div className="flex flex-wrap gap-2">
              {allergies.map((allergy, index) => (
                <Badge key={index} variant="destructive" className="text-sm">
                  {allergy}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Empty State */}
        {medicalHistory.length === 0 && allergies.length === 0 && totalVisits === 0 && (
          <div className="text-center py-8 text-gray-500">
            <Activity className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p>No medical history recorded</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default MedicalInfo
