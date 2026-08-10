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
        <h1 className="text-2xl font-bold text-foreground">Multi-Location Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">30-day performance across all locations</p>
      </div>

      {aggregate && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenue (30d)', value: fmt(aggregate.revenue30d), change: aggregate.revenueChange30d, icon: TrendingUp, hexColor: '#34d399' },
            { label: 'Appointments', value: aggregate.appointments30d, icon: Calendar, hexColor: '#06b6d4' },
            { label: 'New Contacts', value: aggregate.newContacts30d, icon: Users, hexColor: '#a78bfa' },
            { label: 'Locations', value: aggregate.locationCount, icon: MapPin, hexColor: '#fb923c' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2 mb-2">
                <s.icon className="h-4 w-4" style={{ color: s.hexColor }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
              {s.change !== undefined && (
                <p className="text-xs mt-1" style={{ color: s.change >= 0 ? '#34d399' : '#f87171' }}>
                  {s.change >= 0 ? '▲' : '▼'} {Math.abs(s.change)}% vs prev 30d
                </p>
              )}
            </div>
          ))}
        </div>
      )}

      {topPerformers && (
        <div
          className="rounded-xl p-5"
          style={{ border: '1px solid hsl(var(--border))', background: 'linear-gradient(to right, rgba(251,191,36,0.08), rgba(251,146,60,0.08))' }}
        >
          <h2 className="font-semibold text-foreground flex items-center gap-2 mb-4">
            <Trophy className="h-4 w-4" style={{ color: '#fbbf24' }} />
            Top Performers
          </h2>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Top by Revenue', value: topPerformers.topByRevenue },
              { label: 'Top by Appointments', value: topPerformers.topByAppointments },
              { label: 'Top by Rating', value: topPerformers.topByRating },
            ].map(t => (
              <div key={t.label} className="rounded-lg p-3 text-center" style={{ background: 'hsl(var(--card))' }}>
                <p className="text-xs text-muted-foreground mb-1">{t.label}</p>
                <p className="font-semibold text-foreground">{t.value ?? '—'}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-xl p-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="font-semibold text-foreground">Location Comparison</h2>
          <div className="flex gap-1">
            {(['revenue', 'appointments', 'contacts'] as const).map(m => (
              <button
                key={m}
                onClick={() => setMetric(m)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${metric === m ? '' : 'text-muted-foreground'}`}
                style={metric === m
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--muted))' }}
              >
                {m.charAt(0).toUpperCase() + m.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Loading...</div>
        ) : sorted.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">No locations found</div>
        ) : (
          <div className="space-y-3">
            {sorted.map((s, i) => {
              const val = metric === 'revenue' ? s.revenue30d : metric === 'appointments' ? s.appointments30d : s.newContacts30d
              const pct = maxVal > 0 ? (val / maxVal) * 100 : 0
              return (
                <div key={s.location.id}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}</span>
                      <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-sm font-medium text-foreground">{s.location.name}</span>
                      {s.location.city && <span className="text-xs text-muted-foreground">{s.location.city}, {s.location.state}</span>}
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      {s.avgRating && (
                        <span className="flex items-center gap-0.5 text-xs" style={{ color: '#fbbf24' }}>
                          <Star className="h-3 w-3 fill-current" />
                          {s.avgRating}
                        </span>
                      )}
                      <span className="font-semibold text-foreground">{metricValue(s)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: '#06b6d4' }} />
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
