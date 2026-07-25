'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, UserCheck, Ban, Sparkles, ShieldCheck, ChevronDown, Check, AlertCircle } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { INDUSTRY_LABELS, PLAN_META, getOrgFeatures, isHipaaIndustry, type Feature } from '../../../../lib/features'

interface OrgDetail {
  id: string
  name: string
  slug: string
  plan: string
  industry: string
  status: string
  memberCount: number
  mrr: number
  createdAt: string
  trialEndsAt?: string
  members: Array<{ id: string; firstName: string; lastName: string; email: string; role: string }>
  featureFlags: Record<string, boolean>
  subscription?: { status: string; currentPeriodEnd?: string }
}

const PLAN_COLORS: Record<string, { text: string; bg: string }> = {
  FREE_TRIAL: { text: '#06b6d4', bg: 'rgba(6,182,212,0.1)' },
  STARTER:    { text: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  PRO:        { text: '#a855f7', bg: 'rgba(168,85,247,0.1)' },
  BUSINESS:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.1)' },
  FREE:       { text: '#94a3b8', bg: 'rgba(148,163,184,0.1)' },
}

const DEMO_ORG: OrgDetail = {
  id: '1',
  name: 'Smith HVAC Services',
  slug: 'smith-hvac',
  plan: 'PRO',
  industry: 'HVAC',
  status: 'ACTIVE',
  memberCount: 4,
  mrr: 97,
  createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  members: [
    { id: 'u1', firstName: 'John', lastName: 'Smith', email: 'john@smithhvac.com', role: 'ADMIN' },
    { id: 'u2', firstName: 'Lisa', lastName: 'Smith', email: 'lisa@smithhvac.com', role: 'MANAGER' },
    { id: 'u3', firstName: 'Mark', lastName: 'Jones', email: 'mark@smithhvac.com', role: 'MEMBER' },
    { id: 'u4', firstName: 'Sarah', lastName: 'Lee', email: 'sarah@smithhvac.com', role: 'MEMBER' },
  ],
  featureFlags: {},
  subscription: { status: 'ACTIVE', currentPeriodEnd: new Date(Date.now() + 20 * 86400000).toISOString() },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

const PLAN_OPTIONS = ['FREE_TRIAL', 'STARTER', 'PRO', 'BUSINESS', 'ENTERPRISE']

export default function AdminBusinessDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [org, setOrg] = useState<OrgDetail>(DEMO_ORG)
  const [loading, setLoading] = useState(true)
  const [planChanging, setPlanChanging] = useState(false)
  const [newPlan, setNewPlan] = useState('')
  const [impersonating, setImpersonating] = useState(false)
  const [suspending, setSuspending] = useState(false)
  const [featureOverrides, setFeatureOverrides] = useState<Record<string, boolean>>({})
  const [savingFlags, setSavingFlags] = useState(false)
  const [actionMsg, setActionMsg] = useState('')

  useEffect(() => {
    apiClient.get<OrgDetail>(`/admin/organizations/${id}`)
      .then(data => { setOrg(data); setNewPlan(data.plan); setFeatureOverrides(data.featureFlags ?? {}) })
      .catch(() => { setNewPlan(DEMO_ORG.plan); setFeatureOverrides({}) })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => { setNewPlan(org.plan) }, [org.plan])

  function flash(msg: string) {
    setActionMsg(msg)
    setTimeout(() => setActionMsg(''), 3000)
  }

  async function changePlan() {
    if (!newPlan || newPlan === org.plan) return
    setPlanChanging(true)
    try {
      await apiClient.patch(`/admin/organizations/${id}/plan`, { plan: newPlan })
      setOrg(o => ({ ...o, plan: newPlan }))
      flash(`Plan changed to ${newPlan}`)
    } catch { flash('Failed to change plan') } finally { setPlanChanging(false) }
  }

  async function toggleSuspend() {
    setSuspending(true)
    const action = org.status === 'SUSPENDED' ? 'reactivate' : 'suspend'
    try {
      await apiClient.post(`/admin/organizations/${id}/${action}`, {})
      setOrg(o => ({ ...o, status: action === 'suspend' ? 'SUSPENDED' : 'ACTIVE' }))
      flash(`Organization ${action === 'suspend' ? 'suspended' : 'reactivated'}`)
    } catch { flash('Action failed') } finally { setSuspending(false) }
  }

  async function impersonate() {
    setImpersonating(true)
    try {
      const res = await apiClient.post<{ token: string; redirectUrl: string }>(`/admin/organizations/${id}/impersonate`, {})
      if (res.redirectUrl) window.location.href = res.redirectUrl
      else flash('Impersonation token issued')
    } catch { flash('Failed to impersonate') } finally { setImpersonating(false) }
  }

  async function saveFeatureFlags() {
    setSavingFlags(true)
    try {
      await apiClient.put(`/admin/organizations/${id}/features`, { flags: featureOverrides })
      flash('Feature flags saved')
    } catch { flash('Failed to save flags') } finally { setSavingFlags(false) }
  }

  const planMeta = PLAN_COLORS[org.plan.toUpperCase()] ?? PLAN_COLORS.FREE
  const hipaa = isHipaaIndustry(org.industry)
  const orgFeatures = getOrgFeatures(org.plan, org.industry)

  // Key feature categories to show in flags panel
  const FLAG_GROUPS: Array<{ label: string; features: Feature[] }> = [
    { label: 'AI Features', features: ['ai:brain', 'ai:business_doctor', 'ai:receptionist', 'ai:email_writer', 'ai:blog_writer'] },
    { label: 'Marketing', features: ['marketing:hub', 'marketing:social', 'marketing:campaigns', 'marketing:broadcasts'] },
    { label: 'Communication', features: ['comm:sms', 'comm:whatsapp', 'comm:chat_widget'] },
    { label: 'Platform', features: ['platform:website', 'platform:white_label', 'platform:competitors'] },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      {/* Back */}
      <button onClick={() => router.back()} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
        <ArrowLeft className="h-4 w-4" />
        All businesses
      </button>

      {/* Header */}
      <div className="kv-anim flex items-start justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{org.name}</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: planMeta.text, background: planMeta.bg }}>{org.plan}</span>
            <span className="text-xs text-muted-foreground">{INDUSTRY_LABELS[org.industry] ?? org.industry}</span>
            {hipaa && <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.1)' }}>HIPAA-safe</span>}
          </div>
        </div>
        {actionMsg && (
          <div className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)', color: '#34d399' }}>
            <Check className="h-4 w-4" />
            {actionMsg}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Plan management */}
        <div className="kv-anim rounded-xl p-5 space-y-4" style={{ ...cardStyle, animationDelay: '0.11s' }}>
          <h2 className="text-sm font-semibold text-foreground">Plan Management</h2>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-muted-foreground mb-0.5">Current Plan</p>
              <p className="font-semibold text-foreground">{org.plan}</p>
            </div>
            <div className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)' }}>
              <p className="text-xs text-muted-foreground mb-0.5">MRR</p>
              <p className="font-semibold text-foreground tabular">${org.mrr}/mo</p>
            </div>
          </div>
          {org.subscription?.currentPeriodEnd && (
            <p className="text-xs text-muted-foreground">
              Period ends {new Date(org.subscription.currentPeriodEnd).toLocaleDateString()}
            </p>
          )}
          {org.trialEndsAt && (
            <p className="text-xs" style={{ color: '#06b6d4' }}>
              Trial ends {new Date(org.trialEndsAt).toLocaleDateString()} ({Math.ceil((new Date(org.trialEndsAt).getTime() - Date.now()) / 86400000)} days left)
            </p>
          )}
          <div className="flex gap-2">
            <select
              value={newPlan}
              onChange={e => setNewPlan(e.target.value)}
              className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            >
              {PLAN_OPTIONS.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            <button
              onClick={changePlan}
              disabled={planChanging || newPlan === org.plan}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
            >
              {planChanging ? 'Saving…' : 'Change'}
            </button>
          </div>
        </div>

        {/* Actions */}
        <div className="kv-anim rounded-xl p-5 space-y-3" style={{ ...cardStyle, animationDelay: '0.18s' }}>
          <h2 className="text-sm font-semibold text-foreground">Actions</h2>

          <button
            onClick={impersonate}
            disabled={impersonating}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50"
            style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}
          >
            <UserCheck className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="font-semibold">Impersonate</p>
              <p className="text-xs opacity-70">Log in as this business to debug or onboard</p>
            </div>
          </button>

          <button
            onClick={toggleSuspend}
            disabled={suspending}
            className="w-full flex items-center gap-3 rounded-xl p-3 text-sm font-medium transition-all hover:scale-[1.01] disabled:opacity-50"
            style={org.status === 'SUSPENDED'
              ? { background: 'rgba(52,211,153,0.06)', border: '1px solid rgba(52,211,153,0.2)', color: '#34d399' }
              : { background: 'rgba(248,113,113,0.06)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }
            }
          >
            <Ban className="h-4 w-4 shrink-0" />
            <div className="text-left">
              <p className="font-semibold">{org.status === 'SUSPENDED' ? 'Reactivate' : 'Suspend'}</p>
              <p className="text-xs opacity-70">
                {org.status === 'SUSPENDED' ? 'Restore access to this business' : 'Block access until further notice'}
              </p>
            </div>
          </button>

          {hipaa && (
            <div className="flex items-start gap-2 rounded-xl p-3 text-xs" style={{ background: 'rgba(251,191,36,0.06)', border: '1px solid rgba(251,191,36,0.2)', color: '#fbbf24' }}>
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-0.5">HIPAA-Safe Industry</p>
                <p className="opacity-80">This business is restricted to AI Receptionist, Appointments, Invoices, and Reviews only. Bulk outreach, chat widget, and CRM marketing tools are hidden.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Feature flags */}
      <div className="kv-anim rounded-xl p-5" style={{ ...cardStyle, animationDelay: '0.25s' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Feature Flag Overrides</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Override plan-level features for this specific business</p>
          </div>
          <button
            onClick={saveFeatureFlags}
            disabled={savingFlags}
            className="px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }}
          >
            {savingFlags ? 'Saving…' : 'Save Overrides'}
          </button>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {FLAG_GROUPS.map(group => (
            <div key={group.label}>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">{group.label}</p>
              <div className="space-y-2">
                {group.features.map(feature => {
                  const inPlan = orgFeatures.has(feature)
                  const override = featureOverrides[feature]
                  const effective = override !== undefined ? override : inPlan
                  return (
                    <div key={feature} className="flex items-center justify-between gap-3 py-1.5" style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      <div>
                        <p className="text-xs font-mono text-foreground">{feature}</p>
                        {!inPlan && override === undefined && (
                          <p className="text-[10px] text-muted-foreground">Not in {org.plan} plan</p>
                        )}
                        {override !== undefined && (
                          <p className="text-[10px]" style={{ color: '#fbbf24' }}>Overridden</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {override !== undefined && (
                          <button
                            onClick={() => setFeatureOverrides(f => { const n = { ...f }; delete n[feature]; return n })}
                            className="text-[10px] text-muted-foreground hover:text-foreground"
                          >
                            Reset
                          </button>
                        )}
                        <div
                          onClick={() => setFeatureOverrides(f => ({ ...f, [feature]: !effective }))}
                          className="relative cursor-pointer w-8 h-5 rounded-full transition-all"
                          style={effective
                            ? { background: 'linear-gradient(135deg, #f59e0b, #d97706)' }
                            : { background: 'rgba(255,255,255,0.1)' }
                          }
                        >
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow ${effective ? 'translate-x-3' : 'translate-x-0.5'}`} />
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Team members */}
      <div className="kv-anim rounded-xl overflow-hidden" style={{ ...cardStyle, animationDelay: '0.32s' }}>
        <div className="px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="text-sm font-semibold text-foreground">Team Members ({org.memberCount})</h2>
        </div>
        <table className="w-full text-sm">
          <tbody>
            {org.members.map((m, i) => (
              <tr key={m.id} style={{ borderBottom: i < org.members.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                <td className="px-5 py-3">
                  <p className="font-medium text-foreground">{m.firstName} {m.lastName}</p>
                  <p className="text-xs text-muted-foreground">{m.email}</p>
                </td>
                <td className="px-5 py-3 text-right">
                  <span className="text-xs text-muted-foreground">{m.role}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
