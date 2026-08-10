'use client'

import { useState, useEffect } from 'react'
import { Palette, Save, Globe, X } from 'lucide-react'
import { apiClient } from '../../../../../lib/api-client'
import { toast } from '../../../../../lib/toast'
import { Skeleton } from '../../../../../components/ui/skeleton'

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

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function BrandSettingsPage() {
  const [config, setConfig] = useState<Partial<BrandConfig>>({
    primaryColor: '#06b6d4',
    accentColor: '#0ea5e9',
    hideKanavuBranding: false,
  })
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    apiClient.get('/brand')
      .then((d: any) => { if (d?.config) setConfig(d.config) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      await apiClient.put('/brand', config)
      toast('Brand settings saved', 'success')
    } catch {
      toast('Failed to save settings', 'error')
    } finally {
      setSaving(false)
    }
  }

  const set = (key: keyof BrandConfig, value: unknown) => setConfig(p => ({ ...p, [key]: value }))

  if (loading) {
    return (
      <div className="p-6 space-y-4 max-w-[800px]">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 max-w-[800px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">White-Label / Brand</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Customize the look and feel for your clients</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Save className="h-4 w-4" />
          {saving ? 'Saving…' : 'Save Changes'}
        </button>
      </div>

      {/* Brand Identity */}
      <section {...anim(1)} className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary" />
          Brand Identity
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Brand Name</label>
            <input value={config.brandName ?? ''} onChange={e => set('brandName', e.target.value)} className={inputCls} style={inputStyle} placeholder="Your Company Name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Logo URL</label>
            <input value={config.logoUrl ?? ''} onChange={e => set('logoUrl', e.target.value)} className={inputCls} style={inputStyle} placeholder="https://..." />
          </div>
        </div>
        {config.logoUrl && (
          <div className="flex items-center gap-3 mt-2">
            <img src={config.logoUrl} alt="Logo preview" className="h-10 object-contain rounded" />
            <button onClick={() => set('logoUrl', null)} className="text-xs text-muted-foreground hover:text-destructive transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </section>

      {/* Colors */}
      <section {...anim(2)} className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold text-foreground">Brand Colors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Primary Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.primaryColor ?? '#06b6d4'}
                onChange={e => set('primaryColor', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
                style={{ background: 'transparent' }}
              />
              <input
                value={config.primaryColor ?? ''}
                onChange={e => set('primaryColor', e.target.value)}
                className={inputCls + ' font-mono'}
                style={inputStyle}
                placeholder="#06b6d4"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Accent Color</label>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={config.accentColor ?? '#0ea5e9'}
                onChange={e => set('accentColor', e.target.value)}
                className="w-10 h-10 rounded-lg cursor-pointer border-0"
                style={{ background: 'transparent' }}
              />
              <input
                value={config.accentColor ?? ''}
                onChange={e => set('accentColor', e.target.value)}
                className={inputCls + ' font-mono'}
                style={inputStyle}
                placeholder="#0ea5e9"
              />
            </div>
          </div>
        </div>
        <div className="flex gap-3 pt-1">
          <div className="h-8 flex-1 rounded-lg" style={{ background: config.primaryColor ?? '#06b6d4' }} />
          <div className="h-8 flex-1 rounded-lg" style={{ background: config.accentColor ?? '#0ea5e9' }} />
          <div className="h-8 flex-1 rounded-lg" style={{ background: `linear-gradient(135deg, ${config.primaryColor ?? '#06b6d4'}, ${config.accentColor ?? '#0ea5e9'})` }} />
        </div>
      </section>

      {/* Domain & CSS */}
      <section {...anim(3)} className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <Globe className="h-4 w-4 text-primary" />
          Custom Domain & CSS
        </h2>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Custom Domain</label>
          <input value={config.customDomain ?? ''} onChange={e => set('customDomain', e.target.value)} className={inputCls} style={inputStyle} placeholder="app.yourbrand.com" />
          <p className="text-xs text-muted-foreground mt-1.5">Point your CNAME to <code className="text-primary">app.kanavu.ai</code> to activate</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Custom CSS</label>
          <textarea
            value={config.customCss ?? ''}
            onChange={e => set('customCss', e.target.value)}
            rows={4}
            className={inputCls + ' font-mono resize-none'}
            style={inputStyle}
            placeholder=":root { --primary: #06b6d4; }"
          />
        </div>
      </section>

      {/* Email Sender */}
      <section {...anim(4)} className="rounded-xl p-5 space-y-4" style={cardStyle}>
        <h2 className="text-sm font-semibold text-foreground">Email Sender</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">From Name</label>
            <input value={config.emailFromName ?? ''} onChange={e => set('emailFromName', e.target.value)} className={inputCls} style={inputStyle} placeholder="Your Business Name" />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">From Email</label>
            <input type="email" value={config.emailFromAddr ?? ''} onChange={e => set('emailFromAddr', e.target.value)} className={inputCls} style={inputStyle} placeholder="noreply@yourbrand.com" />
          </div>
        </div>
      </section>

      {/* Branding toggle */}
      <section {...anim(5)} className="rounded-xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Hide Kanavu Branding</h2>
            <p className="text-xs text-muted-foreground mt-0.5">Remove "Powered by Kanavu AI" from client-facing pages</p>
          </div>
          <button
            onClick={() => set('hideKanavuBranding', !config.hideKanavuBranding)}
            className="relative w-11 h-6 rounded-full transition-colors"
            style={{ background: config.hideKanavuBranding ? 'linear-gradient(135deg, #06b6d4, #0ea5e9)' : 'hsl(var(--border))' }}
          >
            <span
              className="absolute top-1 w-4 h-4 bg-white rounded-full transition-all"
              style={{ left: config.hideKanavuBranding ? '1.375rem' : '0.25rem' }}
            />
          </button>
        </div>
      </section>
    </div>
  )
}
