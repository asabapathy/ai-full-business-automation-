'use client'

import { useState, useEffect } from 'react'
import {
  Globe, CheckCircle, AlertCircle, Copy, ExternalLink, Save,
  Palette, Settings, Shield, Lock, Sparkles, Building2, Plus,
  RefreshCw, X, ChevronRight
} from 'lucide-react'
import Link from 'next/link'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { useAuthStore } from '../../../../stores/auth.store'

interface WhiteLabelConfig {
  enabled: boolean
  customDomain?: string
  brandName?: string
  logoUrl?: string
  faviconUrl?: string
  primaryColor?: string
  secondaryColor?: string
  supportEmail?: string
  supportPhone?: string
  hidePoweredBy?: boolean
  customCss?: string
}

interface DnsRecord { type: string; host: string; value: string; ttl: number }

const COLOR_PRESETS = [
  { name: 'Cyan',   primary: '#06b6d4', secondary: '#0ea5e9' },
  { name: 'Violet', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Amber',  primary: '#f59e0b', secondary: '#d97706' },
  { name: 'Emerald',primary: '#10b981', secondary: '#059669' },
  { name: 'Rose',   primary: '#f43f5e', secondary: '#e11d48' },
  { name: 'Blue',   primary: '#3b82f6', secondary: '#1d4ed8' },
  { name: 'Orange', primary: '#f97316', secondary: '#ea580c' },
  { name: 'Teal',   primary: '#14b8a6', secondary: '#0d9488' },
]

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!enabled)}
      className="relative w-11 h-6 rounded-full transition-all shrink-0"
      style={enabled ? { background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' } : { background: 'rgba(255,255,255,0.08)' }}
    >
      <div className="absolute top-1 w-4 h-4 rounded-full transition-transform" style={{ left: enabled ? '24px' : '4px', background: 'white' }} />
    </button>
  )
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 bg-background'
const inputStyle = { border: '1px solid hsl(var(--border))' }

export default function WhiteLabelPage() {
  const { organization } = useAuthStore()
  const plan = (organization?.plan ?? 'STARTER').toUpperCase()
  const isBusiness = plan === 'BUSINESS' || plan === 'ENTERPRISE'

  const [config, setConfig] = useState<WhiteLabelConfig>({ enabled: false })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [tab, setTab] = useState<'branding' | 'domain' | 'advanced'>('branding')
  const [domainInput, setDomainInput] = useState('')
  const [verifying, setVerifying] = useState(false)
  const [dnsRecords, setDnsRecords] = useState<DnsRecord[]>([])
  const [domainVerified, setDomainVerified] = useState(false)
  const [copiedDns, setCopiedDns] = useState<string | null>(null)

  useEffect(() => {
    if (!isBusiness) { setLoading(false); return }
    apiClient.get<{ data: WhiteLabelConfig }>('/white-label/config')
      .then(r => {
        const data = (r as any).data ?? {}
        setConfig(data)
        if (data.customDomain) setDomainInput(data.customDomain)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [isBusiness])

  async function handleSave() {
    setSaving(true)
    try {
      await apiClient.post('/white-label/config', config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch { toast('Failed to save settings', 'error') }
    setSaving(false)
  }

  async function handleVerifyDomain() {
    if (!domainInput.trim()) return
    setVerifying(true)
    try {
      const res = await apiClient.post<{ data: { verified: boolean; dnsInstructions: DnsRecord[] } }>('/white-label/verify-domain', { domain: domainInput.trim() })
      const data = (res as any).data
      setDnsRecords(data?.dnsInstructions ?? [])
      setDomainVerified(data?.verified ?? false)
      if (data?.verified) setConfig(prev => ({ ...prev, customDomain: domainInput.trim() }))
    } catch { toast('Domain verification failed', 'error') }
    setVerifying(false)
  }

  function copyDns(val: string) {
    navigator.clipboard.writeText(val)
    setCopiedDns(val)
    setTimeout(() => setCopiedDns(null), 2000)
  }

  // ── Plan gate ──────────────────────────────────────────────────────────────
  if (!isBusiness) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[500px]">
        <div className="max-w-md w-full text-center">
          <div className="h-16 w-16 rounded-2xl flex items-center justify-center mx-auto mb-6" style={{ background: 'rgba(245,158,11,0.1)', border: '1px solid rgba(245,158,11,0.3)' }}>
            <Lock className="h-8 w-8" style={{ color: '#f59e0b' }} />
          </div>
          <h1 className="text-2xl font-bold text-foreground mb-2">White Label requires Business</h1>
          <p className="text-sm text-muted-foreground mb-6">
            Resell Kanavu AI under your own brand — custom domain, logo, colors, and "Powered by" removal. Available on the Business plan ($197/mo).
          </p>
          <Link
            href="/dashboard/upgrade"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-semibold text-white transition-all hover:scale-105"
            style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 24px rgba(245,158,11,0.3)' }}
          >
            <Sparkles className="h-4 w-4" />
            Upgrade to Business
          </Link>
          <Link href="/pricing" className="block mt-3 text-xs text-muted-foreground hover:text-foreground">View all plans</Link>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-6 w-6 text-primary animate-spin" />
      </div>
    )
  }

  const TABS = [
    { key: 'branding' as const, label: 'Branding', icon: Palette },
    { key: 'domain' as const, label: 'Custom Domain', icon: Globe },
    { key: 'advanced' as const, label: 'Advanced', icon: Settings },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">White Label</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Brand the platform with your own identity and domain</p>
        </div>
        <div className="flex items-center gap-3">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs font-medium px-3 py-1 rounded-full" style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)' }}>
              <CheckCircle className="h-3.5 w-3.5" />Saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
            <Save className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Enable toggle */}
      <div {...anim(1)} className="kv-anim rounded-xl p-4 flex items-center justify-between" style={cardStyle}>
        <div>
          <p className="text-sm font-semibold text-foreground">Enable White Labeling</p>
          <p className="text-xs text-muted-foreground mt-0.5">Show your brand instead of Kanavu AI across the platform</p>
        </div>
        <Toggle enabled={config.enabled} onChange={v => setConfig(prev => ({ ...prev, enabled: v }))} />
      </div>

      {config.enabled && (
        <>
          {/* Tabs */}
          <div {...anim(2)} className="kv-anim flex gap-2">
            {TABS.map(t => {
              const active = tab === t.key
              return (
                <button
                  key={t.key}
                  onClick={() => setTab(t.key)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                  style={active
                    ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
                    : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                  }
                >
                  <t.icon className="h-3.5 w-3.5" />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Branding Tab */}
          {tab === 'branding' && (
            <div {...anim(3)} className="kv-anim rounded-xl p-5 space-y-5" style={cardStyle}>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Brand Name</label>
                  <input className={inputCls} style={inputStyle} placeholder="Your Company Name"
                    value={config.brandName ?? ''} onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Support Email</label>
                  <input type="email" className={inputCls} style={inputStyle} placeholder="support@yourcompany.com"
                    value={config.supportEmail ?? ''} onChange={e => setConfig(prev => ({ ...prev, supportEmail: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Logo URL</label>
                  <input className={inputCls} style={inputStyle} placeholder="https://yourcompany.com/logo.png"
                    value={config.logoUrl ?? ''} onChange={e => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-1.5">Favicon URL</label>
                  <input className={inputCls} style={inputStyle} placeholder="https://yourcompany.com/favicon.ico"
                    value={config.faviconUrl ?? ''} onChange={e => setConfig(prev => ({ ...prev, faviconUrl: e.target.value }))} />
                </div>
              </div>

              {config.logoUrl && (
                <div className="rounded-lg p-4 flex items-center gap-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))' }}>
                  <img src={config.logoUrl} alt="Logo preview" className="h-10 max-w-32 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                  <span className="text-xs text-muted-foreground">Logo preview</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-2">Brand Color</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setConfig(prev => ({ ...prev, primaryColor: preset.primary, secondaryColor: preset.secondary }))}
                      className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
                      style={{ background: preset.primary, borderColor: config.primaryColor === preset.primary ? 'white' : 'transparent' }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Primary', key: 'primaryColor' as const, fallback: '#06b6d4' },
                    { label: 'Secondary', key: 'secondaryColor' as const, fallback: '#0ea5e9' },
                  ].map(({ label, key, fallback }) => (
                    <div key={key}>
                      <label className="text-xs text-muted-foreground block mb-1">{label}</label>
                      <div className="flex items-center gap-2">
                        <input type="color" className="w-9 h-8 rounded border cursor-pointer" style={{ borderColor: 'hsl(var(--border))' }}
                          value={config[key] ?? fallback} onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))} />
                        <input className={inputCls} style={{ ...inputStyle, fontFamily: 'monospace' }}
                          value={config[key] ?? fallback} onChange={e => setConfig(prev => ({ ...prev, [key]: e.target.value }))} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))' }}>
                <div>
                  <p className="text-sm font-medium text-foreground">Hide "Powered by Kanavu AI"</p>
                  <p className="text-xs text-muted-foreground mt-0.5">Remove Kanavu branding from the platform footer</p>
                </div>
                <Toggle enabled={config.hidePoweredBy ?? false} onChange={v => setConfig(prev => ({ ...prev, hidePoweredBy: v }))} />
              </div>

              {/* Live preview bar */}
              {config.brandName && (
                <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px dashed hsl(var(--border))' }}>
                  <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">Preview</p>
                  <div className="flex items-center gap-3 p-3 rounded-lg" style={{ background: config.primaryColor ? `${config.primaryColor}15` : 'rgba(6,182,212,0.08)' }}>
                    {config.logoUrl ? (
                      <img src={config.logoUrl} alt="Logo" className="h-7 max-w-24 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                    ) : (
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                        style={{ background: `linear-gradient(135deg,${config.primaryColor ?? '#06b6d4'},${config.secondaryColor ?? '#0ea5e9'})` }}>
                        {config.brandName?.[0]}
                      </div>
                    )}
                    <span className="text-sm font-semibold text-foreground">{config.brandName}</span>
                    {!config.hidePoweredBy && (
                      <span className="ml-auto text-[10px] text-muted-foreground">Powered by Kanavu AI</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Domain Tab */}
          {tab === 'domain' && (
            <div {...anim(3)} className="kv-anim rounded-xl p-5 space-y-5" style={cardStyle}>
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-1">Custom Domain Setup</h3>
                <p className="text-xs text-muted-foreground">Point your subdomain (e.g. app.yourcompany.com) to this platform so clients see your brand.</p>
              </div>

              <div className="flex gap-3">
                <input className={`${inputCls} flex-1`} style={inputStyle} placeholder="app.yourcompany.com"
                  value={domainInput} onChange={e => setDomainInput(e.target.value)} />
                <button onClick={handleVerifyDomain} disabled={verifying || !domainInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
                  <Shield className="h-4 w-4" />
                  {verifying ? 'Checking…' : 'Verify'}
                </button>
              </div>

              {domainVerified && (
                <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <CheckCircle className="h-4 w-4 shrink-0" />Domain verified and active!
                </div>
              )}

              {dnsRecords.length > 0 && !domainVerified && (
                <div>
                  <div className="flex items-center gap-2 text-xs rounded-xl px-4 py-2.5 mb-3" style={{ color: '#fbbf24', background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.2)' }}>
                    <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                    Add these DNS records to your registrar, then verify again.
                  </div>
                  <div className="overflow-x-auto rounded-xl" style={{ border: '1px solid hsl(var(--border))' }}>
                    <table className="w-full text-xs">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                          {['Type', 'Host', 'Value', 'TTL', ''].map(h => (
                            <th key={h} className="text-left px-4 py-2.5 text-muted-foreground font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {dnsRecords.map((r, i) => (
                          <tr key={i} style={{ borderTop: i > 0 ? '1px solid hsl(var(--border))' : undefined }}>
                            <td className="px-4 py-2.5">
                              <span className="px-1.5 py-0.5 rounded text-xs font-mono" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>{r.type}</span>
                            </td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono max-w-[160px] truncate">{r.host}</td>
                            <td className="px-4 py-2.5 text-muted-foreground font-mono max-w-[200px] truncate">{r.value}</td>
                            <td className="px-4 py-2.5 text-muted-foreground tabular">{r.ttl}</td>
                            <td className="px-4 py-2.5">
                              <button onClick={() => copyDns(r.value)} className="p-1 rounded transition-colors hover:text-foreground text-muted-foreground">
                                {copiedDns === r.value ? <CheckCircle className="h-3.5 w-3.5" style={{ color: '#34d399' }} /> : <Copy className="h-3.5 w-3.5" />}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Advanced Tab */}
          {tab === 'advanced' && (
            <div {...anim(3)} className="kv-anim rounded-xl p-5 space-y-5" style={cardStyle}>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1">Custom CSS</label>
                <p className="text-xs text-muted-foreground mb-2">Inject CSS to override platform styles for your branded experience</p>
                <textarea
                  rows={10}
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none font-mono"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  placeholder={`:root {\n  --primary: #your-color;\n}\n\n.sidebar-logo {\n  content: url('https://your-logo.png');\n}`}
                  value={config.customCss ?? ''}
                  onChange={e => setConfig(prev => ({ ...prev, customCss: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Support Phone</label>
                <input className={inputCls} style={inputStyle} placeholder="+1 (555) 000-0000"
                  value={config.supportPhone ?? ''} onChange={e => setConfig(prev => ({ ...prev, supportPhone: e.target.value }))} />
              </div>
            </div>
          )}
        </>
      )}

      {/* Sub-accounts section — always visible for Business */}
      <div {...anim(4)} className="kv-anim rounded-xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Sub-Accounts</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Manage client accounts under your reseller umbrella</p>
          </div>
          <Link
            href="/dashboard/white-label/accounts"
            className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-all hover:scale-[1.02]"
            style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.2)' }}
          >
            <Plus className="h-3.5 w-3.5" />
            New account
          </Link>
        </div>

        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
          <div className="px-4 py-8 text-center">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" style={{ opacity: 0.4 }} />
            <p className="text-sm text-muted-foreground">No sub-accounts yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create accounts for your clients to manage their own workspaces under your brand.</p>
            <Link href="/dashboard/white-label/accounts" className="inline-flex items-center gap-1.5 mt-3 text-xs font-medium" style={{ color: '#06b6d4' }}>
              Create first sub-account <ChevronRight className="h-3 w-3" />
            </Link>
          </div>
        </div>

        <div className="mt-4 grid sm:grid-cols-3 gap-3">
          {[
            { label: 'Monthly revenue per account', value: 'You set the price' },
            { label: 'Margin', value: 'Keep 100%' },
            { label: 'Accounts included', value: 'Unlimited' },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-xl p-3 text-center" style={{ background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.1)' }}>
              <p className="text-xs text-muted-foreground">{label}</p>
              <p className="text-sm font-semibold mt-1" style={{ color: '#06b6d4' }}>{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
