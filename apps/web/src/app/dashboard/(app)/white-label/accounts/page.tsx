'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Plus, DollarSign, Users, Globe, Trash2, Building2, ChevronRight, X } from 'lucide-react'
import { apiClient } from '../../../../../lib/api-client'
import { useAuthStore } from '../../../../../stores/auth.store'
import { PLAN_META } from '../../../../../lib/features'

interface SubAccount {
  id: string
  name: string
  slug: string
  plan: string
  industry: string | null
  status: string
  memberCount: number
  mrr: number
  createdAt: string
  customDomain?: string
}

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  FREE_TRIAL: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  STARTER:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PRO:        { text: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  BUSINESS:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
}

const DEMO_ACCOUNTS: SubAccount[] = [
  { id: '1', name: 'Sunrise Dental Group', slug: 'sunrise-dental', plan: 'STARTER', industry: 'DENTAL_CLINIC', status: 'ACTIVE', memberCount: 4, mrr: 49, createdAt: new Date(Date.now() - 30 * 86400000).toISOString(), customDomain: 'app.sunrisedental.com' },
  { id: '2', name: 'Peak HVAC Services', slug: 'peak-hvac', plan: 'PRO', industry: 'HVAC', status: 'ACTIVE', memberCount: 7, mrr: 97, createdAt: new Date(Date.now() - 45 * 86400000).toISOString() },
  { id: '3', name: 'Glow Beauty Salon', slug: 'glow-beauty', plan: 'STARTER', industry: 'SALON', status: 'TRIALING', memberCount: 2, mrr: 0, createdAt: new Date(Date.now() - 5 * 86400000).toISOString() },
]

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function SubAccountsPage() {
  const router = useRouter()
  const { organization } = useAuthStore()
  const [accounts, setAccounts] = useState<SubAccount[]>(DEMO_ACCOUNTS)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', plan: 'STARTER', industry: '' })

  const isBusinessPlan = ['BUSINESS', 'ENTERPRISE', 'CUSTOM'].includes((organization?.plan ?? '').toUpperCase())

  useEffect(() => {
    apiClient.get<{ accounts: SubAccount[] }>('/white-label/accounts')
      .then(res => { if ((res as any).accounts?.length) setAccounts((res as any).accounts) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const totalMRR = accounts.reduce((acc, a) => acc + a.mrr, 0)
  const totalMembers = accounts.reduce((acc, a) => acc + a.memberCount, 0)
  const margin = Math.round(totalMRR * 0.4)

  async function createAccount() {
    if (!form.name.trim()) return
    setCreating(true)
    try {
      const res = await apiClient.post<SubAccount>('/white-label/accounts', form) as any
      setAccounts(prev => [res.account ?? res, ...prev])
      setShowCreate(false)
      setForm({ name: '', plan: 'STARTER', industry: '' })
    } catch {
      alert('Failed to create sub-account. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function deleteAccount(id: string) {
    if (!confirm('Remove this sub-account? Their data will be retained but they will lose access.')) return
    setDeleting(id)
    try {
      await apiClient.delete(`/white-label/accounts/${id}`)
      setAccounts(prev => prev.filter(a => a.id !== id))
    } catch {
      alert('Failed to remove account.')
    } finally {
      setDeleting(null)
    }
  }

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

  if (!isBusinessPlan) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Building2 className="h-8 w-8" style={{ color: '#f59e0b' }} />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">White-label sub-accounts</h2>
          <p className="text-sm text-muted-foreground mb-6">Create and manage client accounts under your brand. Requires Business plan.</p>
          <button
            onClick={() => router.push('/dashboard/upgrade?feature=platform:white_label')}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            Upgrade to Business
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Back */}
      <button onClick={() => router.push('/dashboard/white-label')} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        White-label settings
      </button>

      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sub-Accounts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage client accounts under your white-label brand</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 20px rgba(245,158,11,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Sub-Account
        </button>
      </div>

      {/* Stats */}
      <div {...anim(1)} className="grid grid-cols-3 gap-4">
        {[
          { label: 'Sub-Accounts', value: accounts.length, icon: Building2, color: '#f59e0b' },
          { label: 'Monthly Revenue', value: `$${totalMRR}/mo`, icon: DollarSign, color: '#34d399' },
          { label: 'Est. Margin (40%)', value: `$${margin}/mo`, icon: DollarSign, color: '#a855f7' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground tabular">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Accounts table */}
      <div {...anim(2)} className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                {['Account', 'Plan', 'Status', 'Members', 'MRR', 'Domain', ''].map(h => (
                  <th key={h} className="px-5 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {accounts.map((acc, i) => {
                const planMeta = PLAN_COLORS[acc.plan.toUpperCase()] ?? PLAN_COLORS.FREE_TRIAL
                return (
                  <tr
                    key={acc.id}
                    className="transition-colors hover:bg-white/2"
                    style={{ borderBottom: i < accounts.length - 1 ? '1px solid hsl(var(--border))' : undefined }}
                  >
                    <td className="px-5 py-3">
                      <p className="font-medium text-foreground">{acc.name}</p>
                      <p className="text-xs text-muted-foreground">{acc.slug}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: planMeta.text, background: planMeta.bg }}>
                        {acc.plan}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs font-medium" style={{ color: acc.status === 'ACTIVE' ? '#34d399' : acc.status === 'TRIALING' ? '#06b6d4' : '#94a3b8' }}>
                        {acc.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-muted-foreground tabular">{acc.memberCount}</td>
                    <td className="px-5 py-3 font-medium text-foreground tabular">${acc.mrr}/mo</td>
                    <td className="px-5 py-3">
                      {acc.customDomain ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Globe className="h-3 w-3" />
                          {acc.customDomain}
                        </span>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2 justify-end">
                        <button
                          onClick={() => deleteAccount(acc.id)}
                          disabled={deleting === acc.id}
                          className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {accounts.length === 0 && (
            <div className="py-12 text-center text-muted-foreground text-sm">
              No sub-accounts yet. Create one to get started.
            </div>
          )}
        </div>
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create Sub-Account</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Business Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Smith HVAC Services"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Plan</label>
                <select
                  value={form.plan}
                  onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                >
                  {Object.entries(PLAN_META).map(([key, plan]) => (
                    <option key={key} value={key}>{plan.name} — ${plan.price}/mo</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Industry (optional)</label>
                <input
                  type="text"
                  value={form.industry}
                  onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
                  placeholder="e.g. HVAC, DENTAL_CLINIC, SALON"
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              A new organization will be created under your white-label brand. You can impersonate it from the admin portal.
            </p>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={createAccount}
                disabled={creating || !form.name.trim()}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
              >
                {creating ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
