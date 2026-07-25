'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Search, ChevronRight, Building2, Filter } from 'lucide-react'
import { apiClient } from '../../../lib/api-client'
import { INDUSTRY_LABELS } from '../../../lib/features'

interface OrgRow {
  id: string
  name: string
  slug: string
  plan: string
  industry: string
  status: 'ACTIVE' | 'TRIALING' | 'SUSPENDED' | 'CANCELED'
  memberCount: number
  mrr: number
  lastActiveAt?: string
  createdAt: string
  trialEndsAt?: string
}

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  FREE_TRIAL: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  STARTER:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PRO:        { text: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  BUSINESS:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  FREE:       { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}

const STATUS_META: Record<string, { text: string; bg: string; label: string }> = {
  ACTIVE:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)', label: 'Active' },
  TRIALING:  { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)', label: 'Trial' },
  SUSPENDED: { text: '#f87171', bg: 'rgba(248,113,113,0.1)', label: 'Suspended' },
  CANCELED:  { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)', label: 'Canceled' },
}

const DEMO_ORGS: OrgRow[] = [
  { id: '1', name: 'Smith HVAC Services', slug: 'smith-hvac', plan: 'PRO', industry: 'HVAC', status: 'ACTIVE', memberCount: 4, mrr: 97, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: '2', name: 'Downtown Dental', slug: 'downtown-dental', plan: 'STARTER', industry: 'DENTAL_CLINIC', status: 'ACTIVE', memberCount: 3, mrr: 49, lastActiveAt: new Date(Date.now() - 2 * 86400000).toISOString(), createdAt: new Date(Date.now() - 60 * 86400000).toISOString() },
  { id: '3', name: 'Glow Beauty Salon', slug: 'glow-beauty', plan: 'FREE_TRIAL', industry: 'SALON', status: 'TRIALING', memberCount: 2, mrr: 0, lastActiveAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), trialEndsAt: new Date(Date.now() + 11 * 86400000).toISOString() },
  { id: '4', name: 'Peak Law Group', slug: 'peak-law', plan: 'BUSINESS', industry: 'LAW_FIRM', status: 'ACTIVE', memberCount: 8, mrr: 197, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 90 * 86400000).toISOString() },
  { id: '5', name: 'Chill Restaurant', slug: 'chill-restaurant', plan: 'STARTER', industry: 'RESTAURANT', status: 'ACTIVE', memberCount: 5, mrr: 49, lastActiveAt: new Date(Date.now() - 5 * 86400000).toISOString(), createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: '6', name: 'Bright Minds ABA', slug: 'bright-minds', plan: 'STARTER', industry: 'ABA_PROVIDER', status: 'ACTIVE', memberCount: 6, mrr: 49, lastActiveAt: new Date(Date.now() - 86400000).toISOString(), createdAt: new Date(Date.now() - 20 * 86400000).toISOString() },
  { id: '7', name: 'Alpha Realty Group', slug: 'alpha-realty', plan: 'PRO', industry: 'REAL_ESTATE', status: 'ACTIVE', memberCount: 12, mrr: 97, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 120 * 86400000).toISOString() },
  { id: '8', name: 'CodeLaunch Agency', slug: 'codelaunch', plan: 'BUSINESS', industry: 'TECHNOLOGY', status: 'ACTIVE', memberCount: 15, mrr: 197, lastActiveAt: new Date().toISOString(), createdAt: new Date(Date.now() - 180 * 86400000).toISOString() },
]

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

export default function AdminBusinessesPage() {
  const router = useRouter()
  const [orgs, setOrgs] = useState<OrgRow[]>(DEMO_ORGS)
  const [search, setSearch] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiClient.get<{ organizations: OrgRow[] }>('/admin/organizations')
      .then(data => { if (data.organizations?.length) setOrgs(data.organizations) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const filtered = orgs.filter(o => {
    const matchSearch = !search || o.name.toLowerCase().includes(search.toLowerCase()) || o.slug.includes(search.toLowerCase())
    const matchPlan = planFilter === 'all' || o.plan.toUpperCase() === planFilter
    return matchSearch && matchPlan
  })

  const totalMRR = filtered.reduce((acc, o) => acc + o.mrr, 0)

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      <div className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Businesses</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{orgs.length} total · ${totalMRR.toLocaleString()}/mo MRR</p>
        </div>
      </div>

      {/* Filters */}
      <div className="kv-anim flex gap-3 flex-wrap" style={{ animationDelay: '0.11s' }}>
        <div className="flex items-center gap-2 rounded-xl px-3 py-2 flex-1 min-w-[200px]" style={cardStyle}>
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search businesses…"
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none flex-1"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'FREE_TRIAL', 'STARTER', 'PRO', 'BUSINESS'].map(plan => (
            <button
              key={plan}
              onClick={() => setPlanFilter(plan)}
              className="px-3 py-2 rounded-xl text-xs font-medium transition-all"
              style={planFilter === plan
                ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)', color: 'white' }
                : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
              }
            >
              {plan === 'all' ? 'All' : plan.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="kv-anim rounded-xl overflow-hidden" style={{ ...cardStyle, animationDelay: '0.18s' }}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                {['Business', 'Industry', 'Plan', 'Status', 'MRR', 'Members', 'Last Active', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((org, i) => {
                const planMeta = PLAN_COLORS[org.plan.toUpperCase()] ?? PLAN_COLORS.FREE
                const statusMeta = STATUS_META[org.status] ?? STATUS_META.ACTIVE
                return (
                  <tr
                    key={org.id}
                    className="cursor-pointer transition-colors hover:bg-white/2"
                    style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : undefined }}
                    onClick={() => router.push(`/admin/businesses/${org.id}`)}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{org.name}</p>
                      <p className="text-xs text-muted-foreground">{org.slug}</p>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">{INDUSTRY_LABELS[org.industry] ?? org.industry}</td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: planMeta.text, background: planMeta.bg }}>
                        {org.plan}
                      </span>
                      {org.trialEndsAt && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">
                          {Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000)}d left
                        </p>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: statusMeta.text, background: statusMeta.bg }}>
                        {statusMeta.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-medium text-foreground tabular">${org.mrr}/mo</td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{org.memberCount}</td>
                    <td className="px-5 py-3 text-muted-foreground text-xs">
                      {org.lastActiveAt ? new Date(org.lastActiveAt).toLocaleDateString() : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">No businesses found</div>
          )}
        </div>
      </div>
    </div>
  )
}
