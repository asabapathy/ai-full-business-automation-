'use client'

import { useState, useEffect } from 'react'
import { Building2, Users, DollarSign, TrendingUp, Activity, Clock } from 'lucide-react'
import { apiClient } from '../../lib/api-client'
import { INDUSTRY_LABELS } from '../../lib/features'

interface AdminStats {
  totalOrgs: number
  activeTrials: number
  totalMRR: number
  activeSubscriptions: number
  newSignupsThisMonth: number
  planBreakdown: Record<string, number>
  industryBreakdown: Record<string, number>
  recentOrgs: Array<{
    id: string
    name: string
    plan: string
    industry: string
    createdAt: string
    memberCount: number
  }>
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  FREE_TRIAL: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  STARTER:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PRO:        { text: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  BUSINESS:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  FREE:       { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

// Demo stats for when API isn't seeded
const DEMO_STATS: AdminStats = {
  totalOrgs: 47,
  activeTrials: 12,
  totalMRR: 3891,
  activeSubscriptions: 35,
  newSignupsThisMonth: 9,
  planBreakdown: { FREE_TRIAL: 12, STARTER: 15, PRO: 14, BUSINESS: 6 },
  industryBreakdown: { HVAC: 8, DENTAL_CLINIC: 6, SALON: 5, RESTAURANT: 4, LAW_FIRM: 4, OTHER: 20 },
  recentOrgs: [
    { id: '1', name: 'Smith HVAC Services', plan: 'PRO', industry: 'HVAC', createdAt: new Date(Date.now() - 86400000).toISOString(), memberCount: 4 },
    { id: '2', name: 'Downtown Dental', plan: 'STARTER', industry: 'DENTAL_CLINIC', createdAt: new Date(Date.now() - 2 * 86400000).toISOString(), memberCount: 3 },
    { id: '3', name: 'Glow Beauty Salon', plan: 'FREE_TRIAL', industry: 'SALON', createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), memberCount: 2 },
    { id: '4', name: 'Peak Law Group', plan: 'BUSINESS', industry: 'LAW_FIRM', createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), memberCount: 8 },
    { id: '5', name: 'Chill Restaurant', plan: 'STARTER', industry: 'RESTAURANT', createdAt: new Date(Date.now() - 7 * 86400000).toISOString(), memberCount: 5 },
  ],
}

export default function AdminOverviewPage() {
  const [stats, setStats] = useState<AdminStats>(DEMO_STATS)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<AdminStats>('/admin/stats')
      .then(data => setStats(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const statCards = [
    { label: 'Total Businesses', value: stats.totalOrgs, icon: Building2, color: '#06b6d4' },
    { label: 'Active Trials', value: stats.activeTrials, icon: Clock, color: '#a855f7' },
    { label: 'Monthly Revenue', value: `$${stats.totalMRR.toLocaleString()}`, icon: DollarSign, color: '#34d399' },
    { label: 'Paid Subscriptions', value: stats.activeSubscriptions, icon: TrendingUp, color: '#f59e0b' },
    { label: 'New This Month', value: stats.newSignupsThisMonth, icon: Users, color: '#60a5fa' },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      <div {...anim(0)} className="kv-anim">
        <h1 className="text-2xl font-bold text-foreground">Platform Overview</h1>
        <p className="text-muted-foreground text-sm mt-0.5">All businesses using Kanavu AI</p>
      </div>

      {/* Stats */}
      <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-5 gap-4">
        {statCards.map(card => (
          <div key={card.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-muted-foreground">{card.label}</p>
              <card.icon className="h-4 w-4" style={{ color: card.color }} />
            </div>
            <p className="text-2xl font-bold text-foreground tabular">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan breakdown */}
        <div {...anim(2)} className="kv-anim rounded-xl p-5" style={cardStyle}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Businesses by Plan</h2>
          <div className="space-y-3">
            {Object.entries(stats.planBreakdown).map(([plan, count]) => {
              const meta = PLAN_COLORS[plan] ?? PLAN_COLORS.FREE
              const pct = Math.round((count / stats.totalOrgs) * 100)
              return (
                <div key={plan}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: meta.text, background: meta.bg }}>{plan}</span>
                    <span className="text-xs text-muted-foreground tabular">{count} ({pct}%)</span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: meta.text }} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Industry breakdown */}
        <div {...anim(3)} className="kv-anim rounded-xl p-5" style={cardStyle}>
          <h2 className="text-sm font-semibold text-foreground mb-4">Businesses by Industry</h2>
          <div className="space-y-2">
            {Object.entries(stats.industryBreakdown).sort(([, a], [, b]) => b - a).map(([industry, count]) => (
              <div key={industry} className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{INDUSTRY_LABELS[industry] ?? industry}</span>
                <span className="text-sm font-medium text-foreground tabular">{count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent signups */}
      <div {...anim(4)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="text-sm font-semibold text-foreground">Recent Signups</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                {['Business', 'Industry', 'Plan', 'Members', 'Joined'].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {stats.recentOrgs.map((org, i) => {
                const planMeta = PLAN_COLORS[org.plan.toUpperCase()] ?? PLAN_COLORS.FREE
                return (
                  <tr key={org.id} style={{ borderBottom: i < stats.recentOrgs.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-5 py-3 font-medium text-foreground">{org.name}</td>
                    <td className="px-5 py-3 text-muted-foreground">{INDUSTRY_LABELS[org.industry] ?? org.industry}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: planMeta.text, background: planMeta.bg }}>
                        {org.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{org.memberCount}</td>
                    <td className="px-5 py-3 text-muted-foreground">{new Date(org.createdAt).toLocaleDateString()}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
