'use client'

import { useState, useEffect } from 'react'
import { Palette, Save, Globe, Eye, EyeOff } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface BrandConfig {
  brandName: string | null
  logoUrl: string | null
  faviconUrl: string | null
  primaryColor: string
  accentColor: string
  customDomain: string | null
  customCss: string | null
  emailFromName: string | null
  emailFromAddr: string | null
  hideKanavuBranding: boolean
}

export default function BrandSettingsPage() {
  const [config, setConfig] = useState<Partial<BrandConfig>>({
    primaryColor: '#6366f1',
    accentColor: '#8b5cf6',
    hideKanavuBranding: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  useEffect(() => {
    fetch(`${API_BASE}/brand`, { headers })
      .then(r => r.json())
      .then((d: { config: BrandConfig | null }) => {
        if (d.config) setConfig(d.config)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    await fetch(`${API_BASE}/brand`, { method: 'PUT', headers, body: JSON.stringify(config) })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const set = (key: keyof BrandConfig, value: unknown) => setConfig(p => ({ ...p, [key]: value }))

  if (loading) return <div className="p-6 text-gray-500">Loading...</div>

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Palette className="w-6 h-6 text-indigo-400" /> White-Label / Brand</h1>
          <p className="text-gray-400 text-sm mt-1">Customize the look and feel for your clients</p>
        </div>
        <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium disabled:opacity-50">
          <Save className="w-4 h-4" /> {saved ? 'Saved!' : saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="space-y-6">
        {/* Identity */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Brand Identity</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Brand Name</label>
              <input value={config.brandName ?? ''} onChange={e => set('brandName', e.target.value)} placeholder="Your Company Name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Logo URL</label>
              <input value={config.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} placeholder="https://..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
            </div>
          </div>
          {config.logoUrl && (
            <div className="mt-3">
              <img src={config.logoUrl} alt="Logo preview" className="h-12 object-contain" />
            </div>
          )}
        </section>

        {/* Colors */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Colors</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.primaryColor ?? '#6366f1'} onChange={e => set('primaryColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                <input value={config.primaryColor ?? ''} onChange={e => set('primaryColor', e.target.value)} className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none" />
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Accent Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={config.accentColor ?? '#8b5cf6'} onChange={e => set('accentColor', e.target.value)} className="w-10 h-10 rounded cursor-pointer border-0 bg-transparent" />
                <input value={config.accentColor ?? ''} onChange={e => set('accentColor', e.target.value)} className="flex-1 px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none" />
              </div>
            </div>
          </div>
        </section>

        {/* Domain & CSS */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4 flex items-center gap-2"><Globe className="w-4 h-4" /> Custom Domain & CSS</h2>
          <div className="space-y-3">
            <div>
              <label className="text-sm text-gray-400 block mb-1">Custom Domain</label>
              <input value={config.customDomain ?? ''} onChange={e => set('customDomain', e.target.value)} placeholder="app.yourbrand.com" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <p className="text-xs text-gray-500 mt-1">Point your CNAME to app.kanavu.ai to activate</p>
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">Custom CSS</label>
              <textarea value={config.customCss ?? ''} onChange={e => set('customCss', e.target.value)} rows={4} placeholder=":root { --primary: #6366f1; }" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none" />
            </div>
          </div>
        </section>

        {/* Email */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <h2 className="text-white font-semibold mb-4">Email Sender</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-400 block mb-1">From Name</label>
              <input value={config.emailFromName ?? ''} onChange={e => set('emailFromName', e.target.value)} placeholder="Your Business Name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div>
              <label className="text-sm text-gray-400 block mb-1">From Email</label>
              <input value={config.emailFromAddr ?? ''} onChange={e => set('emailFromAddr', e.target.value)} placeholder="noreply@yourbrand.com" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
            </div>
          </div>
        </section>

        {/* Branding toggle */}
        <section className="bg-gray-900 border border-gray-800 rounded-xl p-5">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-white font-semibold">Hide Kanavu Branding</h2>
              <p className="text-sm text-gray-400 mt-0.5">Remove "Powered by Kanavu AI" from client-facing pages</p>
            </div>
            <button
              onClick={() => set('hideKanavuBranding', !config.hideKanavuBranding)}
              className={`relative w-12 h-6 rounded-full transition-colors ${config.hideKanavuBranding ? 'bg-indigo-600' : 'bg-gray-700'}`}
            >
              <span className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${config.hideKanavuBranding ? 'translate-x-6' : ''}`} />
            </button>
          </div>
        </section>
      </div>
    </div>
  )
}
