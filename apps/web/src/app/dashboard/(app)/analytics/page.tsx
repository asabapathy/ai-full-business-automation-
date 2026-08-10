'use client'

import { apiClient } from '../../../../lib/api-client'
import { useState, useEffect } from 'react'

interface OverviewData {
  revenue: { total: number; growth: number }
  contacts: { total: number; new: number; growth: number }
  deals: { total: number; won: number; pipeline: number }
  appointments: { total: number; upcoming: number }
  campaigns: { total: number; active: number }
  invoices: { total: number; outstanding: number; overdue: number }
}

interface RevenuePoint {
  date: string
  revenue: number
  invoices: number
}

const DEMO_OVERVIEW: OverviewData = {
  revenue: { total: 124500, growth: 18.4 },
  contacts: { total: 847, new: 93, growth: 12.3 },
  deals: { total: 34, won: 12, pipeline: 287000 },
  appointments: { total: 156, upcoming: 23 },
  campaigns: { total: 8, active: 3 },
  invoices: { total: 45, outstanding: 34200, overdue: 8900 },
}

const DEMO_REVENUE: RevenuePoint[] = Array.from({ length: 30 }, (_, i) => ({
  date: new Date(Date.now() - (29 - i) * 86400000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  revenue: Math.floor(2000 + Math.random() * 6000),
  invoices: Math.floor(1 + Math.random() * 5),
}))

const DEMO_PIPELINE = [
  { stage: 'Lead', count: 45, value: 892000 },
  { stage: 'Qualified', count: 28, value: 654000 },
  { stage: 'Proposal', count: 15, value: 412000 },
  { stage: 'Negotiation', count: 8, value: 287000 },
  { stage: 'Won', count: 12, value: 198000 },
]

const PIPELINE_COLORS = ['#06b6d4', '#0ea5e9', '#38bdf8', '#7dd3fc', '#10b981']

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function AnalyticsPage() {
  const [overview, setOverview] = useState<OverviewData>(DEMO_OVERVIEW)
  const [revenue, setRevenue] = useState<RevenuePoint[]>(DEMO_REVENUE)
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setLoading(true)
    void (async () => {
      try {
        const [ovData, revData] = await Promise.all([
          apiClient.get(`/analytics/overview?period=${period}`),
          apiClient.get(`/analytics/revenue?period=${period}`),
        ]) as any[]
        if (ovData?.revenue) setOverview(ovData)
        if (Array.isArray(revData?.points)) setRevenue(revData.points)
      } catch {
      } finally {
        setLoading(false)
      }
    })()
  }, [period])

  const maxRevenue = Math.max(...revenue.map(r => r.revenue))

  const statCards = [
    { label: 'Total Revenue', value: `$${(overview.revenue.total / 1000).toFixed(0)}k`, sub: `+${overview.revenue.growth}% growth`, color: 'text-emerald-400' },
    { label: 'Total Contacts', value: overview.contacts.total.toLocaleString(), sub: `+${overview.contacts.new} this period`, color: 'text-primary' },
    { label: 'Pipeline Value', value: `$${(overview.deals.pipeline / 1000).toFixed(0)}k`, sub: `${overview.deals.total} active deals`, color: 'text-violet-400' },
    { label: 'Outstanding', value: `$${(overview.invoices.outstanding / 1000).toFixed(0)}k`, sub: `$${(overview.invoices.overdue / 1000).toFixed(0)}k overdue`, color: 'text-amber-400' },
    { label: 'Appointments', value: overview.appointments.upcoming.toString(), sub: `${overview.appointments.total} total booked`, color: 'text-primary' },
    { label: 'Deals Won', value: overview.deals.won.toString(), sub: `of ${overview.deals.total} active`, color: 'text-emerald-400' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1400px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-muted-foreground text-sm mt-1">Business performance overview</p>
        </div>
        <div className="flex gap-2">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className="px-3 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={period === p
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }
                : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
              }
            >
              {p === '7d' ? '7 Days' : p === '30d' ? '30 Days' : '90 Days'}
            </button>
          ))}
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        {statCards.map((card, i) => (
          <div
            key={card.label}
            {...anim(i + 1)}
            className="kv-anim rounded-xl border p-4"
            style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))', animationDelay: `${0.11 + i * 0.06}s` }}
          >
            <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wide">{card.label}</p>
            <p className={`text-2xl font-bold tabular ${card.color}`}>{card.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart */}
      <div
        className="kv-anim rounded-xl border p-6"
        style={{ animationDelay: '0.53s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <h2 className="text-sm font-semibold text-foreground mb-4">Revenue Over Time</h2>
        <div className="flex items-end gap-1" style={{ height: 192 }}>
          {revenue.slice(-20).map((point, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
              <div
                className="w-full rounded-t transition-all duration-300 hover:opacity-100 opacity-75"
                style={{
                  height: `${(point.revenue / maxRevenue) * 100}%`,
                  background: 'linear-gradient(to top, #06b6d4, #0ea5e9)',
                  minHeight: 2,
                }}
                title={`${point.date}: $${point.revenue.toLocaleString()}`}
              />
            </div>
          ))}
        </div>
        <div className="flex justify-between mt-2 text-xs text-muted-foreground">
          <span>{revenue[revenue.length - 20]?.date}</span>
          <span>{revenue[revenue.length - 1]?.date}</span>
        </div>
      </div>

      {/* Pipeline funnel + Top Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div
          className="kv-anim rounded-xl border p-6"
          style={{ animationDelay: '0.60s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Sales Pipeline Funnel</h2>
          <div className="space-y-3">
            {DEMO_PIPELINE.map((stage, i) => {
              const maxCount = DEMO_PIPELINE[0]!.count
              return (
                <div key={stage.stage}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-foreground/80">{stage.stage}</span>
                    <span className="text-muted-foreground tabular">{stage.count} deals · ${(stage.value / 1000).toFixed(0)}k</span>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${(stage.count / maxCount) * 100}%`,
                        background: PIPELINE_COLORS[i] ?? '#06b6d4',
                        boxShadow: `0 0 8px ${PIPELINE_COLORS[i] ?? '#06b6d4'}60`,
                      }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div
          className="kv-anim rounded-xl border p-6"
          style={{ animationDelay: '0.67s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
        >
          <h2 className="text-sm font-semibold text-foreground mb-4">Top Metrics</h2>
          <div className="space-y-4">
            {[
              { label: 'Avg Deal Size', value: `$${Math.round(overview.deals.pipeline / Math.max(overview.deals.total, 1)).toLocaleString()}`, icon: '💰' },
              { label: 'Win Rate', value: `${Math.round((overview.deals.won / Math.max(overview.deals.total, 1)) * 100)}%`, icon: '🏆' },
              { label: 'New Contacts / Period', value: overview.contacts.new.toString(), icon: '👥' },
              { label: 'Contact Growth', value: `+${overview.contacts.growth}%`, icon: '📈' },
              { label: 'Active Campaigns', value: overview.campaigns.active.toString(), icon: '📣' },
              { label: 'Overdue Invoices', value: `$${(overview.invoices.overdue / 1000).toFixed(0)}k`, icon: '⚠️' },
            ].map(metric => (
              <div key={metric.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{metric.icon}</span>
                  <span className="text-sm text-muted-foreground">{metric.label}</span>
                </div>
                <span className="text-sm font-semibold text-foreground tabular">{metric.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div
          className="fixed bottom-4 right-4 text-white text-sm px-3 py-2 rounded-xl"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
        >
          Refreshing data...
        </div>
      )}
    </div>
  )
}
