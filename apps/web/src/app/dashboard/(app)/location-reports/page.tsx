'use client'

import { useState, useEffect, useMemo } from 'react'
import { MapPin, TrendingUp, Calendar, Users, Star, Trophy, Columns } from 'lucide-react'
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

// Demo locations — used as fallback when the API has no real location data.
const LOCATIONS = [
  { id: 'all', name: 'All Locations', color: '#06b6d4' },
  { id: 'downtown', name: 'Downtown', color: '#34d399' },
  { id: 'northside', name: 'Northside', color: '#a78bfa' },
  { id: 'westend', name: 'West End', color: '#fbbf24' },
]

// Deterministic revenue shares for the demo locations
const LOCATION_SHARE: Record<string, number> = { all: 1, downtown: 0.45, northside: 0.32, westend: 0.23 }

const LOCATION_PALETTE = ['#34d399', '#a78bfa', '#fbbf24', '#f87171', '#60a5fa', '#06b6d4']

const DEMO_SUMMARIES: LocationSummary[] = [
  { location: { id: 'downtown', name: 'Downtown' }, revenue30d: 21150, appointments30d: 58, newContacts30d: 24, avgRating: 4.8, reviewCount: 41 },
  { location: { id: 'northside', name: 'Northside' }, revenue30d: 15040, appointments30d: 42, newContacts30d: 17, avgRating: 4.6, reviewCount: 28 },
  { location: { id: 'westend', name: 'West End' }, revenue30d: 10810, appointments30d: 31, newContacts30d: 12, avgRating: 4.9, reviewCount: 19 },
]

const DEMO_AGGREGATE: AggregateMetrics = {
  revenue30d: 47000,
  revenueChange30d: 8,
  appointments30d: 131,
  newContacts30d: 53,
  invoicesPaid: 96,
  invoicesOverdue: 4,
  locationCount: 3,
}

