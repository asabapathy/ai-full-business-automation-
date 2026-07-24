'use client'

import { useState, useEffect } from 'react'
import { MapPin, TrendingUp, Calendar, Users, Star, Trophy } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface LocationSummary {
  location: { id: string; name: string; city?: string; state?: string }
  revenue30d: number
  appointments30d: number
  newContacts30d: number
  avgRating: number | null
  reviewCount: number
}

interface AggregateMetrics {
  revenue30d: number
  revenueChange30d: number
  appointments30d: number
  newContacts30d: number
  invoicesPaid: number
  invoicesOverdue: number
  locationCount: number
}

interface TopPerformers {
  topByRevenue: string | null
  topByAppointments: string | null
  topByRating: string | null
}

export default function LocationReportsPage() {
  const [summaries, setSummaries] = useState<LocationSummary[]>([])
  const [aggregate, setAggregate] = useState<AggregateMetrics | null>(null)
  const [topPerformers, setTopPerformers] = useState<TopPerformers | null>(null)
  const [metric, setMetric] = useState<'revenue' | 'appointments' | 'contacts'>('revenue')
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, aggRes, topRes] = await Promise.all([
        apiClient.get('/location-reports/summaries') as any,
        apiClient.get('/location-reports/aggregate') as any,
        apiClient.get('/location-reports/top-performers') as any,
      ])
      setSummaries(sumRes.summaries ?? [])
      setAggregate(aggRes)
      setTopPerformers(topRes)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

  const metricValue = (s: LocationSummary) =>
    metric === 'revenue' ? fmt(s.revenue30d) :
    metric === 'appointments' ? s.appointments30d.toString() :
    s.newContacts30d.toString()

  const sorted = [...summaries].sort((a, b) =>
    metric === 'revenue' ? b.revenue30d - a.revenue30d :
    metric === 'appointments' ? b.appointments30d - a.appointments30d :
    b.newContacts30d - a.newContacts30d
  )

  const maxVal = sorted[0]
    ? (metric === 'revenue' ? sorted[0].revenue30d : metric === 'appointments' ? sorted[0].appointments30d : sorted[0].newContacts30d)
    : 1

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Multi-Location Reports</h1>
        <p className="text-sm text-gray-500 mt-1">30-day performance across all locations</p>
      </div>

      {aggregate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenue (30d)', value: fmt(aggregate.revenue30d), change: aggregate.revenueChange30d, icon: TrendingUp, color: 'text-green-600' },
            { label: 'Appointments', value: aggregate.appointments30d, icon: Calendar, color: 'text-blue-600' },
            { label: 'New Contacts', value: aggregate.newContacts30d, icon: Users, color: 'text-purple-600' },
            { label: 'Locations', value: aggregate.locationCount, icon: MapPin, color: 'text-orange-600' },
          ].map(s => (
            <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
              <div className="flex items-center gap-2 mb-2">
                <s.icon className={`h-4 w-4 ${s.color}`} />
                <span className="text-xs text-gray-500">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              {s.change !== undefined && (
                <p className={`text-xs mt-1 ${s.change >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change)}% vs prev 30d
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {topPerformers && (
        <div className="rounded-xl border bg-gradient-to-r from-yellow-50 to-orange-50 p-5">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4 text-yellow-600" />
            Top Performers
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Top by Revenue', value: topPerformers.topByRevenue },
              { label: 'Top by Appointments', value: topPerformers.topByAppointments },
              { label: 'Top by Rating', value: topPerformers.topByRating },
            ].map(t => (
              <div key={t.label} className="bg-white rounded-lg p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{t.label}</p>
                <p className="font-semibold text-gray-900">{t.value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-gray-900">Location Comparison</h2>
          <div className="flex gap-1">
            {(['revenue', 'appointments', 'contacts'] as const).map(m => (
              <button key={m} onClick={() => setMetric(m)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${metric === m ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-gray-400">No locations found</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const val = metric === 'revenue' ? s.revenue30d : metric === 'appointments' ? s.appointments30d : s.newContacts30d
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
              return (
                <div key={s.location.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <MapPin className="h-3.5 w-3.5 text-gray-400" />
                      <span className="text-sm font-medium text-gray-900">{s.location.name}</span>
                      {s.location.city && <span className="text-xs text-gray-500">{s.location.city}, {s.location.state}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {s.avgRating && (
                        <span className="flex items-center gap-0.5 text-yellow-600 text-xs">
                          <Star className="h-3 w-3 fill-current" />
                          {s.avgRating}
                        </span>
                      )}
                      <span className="font-semibold text-gray-900">{metricValue(s)}</span>
                    </div>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-blue-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
