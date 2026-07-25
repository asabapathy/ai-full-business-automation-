'use client'

import { useState } from 'react'

type SettingsTab = 'profile' | 'organization' | 'integrations' | 'notifications' | 'billing'

interface OrgSettings {
  name: string
  industry: string
  phone?: string
  email?: string
  website?: string
  address?: string
  timezone: string
}

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
      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform shadow ${enabled ? 'translate-x-5' : 'translate-x-1'}`} />
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<SettingsTab>('profile')
  const [saved, setSaved] = useState(false)
  const [orgSettings, setOrgSettings] = useState<OrgSettings>({
    name: 'My Business',
    industry: 'GENERAL',
    phone: '',
    email: '',
    website: '',
    address: '',
    timezone: 'America/New_York',
  })

  const [profileSettings, setProfileSettings] = useState({
    firstName: '',
    lastName: '',
    email: '',
    currentPassword: '',
    newPassword: '',
  })

  const [integrations, setIntegrations] = useState({
    twilio: { enabled: false, sid: '', token: '', phone: '' },
    sendgrid: { enabled: false, apiKey: '' },
    resend: { enabled: false, apiKey: '' },
    elevenlabs: { enabled: false, apiKey: '' },
    stripe: { enabled: false, publishableKey: '', secretKey: '' },
  })

  const [notifSettings, setNotifSettings] = useState({
    emailNotifications: true,
    newLead: true,
    dealWon: true,
    appointmentReminder: true,
    invoiceOverdue: true,
    lowInventory: true,
    newReview: true,
  })

  async function saveOrgSettings() {
    try {
      await fetch('/api/org', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(orgSettings),
      })
    } catch {}
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  function flashSaved() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'organization', label: 'Organization', icon: '🏢' },
    { id: 'integrations', label: 'Integrations', icon: '🔌' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ]

  const industries = ['HEALTHCARE', 'LEGAL', 'REAL_ESTATE', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'DENTAL', 'BEAUTY_SALON', 'RESTAURANT', 'FITNESS', 'RETAIL', 'GENERAL']

  const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
  const divStyle = { borderColor: 'hsl(var(--border))' }

  return (
    <div className="p-6 max-w-[1100px]">
      <div {...anim(0)} className="kv-anim mb-6">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-muted-foreground text-sm mt-1">Manage your account and business configuration</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar nav */}
        <div {...anim(1)} className="kv-anim w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors"
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
                <input value={profileSettings.email} onChange={e => setProfileSettings(p => ({ ...p, email: e.target.value }))} type="email" placeholder="you@company.com" className={inputCls} style={inputStyle} />
              </div>
              <div className="pt-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <h3 className="text-sm text-foreground font-medium mb-3">Change Password</h3>
                <div className="space-y-3">
                  <input type="password" value={profileSettings.currentPassword} onChange={e => setProfileSettings(p => ({ ...p, currentPassword: e.target.value }))} placeholder="Current password" className={inputCls} style={inputStyle} />
                  <input type="password" value={profileSettings.newPassword} onChange={e => setProfileSettings(p => ({ ...p, newPassword: e.target.value }))} placeholder="New password" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <button
                onClick={flashSaved}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saved ? '✓ Saved' : 'Save Profile'}
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
                  <input value={orgSettings.phone ?? ''} onChange={e => setOrgSettings(s => ({ ...s, phone: e.target.value }))} placeholder="+1 555 000 0000" className={inputCls} style={inputStyle} />
                </div>
                <div>
                  <label className="text-xs text-muted-foreground mb-1 block">Business Email</label>
                  <input value={orgSettings.email ?? ''} onChange={e => setOrgSettings(s => ({ ...s, email: e.target.value }))} placeholder="info@business.com" className={inputCls} style={inputStyle} />
                </div>
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Website</label>
                <input value={orgSettings.website ?? ''} onChange={e => setOrgSettings(s => ({ ...s, website: e.target.value }))} placeholder="https://www.yourbusiness.com" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Address</label>
                <input value={orgSettings.address ?? ''} onChange={e => setOrgSettings(s => ({ ...s, address: e.target.value }))} placeholder="123 Main St, City, State 12345" className={inputCls} style={inputStyle} />
              </div>
              <button onClick={saveOrgSettings} className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saved ? '✓ Saved' : 'Save Organization'}
              </button>
            </div>
          )}

          {/* Integrations */}
          {tab === 'integrations' && (
            <div className="space-y-4">
              {[
                { key: 'twilio', name: 'Twilio', desc: 'SMS & voice calls', icon: '📞', fields: [{ k: 'sid', label: 'Account SID', type: 'text' }, { k: 'token', label: 'Auth Token', type: 'password' }, { k: 'phone', label: 'Phone Number', type: 'text' }] },
                { key: 'resend', name: 'Resend', desc: 'Transactional email delivery', icon: '📧', fields: [{ k: 'apiKey', label: 'API Key', type: 'password' }] },
                { key: 'elevenlabs', name: 'ElevenLabs', desc: 'AI voice synthesis', icon: '🎙', fields: [{ k: 'apiKey', label: 'API Key', type: 'password' }] },
                { key: 'stripe', name: 'Stripe', desc: 'Payment processing', icon: '💳', fields: [{ k: 'publishableKey', label: 'Publishable Key', type: 'text' }, { k: 'secretKey', label: 'Secret Key', type: 'password' }] },
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
                        <button className="px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Save</button>
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
                  emailNotifications: 'Email notifications',
                  newLead: 'New lead created',
                  dealWon: 'Deal won',
                  appointmentReminder: 'Appointment reminders',
                  invoiceOverdue: 'Invoice overdue',
                  lowInventory: 'Low inventory alert',
                  newReview: 'New review received',
                }
                return (
                  <div key={key} className="flex items-center justify-between py-2" style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <span className="text-sm text-muted-foreground">{labels[key] ?? key}</span>
                    <Toggle enabled={val} onChange={() => setNotifSettings(s => ({ ...s, [key]: !val }))} />
                  </div>
                )
              })}
              <button onClick={flashSaved} className="mt-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saved ? '✓ Saved' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Billing */}
          {tab === 'billing' && (
            <div className="space-y-4">
              <div className="rounded-xl p-6" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.25)' }}>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-foreground font-semibold">Current Plan</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full text-white font-semibold" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Pro</span>
                </div>
                <p className="text-3xl font-bold text-foreground tabular">$97<span className="text-sm text-muted-foreground font-normal">/month</span></p>
                <p className="text-sm text-muted-foreground mt-1">Unlimited contacts · All AI features · Priority support</p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Upgrade to Business</button>
                  <button className="px-4 py-2 rounded-lg text-sm text-muted-foreground transition-colors hover:text-foreground" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>Manage Subscription</button>
                </div>
              </div>
              <div className="rounded-xl p-5" style={cardStyle}>
                <h3 className="text-foreground font-medium mb-4">Usage This Month</h3>
                {[
                  { label: 'AI Tokens Used', used: 842000, limit: 1000000 },
                  { label: 'Contacts', used: 847, limit: 5000 },
                  { label: 'Emails Sent', used: 234, limit: 1000 },
                  { label: 'SMS Sent', used: 89, limit: 500 },
                ].map(item => (
                  <div key={item.label} className="mb-4 last:mb-0">
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="text-muted-foreground">{item.label}</span>
                      <span className="text-foreground tabular">{item.used.toLocaleString()} <span className="text-muted-foreground">/ {item.limit.toLocaleString()}</span></span>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
                      <div className="h-full rounded-full" style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
