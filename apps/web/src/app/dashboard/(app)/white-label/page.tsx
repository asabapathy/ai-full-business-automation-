'use client'

import { useState, useEffect } from 'react'
import {
  Globe, CheckCircle, AlertCircle, Copy, ExternalLink, Save,
  Palette, Settings, Shield, Eye, RefreshCw
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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
  { name: 'Blue', primary: '#3b82f6', secondary: '#1d4ed8' },
  { name: 'Indigo', primary: '#6366f1', secondary: '#4338ca' },
  { name: 'Purple', primary: '#8b5cf6', secondary: '#7c3aed' },
  { name: 'Green', primary: '#10b981', secondary: '#059669' },
  { name: 'Orange', primary: '#f97316', secondary: '#ea580c' },
  { name: 'Red', primary: '#ef4444', secondary: '#dc2626' },
  { name: 'Pink', primary: '#ec4899', secondary: '#db2777' },
  { name: 'Teal', primary: '#14b8a6', secondary: '#0d9488' },
]

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors ${active ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
      {children}
    </button>
  )
}

export default function WhiteLabelPage() {
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
    apiClient.get<{ data: WhiteLabelConfig }>('/white-label/config')
      .then(r => {
        const data = (r as any).data ?? {}
        setConfig(data)
        if (data.customDomain) setDomainInput(data.customDomain)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.post('/white-label/config', config)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {
      alert('Failed to save settings')
    }
    setSaving(false)
  }

  const handleVerifyDomain = async () => {
    if (!domainInput.trim()) return
    setVerifying(true)
    try {
      const res = await apiClient.post<{ data: { verified: boolean; dnsInstructions: DnsRecord[] } }>('/white-label/verify-domain', { domain: domainInput.trim() })
      const data = (res as any).data
      setDnsRecords(data?.dnsInstructions ?? [])
      setDomainVerified(data?.verified ?? false)
      if (data?.verified) {
        setConfig(prev => ({ ...prev, customDomain: domainInput.trim() }))
      }
    } catch {
      alert('Domain verification failed')
    }
    setVerifying(false)
  }

  const copyDns = (val: string) => {
    navigator.clipboard.writeText(val)
    setCopiedDns(val)
    setTimeout(() => setCopiedDns(null), 2000)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64"><RefreshCw className="h-8 w-8 text-blue-500 animate-spin" /></div>
  }

  return (
    <div className="space-y-6 p-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-100 flex items-center justify-center">
            <Globe className="h-5 w-5 text-violet-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">White Label</h1>
            <p className="text-sm text-gray-500">Brand the platform with your own identity and domain</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {saved && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full border border-green-200">
              <CheckCircle className="h-3.5 w-3.5" />Saved
            </span>
          )}
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>

      {/* Enable toggle */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold text-gray-900">Enable White Labeling</h2>
            <p className="text-sm text-gray-500 mt-0.5">Show your brand instead of Kanavu AI across the platform</p>
          </div>
          <button
            onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
            className={`relative w-12 h-6 rounded-full transition-colors ${config.enabled ? 'bg-blue-600' : 'bg-gray-200'}`}
          >
            <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.enabled ? 'translate-x-7' : 'translate-x-1'}`} />
          </button>
        </div>
      </div>

      {config.enabled && (
        <>
          {/* Tabs */}
          <div className="flex gap-2">
            <TabButton active={tab === 'branding'} onClick={() => setTab('branding')}><Palette className="h-4 w-4" />Branding</TabButton>
            <TabButton active={tab === 'domain'} onClick={() => setTab('domain')}><Globe className="h-4 w-4" />Custom Domain</TabButton>
            <TabButton active={tab === 'advanced'} onClick={() => setTab('advanced')}><Settings className="h-4 w-4" />Advanced</TabButton>
          </div>

          {/* Branding Tab */}
          {tab === 'branding' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700">Brand Name *</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Your Company Name"
                    value={config.brandName ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, brandName: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Support Email</label>
                  <input type="email" className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="support@yourcompany.com"
                    value={config.supportEmail ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, supportEmail: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-gray-700">Logo URL</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.com/logo.png"
                    value={config.logoUrl ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, logoUrl: e.target.value }))} />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-700">Favicon URL</label>
                  <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="https://yourcompany.com/favicon.ico"
                    value={config.faviconUrl ?? ''}
                    onChange={e => setConfig(prev => ({ ...prev, faviconUrl: e.target.value }))} />
                </div>
              </div>

              {/* Logo preview */}
              {config.logoUrl && (
                <div className="rounded-lg border bg-gray-50 p-4 flex items-center gap-3">
                  <img src={config.logoUrl} alt="Logo preview" className="h-10 max-w-32 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                  <span className="text-sm text-gray-500">Logo preview</span>
                </div>
              )}

              <div>
                <label className="text-xs font-medium text-gray-700 mb-2 block">Brand Colors</label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.name}
                      onClick={() => setConfig(prev => ({ ...prev, primaryColor: preset.primary, secondaryColor: preset.secondary }))}
                      className={`w-8 h-8 rounded-lg border-2 transition-transform hover:scale-110 ${config.primaryColor === preset.primary ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                      style={{ background: preset.primary }}
                      title={preset.name}
                    />
                  ))}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-gray-500">Primary Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" className="w-10 h-8 rounded border cursor-pointer"
                        value={config.primaryColor ?? '#3b82f6'}
                        onChange={e => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))} />
                      <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={config.primaryColor ?? '#3b82f6'}
                        onChange={e => setConfig(prev => ({ ...prev, primaryColor: e.target.value }))} />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500">Secondary Color</label>
                    <div className="flex items-center gap-2 mt-1">
                      <input type="color" className="w-10 h-8 rounded border cursor-pointer"
                        value={config.secondaryColor ?? '#1d4ed8'}
                        onChange={e => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                      <input className="flex-1 border rounded-lg px-3 py-1.5 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={config.secondaryColor ?? '#1d4ed8'}
                        onChange={e => setConfig(prev => ({ ...prev, secondaryColor: e.target.value }))} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={() => setConfig(prev => ({ ...prev, hidePoweredBy: !prev.hidePoweredBy }))}
                  className={`relative w-10 h-5 rounded-full transition-colors ${config.hidePoweredBy ? 'bg-blue-600' : 'bg-gray-200'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.hidePoweredBy ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
                <div>
                  <p className="text-sm font-medium text-gray-700">Hide "Powered by Kanavu AI"</p>
                  <p className="text-xs text-gray-400">Remove Kanavu AI branding from the platform</p>
                </div>
              </div>
            </div>
          )}

          {/* Domain Tab */}
          {tab === 'domain' && (
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Custom Domain Setup</h3>
                <p className="text-sm text-gray-500">Point your domain to this platform so clients see your brand.</p>
              </div>

              <div className="flex gap-3">
                <input
                  className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="app.yourcompany.com"
                  value={domainInput}
                  onChange={e => setDomainInput(e.target.value)}
                />
                <button onClick={handleVerifyDomain} disabled={verifying || !domainInput.trim()}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
                  <Shield className="h-4 w-4" />
                  {verifying ? 'Checking...' : 'Verify Domain'}
                </button>
              </div>

              {domainVerified && (
                <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 rounded-lg px-3 py-2 border border-green-200">
                  <CheckCircle className="h-4 w-4" />Domain verified and active!
                </div>
              )}

              {dnsRecords.length > 0 && !domainVerified && (
                <div>
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 rounded-lg px-3 py-2 border border-amber-200 mb-3">
                    <AlertCircle className="h-4 w-4" />Add these DNS records to your domain registrar, then verify again.
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50">
                          {['Type', 'Host', 'Value', 'TTL', ''].map(h => (
                            <th key={h} className="text-left px-3 py-2 text-gray-500 font-medium">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {dnsRecords.map((r, i) => (
                          <tr key={i} className="font-mono">
                            <td className="px-3 py-2"><span className="bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">{r.type}</span></td>
                            <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">{r.host}</td>
                            <td className="px-3 py-2 text-gray-600 max-w-[200px] truncate">{r.value}</td>
                            <td className="px-3 py-2 text-gray-400">{r.ttl}</td>
                            <td className="px-3 py-2">
                              <button onClick={() => copyDns(r.value)}
                                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600">
                                {copiedDns === r.value ? <CheckCircle className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
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
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5">
              <div>
                <label className="text-xs font-medium text-gray-700">Custom CSS</label>
                <p className="text-xs text-gray-400 mt-0.5 mb-1">Inject custom CSS to override platform styles</p>
                <textarea
                  rows={10}
                  className="w-full border rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  placeholder=":root {\n  --primary: #your-color;\n}\n\n.sidebar {\n  background: #your-bg;\n}"
                  value={config.customCss ?? ''}
                  onChange={e => setConfig(prev => ({ ...prev, customCss: e.target.value }))}
                />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-700">Support Phone</label>
                <input className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="+1 (555) 000-0000"
                  value={config.supportPhone ?? ''}
                  onChange={e => setConfig(prev => ({ ...prev, supportPhone: e.target.value }))} />
              </div>
            </div>
          )}

          {/* Preview bar */}
          {config.brandName && (
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Preview</h3>
              <div className="flex items-center gap-3 p-3 rounded-lg border border-dashed" style={{ borderColor: config.primaryColor ?? '#3b82f6' }}>
                {config.logoUrl ? (
                  <img src={config.logoUrl} alt="Logo" className="h-8 max-w-24 object-contain" onError={e => (e.currentTarget.style.display = 'none')} />
                ) : (
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                    style={{ background: config.primaryColor ?? '#3b82f6' }}>
                    {config.brandName?.[0] ?? 'B'}
                  </div>
                )}
                <span className="font-semibold text-gray-900">{config.brandName}</span>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
