'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { apiClient } from '../../../../lib/api-client'
import { useAuthStore } from '../../../../stores/auth.store'
import { toast } from '../../../../lib/toast'

type SettingsTab = 'profile' | 'organization' | 'integrations' | 'notifications' | 'billing'

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className="relative cursor-pointer w-10 h-6 rounded-full transition-all"
      style={enabled
        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }
        : { background: 'rgba(255,255,255,0.1)' }
      }
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} style={{ background: 'white' }} />
    </div>
  )
}

const PLAN_INFO: Record<string, { price: string; label: string; desc: string; color: string }> = {
  STARTER:  { price: '$49',  label: 'Starter',  desc: 'Core CRM & AI features · Up to 1,000 contacts',                color: '#06b6d4' },
  PRO:      { price: '$97',  label: 'Pro',      desc: 'Unlimited contacts · All AI features · Priority support',       color: '#a855f7' },
  BUSINESS: { price: '$197', label: 'Business', desc: 'White-label · API access · Dedicated support',                  color: '#f59e0b' },
}

export default function SettingsPage() {
  const router = useRouter()
  const { user, organization, refreshUser } = useAuthStore()
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [saving, setSaving] = useState(false)

  const [orgSettings, setOrgSettings] = useState({
    name: organization?.name ?? 'My Business',
    industry: organization?.industry ?? 'GENERAL',
    phone: '',
    email: '',
    website: '',
    timezone: 'America/New_York',
  })

  const [profileSettings, setProfileSettings] = useState({
    firstName: user?.firstName ?? '',
    lastName: user?.lastName ?? '',
    email: user?.email ?? '',
    currentPassword: '',
    newPassword: '',
  })

  const [integrations, setIntegrations] = useState({
    twilio:     { enabled: false, sid: '', token: '', phone: '' },
    resend:     { enabled: false, apiKey: '' },
    elevenlabs: { enabled: false, apiKey: '' },
    stripe:     { enabled: false, publishableKey: '', secretKey: '' },
  })

  const [notifSettings, setNotifSettings] = useState({
    emailNotifications:  true,
    newLead:             true,
    dealWon:             true,
    appointmentReminder: true,
    invoiceOverdue:      true,
    lowInventory:        true,
    newReview:           true,
  })

  // Sync form from auth store when it loads
  useEffect(() => {
    if (organization) {
      setOrgSettings(s => ({ ...s, name: organization.name, industry: organization.industry ?? 'GENERAL' }))
    }
  }, [organization?.name, organization?.industry])

  useEffect(() => {
    if (user) {
      setProfileSettings(s => ({ ...s, firstName: user.firstName ?? '', lastName: user.lastName ?? '', email: user.email ?? '' }))
    }
  }, [user?.firstName, user?.lastName, user?.email])

  // Handle Stripe checkout success redirect
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('success') === 'true') {
      refreshUser().then(() => {
        toast('Plan upgraded successfully!', 'success')
        window.history.replaceState({}, '', window.location.pathname)
        setTab('billing')
      })
    }
  }, [])

  async function saveOrgSettings() {
    setSaving(true)
    try {
      await (apiClient as any).patch('/org', {
        name: orgSettings.name,
        industry: orgSettings.industry || undefined,
        phone: orgSettings.phone || undefined,
        email: orgSettings.email || undefined,
        website: orgSettings.website || undefined,
        timezone: orgSettings.timezone || undefined,
      })
      await refreshUser()
      toast('Organization settings saved', 'success')
    } catch {
      toast('Failed to save organization settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  async function saveProfile() {
    setSaving(true)
    try {
      await (apiClient as any).patch('/auth/me', {
        firstName: profileSettings.firstName || undefined,
        lastName: profileSettings.lastName || undefined,
        ...(profileSettings.newPassword && profileSettings.currentPassword ? {
          currentPassword: profileSettings.currentPassword,
          newPassword: profileSettings.newPassword,
        } : {}),
      })
      await refreshUser()
      toast('Profile saved', 'success')
      setProfileSettings(s => ({ ...s, currentPassword: '', newPassword: '' }))
    } catch (err: any) {
      toast(err?.response?.data?.error ?? 'Failed to save profile', 'error')
    } finally {
      setSaving(false)
    }
  }

  function saveNotifications() {
    toast('Notification preferences saved', 'success')
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'profile',       label: 'Profile',       icon: '👤' },
    { id: 'organization',  label: 'Organization',   icon: '🏢' },
    { id: 'integrations',  label: 'Integrations',   icon: '🔌' },
    { id: 'notifications', label: 'Notifications',  icon: '🔔' },
    { id: 'billing',       label: 'Billing',        icon: '💳' },
  ]

  const industries = ['HEALTHCARE', 'LEGAL', 'REAL_ESTATE', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'DENTAL', 'BEAUTY_SALON', 'RESTAURANT', 'FITNESS', 'RETAIL', 'GENERAL']

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

  // Billing info from auth store
  const planKey = (organization?.plan ?? 'STARTER').toUpperCase()
  const planInfo = PLAN_INFO[planKey] ?? PLAN_INFO['STARTER']!
  const isTrialing = organization?.subscriptionStatus === 'TRIALING'
  const nextPlan = planKey === 'STARTER' ? 'PRO' : planKey === 'PRO' ? 'BUSINESS' : null

  return (
    <div className="p-6 max-w-[1100px]">
      <div {...anim(0)} className="kv-anim mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and business configuration</p>
      </div>

      <div className="flex gap-6 flex-col md:flex-row">
        {/* Sidebar nav */}
        <div {...anim(1)} className="kv-anim md:w-48 shrink-0">
          <nav className="flex gap-1 md:flex-col md:space-y-1 overflow-x-auto md:overflow-visible">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="flex items-center gap-2 md:gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors whitespace-nowrap md:w-full"
                style={tab === t.id
                  ? { background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }
                  : undefined
                }
              >
                <span className={tab === t.id ? '' : 'opacity-70'}>{t.icon}</span>
                <span className={tab === t.id ? 'text-primary font-medium' : 'text-muted-foreground hover:text-foreground'}>{t.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div {...anim(2)} className="kv-anim flex-1 max-w-2xl space-y-6">

          {/* Profile */}
          {tab === 'profile' && (
            <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
              <h2 className="text-foreground font-semibold">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">First Name</label>
                  <input value={profileSettings.firstName} onChange={e => setProfileSettings(p => ({ ...p, firstName: e.target.value }))} placeholder="First name" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Last Name</label>
                  <input value={profileSettings.lastName} onChange={e => setProfileSettings(p => ({ ...p, lastName: e.target.value }))} placeholder="Last name" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Email</label>
                <input value={profileSettings.email} onChange={e => setProfileSettings(p => ({ ...p, email: e.target.value }))} type="email" placeholder="you@company.com" className={inputCls} style={inputStyle} readOnly />
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <h3 className="text-sm text-foreground font-medium mb-3">Change Password</h3>
                <div className="space-y-3">
                  <input type="password" value={profileSettings.currentPassword} onChange={e => setProfileSettings(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className={inputCls} style={inputStyle} />
                  <input type="password" value={profileSettings.newPassword} onChange={e => setProfileSettings(p => ({ ...p, newPassword: e.target.value }))} placeholder="New password (min 8 chars)" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <button
                onClick={saveProfile}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Organization */}
          {tab === 'organization' && (
            <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
              <h2 className="text-foreground font-semibold">Organization Settings</h2>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Business Name</label>
                <input value={orgSettings.name} onChange={e => setOrgSettings(s => ({ ...s, name: e.target.value }))} className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Industry</label>
                <select value={orgSettings.industry} onChange={e => setOrgSettings(s => ({ ...s, industry: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                >
                  {industries.map(ind => <option key={ind} value={ind}>{ind.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Phone</label>
                  <input value={orgSettings.phone} onChange={e => setOrgSettings(s => ({ ...s, phone: e.target.value }))} placeholder="+1 555 000 0000" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Business Email</label>
                  <input value={orgSettings.email} onChange={e => setOrgSettings(s => ({ ...s, email: e.target.value }))} placeholder="info@business.com" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                <input value={orgSettings.website} onChange={e => setOrgSettings(s => ({ ...s, website: e.target.value }))} placeholder="https://www.yourbusiness.com" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Timezone</label>
                <select value={orgSettings.timezone} onChange={e => setOrgSettings(s => ({ ...s, timezone: e.target.value }))}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                >
                  {['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'America/Phoenix', 'Europe/London', 'Europe/Paris', 'Asia/Dubai', 'Asia/Kolkata', 'Australia/Sydney'].map(tz => (
                    <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={saveOrgSettings}
                disabled={saving}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Saving…' : 'Save Organization'}
              </button>
            </div>
          )}

          {/* Integrations */}
          {tab === 'integrations' && (
            <div className="space-y-4">
              {[
                { key: 'twilio',     name: 'Twilio',      desc: 'SMS & voice calls',             icon: '📞', fields: [{ k: 'sid', label: 'Account SID', type: 'text' }, { k: 'token', label: 'Auth Token', type: 'password' }, { k: 'phone', label: 'Phone Number', type: 'text' }] },
                { key: 'resend',     name: 'Resend',      desc: 'Transactional email delivery',   icon: '📧', fields: [{ k: 'apiKey', label: 'API Key', type: 'password' }] },
                { key: 'elevenlabs', name: 'ElevenLabs',  desc: 'AI voice synthesis',             icon: '🎙', fields: [{ k: 'apiKey', label: 'API Key', type: 'password' }] },
                { key: 'stripe',     name: 'Stripe',      desc: 'Payment processing',             icon: '💳', fields: [{ k: 'publishableKey', label: 'Publishable Key', type: 'text' }, { k: 'secretKey', label: 'Secret Key', type: 'password' }] },
              ].map(({ key, name, desc, icon, fields }) => {
                const cfg = integrations[key as keyof typeof integrations] as Record<string, string | boolean>
                return (
                  <div key={key} className="rounded-xl p-5" style={cardStyle}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="text-foreground font-medium">{name}</p>
                          <p className="text-xs text-muted-foreground">{desc}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-muted-foreground">{cfg['enabled'] ? 'Enabled' : 'Disabled'}</span>
                        <Toggle
                          enabled={cfg['enabled'] as boolean}
                          onChange={() => setIntegrations(i => ({ ...i, [key]: { ...cfg, enabled: !cfg['enabled'] } }))}
                        />
                      </label>
                    </div>
                    {cfg['enabled'] && (
                      <div className="space-y-3">
                        {fields.map(f => (
                          <div key={f.k}>
                            <label className="text-xs text-muted-foreground mb-1 block">{f.label}</label>
                            <input
                              type={f.type}
                              value={(cfg[f.k] ?? '') as string}
                              onChange={e => setIntegrations(i => ({ ...i, [key]: { ...cfg, [f.k]: e.target.value } }))}
                              placeholder={f.type === 'password' ? '••••••••••' : ''}
                              className={inputCls}
                              style={inputStyle}
                            />
                          </div>
                        ))}
                        <button
                          onClick={() => toast(`${name} settings saved`, 'success')}
                          className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]"
                          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                        >
                          Save
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <div className="rounded-xl p-6 space-y-4" style={cardStyle}>
              <h2 className="text-foreground font-semibold">Notification Preferences</h2>
              {Object.entries(notifSettings).map(([key, val]) => {
                const labels: Record<string, string> = {
                  emailNotifications:  'Email notifications',
                  newLead:             'New lead created',
                  dealWon:             'Deal won',
                  appointmentReminder: 'Appointment reminders',
                  invoiceOverdue:      'Invoice overdue',
                  lowInventory:        'Low inventory alert',
                  newReview:           'New review received',
                }
                return (
                  <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-sm text-muted-foreground">{labels[key] ?? key}</span>
                    <Toggle enabled={val} onChange={() => setNotifSettings(s => ({ ...s, [key]: !val }))} />
                  </div>
                )
              })}
              <button
                onClick={saveNotifications}
                className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                Save Preferences
              </button>
            </div>
          )}

          {/* Billing */}
          {tab === 'billing' && (
            <div className="space-y-4">
              {/* Current plan */}
              <div
                className="rounded-xl p-6"
                style={{ background: `${planInfo.color}10`, border: `1px solid ${planInfo.color}40` }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-foreground font-semibold">Current Plan</h3>
                  <div className="flex items-center gap-2">
                    {isTrialing && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: 'rgba(251,191,36,0.15)', color: '#fbbf24' }}>
                        Trial
                      </span>
                    )}
                    <span
                      className="text-xs px-2 py-0.5 rounded-full text-white font-semibold"
                      style={{ background: planInfo.color }}
                    >
                      {planInfo.label}
                    </span>
                  </div>
                </div>
                <p className="text-3xl font-bold text-foreground tabular">
                  {planInfo.price}<span className="text-sm text-muted-foreground font-normal">/month</span>
                </p>
                <p className="text-sm text-muted-foreground mt-1">{planInfo.desc}</p>
                {isTrialing && organization?.trialEndsAt && (
                  <p className="text-xs mt-2" style={{ color: '#fbbf24' }}>
                    Trial ends {new Date(organization.trialEndsAt).toLocaleDateString()}
                  </p>
                )}
                <div className="mt-4 flex flex-wrap gap-3">
                  {nextPlan && (
                    <button
                      onClick={() => router.push(`/dashboard/upgrade`)}
                      className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                    >
                      Upgrade to {PLAN_INFO[nextPlan]?.label}
                    </button>
                  )}
                  <button
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}
                  >
                    Manage Subscription
                  </button>
                </div>
              </div>

              {/* Usage */}
              <div className="rounded-xl p-5" style={cardStyle}>
                <h3 className="text-foreground font-medium mb-4">Usage This Month</h3>
                {[
                  { label: 'AI Tokens Used',  used: 842_000,  limit: 1_000_000 },
                  { label: 'Contacts',         used: 847,      limit: planKey === 'STARTER' ? 1000 : 5000 },
                  { label: 'Emails Sent',      used: 234,      limit: 1000 },
                  { label: 'SMS Sent',         used: 89,       limit: 500 },
                ].map(item => (
                  <div key={item.label} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground tabular">
                        {item.used.toLocaleString()} <span className="text-muted-foreground">/ {item.limit.toLocaleString()}</span>
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${Math.min((item.used / item.limit) * 100, 100)}%`,
                          background: item.used / item.limit > 0.85
                            ? 'linear-gradient(90deg, #f59e0b, #ef4444)'
                            : 'linear-gradient(90deg, #06b6d4, #0ea5e9)',
                        }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Invoice history placeholder */}
              <div className="rounded-xl p-5" style={cardStyle}>
                <h3 className="text-foreground font-medium mb-3">Billing History</h3>
                <p className="text-sm text-muted-foreground">No invoices yet. They will appear here after your first payment.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
