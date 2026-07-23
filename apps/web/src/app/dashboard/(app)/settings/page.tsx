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

  const tabs: Array<{ id: SettingsTab; label: string; icon: string }> = [
    { id: 'profile', label: 'Profile', icon: '👤' },
    { id: 'organization', label: 'Organization', icon: '🏢' },
    { id: 'integrations', label: 'Integrations', icon: '🔌' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'billing', label: 'Billing', icon: '💳' },
  ]

  const industries = ['HEALTHCARE', 'LEGAL', 'REAL_ESTATE', 'HVAC', 'PLUMBING', 'ELECTRICAL', 'DENTAL', 'BEAUTY_SALON', 'RESTAURANT', 'FITNESS', 'RETAIL', 'GENERAL']

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-gray-400 text-sm mt-1">Manage your account and business configuration</p>
      </div>

      <div className="flex gap-6">
        {/* Sidebar */}
        <div className="w-48 shrink-0">
          <nav className="space-y-1">
            {tabs.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-left transition-colors ${tab === t.id ? 'bg-purple-600/20 text-purple-300' : 'text-gray-400 hover:text-white hover:bg-white/5'}`}
              >
                <span>{t.icon}</span>
                {t.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="flex-1 max-w-2xl space-y-6">

          {/* Profile */}
          {tab === 'profile' && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">Profile Information</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">First Name</label>
                  <input
                    value={profileSettings.firstName}
                    onChange={e => setProfileSettings(p => ({ ...p, firstName: e.target.value }))}
                    placeholder="First name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Last Name</label>
                  <input
                    value={profileSettings.lastName}
                    onChange={e => setProfileSettings(p => ({ ...p, lastName: e.target.value }))}
                    placeholder="Last name"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Email</label>
                <input
                  value={profileSettings.email}
                  onChange={e => setProfileSettings(p => ({ ...p, email: e.target.value }))}
                  type="email"
                  placeholder="you@company.com"
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm text-white font-medium mb-3">Change Password</h3>
                <div className="space-y-3">
                  <input
                    type="password"
                    value={profileSettings.currentPassword}
                    onChange={e => setProfileSettings(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Current password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                  <input
                    type="password"
                    value={profileSettings.newPassword}
                    onChange={e => setProfileSettings(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="New password"
                    className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>
              <button
                onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
              >
                {saved ? '✓ Saved' : 'Save Profile'}
              </button>
            </div>
          )}

          {/* Organization */}
          {tab === 'organization' && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">Organization Settings</h2>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Business Name</label>
                <input
                  value={orgSettings.name}
                  onChange={e => setOrgSettings(s => ({ ...s, name: e.target.value }))}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Industry</label>
                <select
                  value={orgSettings.industry}
                  onChange={e => setOrgSettings(s => ({ ...s, industry: e.target.value }))}
                  className="w-full bg-[#1a1a2e] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {industries.map(ind => (
                    <option key={ind} value={ind}>{ind.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Phone</label>
                  <input value={orgSettings.phone ?? ''} onChange={e => setOrgSettings(s => ({ ...s, phone: e.target.value }))} placeholder="+1 555 000 0000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
                <div>
                  <label className="text-xs text-gray-400 mb-1 block">Business Email</label>
                  <input value={orgSettings.email ?? ''} onChange={e => setOrgSettings(s => ({ ...s, email: e.target.value }))} placeholder="info@business.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Website</label>
                <input value={orgSettings.website ?? ''} onChange={e => setOrgSettings(s => ({ ...s, website: e.target.value }))} placeholder="https://www.yourbusiness.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block">Address</label>
                <input value={orgSettings.address ?? ''} onChange={e => setOrgSettings(s => ({ ...s, address: e.target.value }))} placeholder="123 Main St, City, State 12345" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
              </div>
              <button onClick={saveOrgSettings} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
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
                  <div key={key} className="bg-white/5 border border-white/10 rounded-xl p-5">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{icon}</span>
                        <div>
                          <p className="text-white font-medium">{name}</p>
                          <p className="text-xs text-gray-400">{desc}</p>
                        </div>
                      </div>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <span className="text-xs text-gray-400">{cfg['enabled'] ? 'Enabled' : 'Disabled'}</span>
                        <div
                          onClick={() => setIntegrations(i => ({ ...i, [key]: { ...cfg, enabled: !cfg['enabled'] } }))}
                          className={`w-10 h-6 rounded-full transition-colors ${cfg['enabled'] ? 'bg-purple-600' : 'bg-white/10'} relative cursor-pointer`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${cfg['enabled'] ? 'translate-x-5' : 'translate-x-1'}`} />
                        </div>
                      </label>
                    </div>
                    {cfg['enabled'] && (
                      <div className="space-y-3">
                        {fields.map(f => (
                          <div key={f.k}>
                            <label className="text-xs text-gray-400 mb-1 block">{f.label}</label>
                            <input
                              type={f.type}
                              value={(cfg[f.k] ?? '') as string}
                              onChange={e => setIntegrations(i => ({ ...i, [key]: { ...cfg, [f.k]: e.target.value } }))}
                              placeholder={f.type === 'password' ? '••••••••••' : ''}
                              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                          </div>
                        ))}
                        <button className="px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded-lg">Save</button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          {/* Notifications */}
          {tab === 'notifications' && (
            <div className="bg-white/5 border border-white/10 rounded-xl p-6 space-y-4">
              <h2 className="text-white font-semibold">Notification Preferences</h2>
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
                  <div key={key} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                    <span className="text-sm text-gray-300">{labels[key] ?? key}</span>
                    <div
                      onClick={() => setNotifSettings(s => ({ ...s, [key]: !val }))}
                      className={`w-10 h-6 rounded-full transition-colors ${val ? 'bg-purple-600' : 'bg-white/10'} relative cursor-pointer`}
                    >
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${val ? 'translate-x-5' : 'translate-x-1'}`} />
                    </div>
                  </div>
                )
              })}
              <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2000) }} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors">
                {saved ? '✓ Saved' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Billing */}
          {tab === 'billing' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-600/20 to-indigo-600/20 border border-purple-500/30 rounded-xl p-6">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-semibold">Current Plan</h3>
                  <span className="text-xs bg-purple-600 text-white px-2 py-1 rounded-full">Pro</span>
                </div>
                <p className="text-2xl font-bold text-white">$97<span className="text-sm text-gray-400">/month</span></p>
                <p className="text-sm text-gray-400 mt-1">Unlimited contacts · All AI features · Priority support</p>
                <div className="mt-4 flex gap-3">
                  <button className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm">Upgrade to Business</button>
                  <button className="px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-300 rounded-lg text-sm">Manage Subscription</button>
                </div>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-5">
                <h3 className="text-white font-medium mb-3">Usage This Month</h3>
                {[
                  { label: 'AI Tokens Used', used: 842000, limit: 1000000, unit: '' },
                  { label: 'Contacts', used: 847, limit: 5000, unit: '' },
                  { label: 'Emails Sent', used: 234, limit: 1000, unit: '' },
                  { label: 'SMS Sent', used: 89, limit: 500, unit: '' },
                ].map(item => (
                  <div key={item.label} className="mb-3">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-400">{item.label}</span>
                      <span className="text-white">{item.used.toLocaleString()} / {item.limit.toLocaleString()}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div className="h-full bg-purple-500 rounded-full" style={{ width: `${Math.min((item.used / item.limit) * 100, 100)}%` }} />
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
