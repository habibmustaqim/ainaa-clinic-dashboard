import React from 'react'
import { Calendar, Clock, TrendingUp, Activity } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AttendanceStats {
  totalVisits: number
  lastVisitDate: string | null
  averageVisitsPerMonth: number
  visitFrequency: 'High' | 'Medium' | 'Low'
  monthlyVisits?: { month: string; count: number }[]
}

interface AttendanceCardProps {
  stats: AttendanceStats
  loading?: boolean
}

const AttendanceCard: React.FC<AttendanceCardProps> = ({ stats, loading = false }) => {
  const formatDate = (date: string | null) => {
    if (!date) return 'No visits recorded'
    return new Date(date).toLocaleDateString('en-MY', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getFrequencyBadge = (frequency: string) => {
    const frequencyMap: Record<string, { variant: 'default' | 'secondary' | 'outline', color: string }> = {
      'High': { variant: 'default', color: 'text-green-600' },
      'Medium': { variant: 'secondary', color: 'text-yellow-600' },
      'Low': { variant: 'outline', color: 'text-gray-600' }
    }
    const info = frequencyMap[frequency] || frequencyMap['Low']
    return <Badge variant={info.variant}>{frequency} Frequency</Badge>
  }

  const getDaysSinceLastVisit = (date: string | null) => {
    if (!date) return null
    const lastVisit = new Date(date)
    const today = new Date()
    const diffTime = Math.abs(today.getTime() - lastVisit.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const daysSince = getDaysSinceLastVisit(stats.lastVisitDate)

  if (loading) {
    return (
      <Card className="animate-pulse">
        <CardHeader>
          <div className="h-6 w-32 bg-gray-200 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="h-20 bg-gray-200 rounded"></div>
            <div className="h-20 bg-gray-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Attendance Statistics
          </div>
          {getFrequencyBadge(stats.visitFrequency)}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Visits */}
        <div className="p-4 bg-muted dark:bg-card rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary dark:bg-primary flex items-center justify-center">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Total Visits</div>
              <div className="text-2xl font-bold text-gray-900">{stats.totalVisits}</div>
            </div>
          </div>
        </div>

        {/* Last Visit */}
        <div className="p-4 bg-muted dark:bg-card rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary dark:bg-primary flex items-center justify-center">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div className="flex-1">
              <div className="text-sm text-gray-600">Last Visit</div>
              <div className="text-base font-semibold text-gray-900">
                {formatDate(stats.lastVisitDate)}
              </div>
              {daysSince && (
                <div className="text-xs text-gray-500 mt-1">
                  {daysSince} days ago
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Average Visits */}
        <div className="p-4 bg-muted dark:bg-card rounded-lg">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary dark:bg-primary flex items-center justify-center">
              <TrendingUp className="h-6 w-6 text-white" />
            </div>
            <div>
              <div className="text-sm text-gray-600">Average Visits/Month</div>
              <div className="text-2xl font-bold text-gray-900">
                {stats.averageVisitsPerMonth.toFixed(1)}
              </div>
            </div>
          </div>
        </div>

        {/* Monthly Breakdown */}
        {stats.monthlyVisits && stats.monthlyVisits.length > 0 && (
          <div className="pt-4 border-t">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Recent Months</h4>
            <div className="space-y-2">
              {stats.monthlyVisits.slice(0, 6).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600">{item.month}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary dark:bg-primary"
                        style={{
                          width: `${Math.min((item.count / Math.max(...stats.monthlyVisits!.map(m => m.count))) * 100, 100)}%`
                        }}
                      ></div>
                    </div>
                    <span className="text-sm font-medium text-gray-900 w-8 text-right">
                      {item.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default AttendanceCard