const DEMO_TOP: TopPerformers = {
  topByRevenue: 'Downtown',
  topByAppointments: 'Downtown',
  topByRating: 'West End',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

export default function LocationReportsPage() {
  const [summaries, setSummaries] = useState<LocationSummary[]>([])
  const [aggregate, setAggregate] = useState<AggregateMetrics | null>(null)
  const [topPerformers, setTopPerformers] = useState<TopPerformers | null>(null)
  const [metric, setMetric] = useState<'revenue' | 'appointments' | 'contacts'>('revenue')
  const [loading, setLoading] = useState(true)
  const [location, setLocation] = useState('all')
  const [compareMode, setCompareMode] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [sumRes, aggRes, topRes] = await Promise.all([
        apiClient.get('/location-reports/summaries') as any,
        apiClient.get('/location-reports/aggregate') as any,
        apiClient.get('/location-reports/top-performers') as any,
      ])
      const realSummaries: LocationSummary[] = sumRes.summaries ?? []
      // Prefer real location data from the API; fall back to demo locations
      setSummaries(realSummaries.length > 0 ? realSummaries : DEMO_SUMMARIES)
      setAggregate(aggRes ?? DEMO_AGGREGATE)
      setTopPerformers(topRes ?? DEMO_TOP)
    } catch {
      setSummaries(DEMO_SUMMARIES)
      setAggregate(DEMO_AGGREGATE)
      setTopPerformers(DEMO_TOP)
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

  // Pill list: real locations from the API when available, demo names otherwise
  const locations = useMemo(() => {
    if (summaries.length === 0) return LOCATIONS
    return [
      { id: 'all', name: 'All Locations', color: '#06b6d4' },
      ...summaries.map((s, i) => {
        const demo = LOCATIONS.find(l => l.id === s.location.id)
        return { id: s.location.id, name: s.location.name, color: demo?.color ?? LOCATION_PALETTE[i % LOCATION_PALETTE.length] }
      }),
    ]
  }, [summaries])

  const locColor = (id: string) => locations.find(l => l.id === id)?.color ?? '#06b6d4'

  const totalRevenue = useMemo(() => summaries.reduce((a, s) => a + s.revenue30d, 0), [summaries])

  // Deterministic share of totals for the selected location
  const share = (id: string) => {
    if (id === 'all') return 1
    const s = summaries.find(x => x.location.id === id)
    if (s && totalRevenue > 0) return s.revenue30d / totalRevenue
    return LOCATION_SHARE[id] ?? 1
  }

  // Aggregate stats filtered to the selected location
  const displayAggregate = useMemo(() => {
    if (!aggregate || location === 'all') return aggregate
    const sel = summaries.find(s => s.location.id === location)
    const f = share(location)
    return {
      ...aggregate,
      revenue30d: sel ? sel.revenue30d : Math.round(aggregate.revenue30d * f),
      appointments30d: sel ? sel.appointments30d : Math.round(aggregate.appointments30d * f),
      newContacts30d: sel ? sel.newContacts30d : Math.round(aggregate.newContacts30d * f),
      invoicesPaid: Math.round(aggregate.invoicesPaid * f),
      invoicesOverdue: Math.round(aggregate.invoicesOverdue * f),
      locationCount: 1,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aggregate, location, summaries, totalRevenue])

  const filteredSummaries = location === 'all' ? summaries : summaries.filter(s => s.location.id === location)

  const metricValue = (s: LocationSummary) =>
    metric === 'revenue' ? fmt(s.revenue30d) :
    metric === 'appointments' ? s.appointments30d.toString() :
    s.newContacts30d.toString()

  const sorted = [...filteredSummaries].sort((a, b) =>
    metric === 'revenue' ? b.revenue30d - a.revenue30d :
    metric === 'appointments' ? b.appointments30d - a.appointments30d :
    b.newContacts30d - a.newContacts30d
  )

  const maxVal = sorted[0]
    ? (metric === 'revenue' ? sorted[0].revenue30d : metric === 'appointments' ? sorted[0].appointments30d : sorted[0].newContacts30d)
    : 1

  // Rows for compare mode: revenue, jobs, avg ticket + revenue share per location
  const compareRows = useMemo(() => {
    const rows = summaries.map(s => ({
      id: s.location.id,
      name: s.location.name,
      color: locColor(s.location.id),
      revenue: s.revenue30d,
      jobs: s.appointments30d,
      avgTicket: s.appointments30d > 0 ? s.revenue30d / s.appointments30d : 0,
      sharePct: totalRevenue > 0 ? (s.revenue30d / totalRevenue) * 100 : 0,
    }))
    return rows.sort((a, b) => b.revenue - a.revenue)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaries, locations, totalRevenue])

  const winnerId = compareRows[0]?.id

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Multi-Location Reports</h1>
        <p className="text-sm text-muted-foreground mt-1">30-day performance across all locations</p>
      </div>

      {/* Location pill switcher + compare toggle */}
      <div className="flex items-center gap-2 flex-wrap">
        {locations.map(l => {
          const active = !compareMode && location === l.id
          return (
            <button
              key={l.id}
              onClick={() => { setLocation(l.id); setCompareMode(false) }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
              style={active
                ? { background: `${l.color}26`, color: l.color, border: `1px solid ${l.color}` }
                : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
            >
              <MapPin className="h-3 w-3" />
              {l.name}
            </button>
          )
        })}
        <div className="flex-1" />
        <button
          onClick={() => setCompareMode(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all"
          style={compareMode
            ? { background: 'rgba(6,182,212,0.15)', color: '#06b6d4', border: '1px solid #06b6d4' }
            : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}
        >
          <Columns className="h-3 w-3" />
          Compare all
        </button>
      </div>

      {displayAggregate && !compareMode && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Revenue (30d)', value: fmt(displayAggregate.revenue30d), change: location === 'all' ? displayAggregate.revenueChange30d : undefined, icon: TrendingUp, hexColor: '#34d399' },
            { label: 'Appointments', value: displayAggregate.appointments30d, icon: Calendar, hexColor: '#06b6d4' },
            { label: 'New Contacts', value: displayAggregate.newContacts30d, icon: Users, hexColor: '#a78bfa' },
            { label: 'Locations', value: displayAggregate.locationCount, icon: MapPin, hexColor: '#fb923c' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
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

      {compareMode ? (
        /* Side-by-side comparison of all locations */
        <div className="rounded-xl p-5" style={cardStyle}>
          <h2 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <Columns className="h-4 w-4" style={{ color: '#06b6d4' }} />
            Location Comparison — 30 days
          </h2>
          {compareRows.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No locations found</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table className="w-full text-sm" style={{ borderCollapse: 'collapse', minWidth: 560 }}>
                <thead>
                  <tr className="text-left" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    <th className="py-2 pr-3 text-xs font-medium text-muted-foreground">Location</th>
                    <th className="py-2 pr-3 text-xs font-medium text-muted-foreground text-right">Revenue</th>
                    <th className="py-2 pr-3 text-xs font-medium text-muted-foreground text-right">Jobs</th>
                    <th className="py-2 pr-3 text-xs font-medium text-muted-foreground text-right">Avg Ticket</th>
                    <th className="py-2 text-xs font-medium text-muted-foreground" style={{ width: '32%' }}>Revenue Share</th>
                  </tr>
                </thead>
                <tbody>
                  {compareRows.map(r => {
                    const isWinner = r.id === winnerId
                    return (
                      <tr
                        key={r.id}
                        style={{
                          borderBottom: '1px solid hsl(var(--border))',
                          background: isWinner ? `${r.color}14` : 'transparent',
                        }}
                      >
                        <td className="py-3 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: r.color }} />
                            <span className="font-medium text-foreground">{r.name}</span>
                            {isWinner && <Trophy className="h-3.5 w-3.5" style={{ color: '#fbbf24' }} />}
                          </div>
                        </td>
                        <td className="py-3 pr-3 text-right font-semibold text-foreground">{fmt(r.revenue)}</td>
                        <td className="py-3 pr-3 text-right text-foreground">{r.jobs}</td>
                        <td className="py-3 pr-3 text-right text-foreground">{fmt(Math.round(r.avgTicket))}</td>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-2 rounded-full overflow-hidden flex-1" style={{ background: 'hsl(var(--muted))' }}>
                              <div
                                className="h-full rounded-full transition-all duration-500"
                                style={{ width: `${r.sharePct}%`, background: r.color }}
                              />
                            </div>
                            <span className="text-xs text-muted-foreground w-9 text-right">{r.sharePct.toFixed(0)}%</span>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <>
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

          <div className="rounded-xl p-5" style={cardStyle}>
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
                        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: locColor(s.location.id) }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
