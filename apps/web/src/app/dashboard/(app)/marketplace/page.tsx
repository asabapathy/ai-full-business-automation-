'use client'

import { useState, useEffect } from 'react'
import {
  Store, Star, CheckCircle, Search, X, ExternalLink,
  Clock, Download, Trash2
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Partner {
  id: string
  name: string
  category: string
  tagline: string
  description: string
  logoUrl?: string
  websiteUrl?: string
  pricing: 'free' | 'freemium' | 'paid'
  pricingDetail?: string
  integrationStatus: 'native' | 'zapier' | 'api' | 'manual'
  rating: number
  reviewCount: number
  featured: boolean
  tags: string[]
  setupMinutes?: number
  installed?: boolean
}

const PRICING_META: Record<string, { label: string; text: string; bg: string }> = {
  free:     { label: 'Free',     text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  freemium: { label: 'Freemium', text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  paid:     { label: 'Paid',     text: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
}

const INTEGRATION_META: Record<string, { label: string; text: string; bg: string }> = {
  native:  { label: 'Native',  text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  zapier:  { label: 'Zapier',  text: '#fb923c', bg: 'rgba(251,146,60,0.12)' },
  api:     { label: 'API',     text: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  manual:  { label: 'Manual',  text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const PARTNER_ICONS: Record<string, string> = {
  'QuickBooks Online': '🧾',
  'Stripe': '💳',
  'Google Analytics 4': '📊',
  'Zapier': '⚡',
  'Mailchimp': '🐵',
  'Calendly': '📅',
  'Twilio': '📱',
  'Google My Business': '📍',
  'Facebook & Instagram Ads': '📢',
  'DocuSign': '✍️',
  'Xero': '💼',
  'ElevenLabs': '🎙️',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function Chip({ text, bg, children }: { text: string; bg: string; children: React.ReactNode }) {
  return (
    <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: text, background: bg }}>
      {children}
    </span>
  )
}

function PartnerCard({ partner, onInstall, onUninstall, onView, loading }: {
  partner: Partner
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  onView: (p: Partner) => void
  loading: boolean
}) {
  const pm = PRICING_META[partner.pricing] ?? PRICING_META.paid
  const im = INTEGRATION_META[partner.integrationStatus] ?? INTEGRATION_META.manual
  const icon = PARTNER_ICONS[partner.name] ?? '🔌'

  return (
    <div className="rounded-xl p-5 transition-all relative hover:shadow-lg hover:shadow-black/10" style={cardStyle}>
      {partner.featured && (
        <div className="absolute top-3 right-3">
          <Chip text="#fbbf24" bg="rgba(251,191,36,0.12)">Featured</Chip>
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl leading-none w-12 h-12 flex items-center justify-center rounded-xl shrink-0" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-foreground">{partner.name}</h3>
            {partner.installed && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full" style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)' }}>
                <CheckCircle className="h-2.5 w-2.5" />Installed
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{partner.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <Chip text={pm.text} bg={pm.bg}>{pm.label}</Chip>
        <Chip text={im.text} bg={im.bg}>{im.label}</Chip>
        {partner.setupMinutes && (
          <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <Clock className="h-2.5 w-2.5" />{partner.setupMinutes}m setup
          </span>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4">
        <Star className="h-3.5 w-3.5" style={{ fill: '#fbbf24', color: '#fbbf24' }} />
        <span className="text-xs font-medium text-foreground">{partner.rating}</span>
        <span className="text-xs text-muted-foreground">({partner.reviewCount})</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onView(partner)}
          className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          style={{ border: '1px solid hsl(var(--border))' }}>
          View Details
        </button>
        {partner.installed ? (
          <button onClick={() => onUninstall(partner.id)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
            style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
            <Trash2 className="h-3 w-3" />Remove
          </button>
        ) : (
          <button onClick={() => onInstall(partner.id)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Download className="h-3 w-3" />Install
          </button>
        )}
      </div>
    </div>
  )
}

function PartnerModal({ partner, onClose, onInstall, onUninstall, loading }: {
  partner: Partner
  onClose: () => void
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  loading: boolean
}) {
  const icon = PARTNER_ICONS[partner.name] ?? '🔌'
  const pm = PRICING_META[partner.pricing] ?? PRICING_META.paid
  const im = INTEGRATION_META[partner.integrationStatus] ?? INTEGRATION_META.manual

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-lg rounded-2xl overflow-hidden" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        <div className="flex items-start gap-4 p-6" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="text-5xl">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{partner.name}</h2>
              {partner.installed && (
                <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full" style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)' }}>
                  <CheckCircle className="h-3 w-3" />Installed
                </span>
              )}
            </div>
            <p className="text-sm text-muted-foreground mt-0.5">{partner.category}</p>
            <div className="flex gap-1.5 mt-2">
              <Chip text={pm.text} bg={pm.bg}>{pm.label}{partner.pricingDetail ? ` · ${partner.pricingDetail}` : ''}</Chip>
              <Chip text={im.text} bg={im.bg}>{im.label} integration</Chip>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-foreground leading-relaxed">{partner.description}</p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => (
                <Star key={i} className="h-4 w-4" style={i <= Math.round(partner.rating) ? { fill: '#fbbf24', color: '#fbbf24' } : { color: 'hsl(var(--border))' }} />
              ))}
            </div>
            <span className="text-sm font-medium text-foreground">{partner.rating}</span>
            <span className="text-sm text-muted-foreground">· {partner.reviewCount} reviews</span>
          </div>

          {partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {partner.tags.map(t => (
                <span key={t} className="text-xs text-muted-foreground px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>{t}</span>
              ))}
            </div>
          )}

          {partner.setupMinutes && (
            <div className="flex items-center gap-2 text-sm rounded-lg px-3 py-2" style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
              <Clock className="h-4 w-4" />
              Estimated setup time: <strong>{partner.setupMinutes} minutes</strong>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          {partner.websiteUrl && (
            <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              <ExternalLink className="h-4 w-4" />Visit Website
            </a>
          )}
          {partner.installed ? (
            <button onClick={() => { onUninstall(partner.id); onClose() }} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ color: '#f87171', border: '1px solid rgba(248,113,113,0.3)', background: 'rgba(248,113,113,0.08)' }}>
              <Trash2 className="h-4 w-4" />Remove Integration
            </button>
          ) : (
            <button onClick={() => { onInstall(partner.id); onClose() }} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Download className="h-4 w-4" />Install Integration
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function MarketplacePage() {
  const [partners, setPartners] = useState<Partner[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('All')
  const [pricingFilter, setPricingFilter] = useState('All')
  const [tab, setTab] = useState<'all' | 'installed' | 'featured'>('all')
  const [selected, setSelected] = useState<Partner | null>(null)
  const [categories, setCategories] = useState<string[]>([])

  const load = async () => {
    setLoading(true)
    try {
      const [partnersRes, catsRes] = await Promise.all([
        apiClient.get<{ data: Partner[] }>('/marketplace'),
        apiClient.get<{ data: string[] }>('/marketplace/categories'),
      ])
      setPartners((partnersRes as any).data ?? [])
      setCategories((catsRes as any).data ?? [])
    } catch {
      setPartners([])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleInstall = async (id: string) => {
    setActionLoading(true)
    try {
      await apiClient.post(`/marketplace/${id}/install`, {})
      setPartners(prev => prev.map(p => p.id === id ? { ...p, installed: true } : p))
    } catch (e: any) {
      toast(e.message || 'Failed to install integration', 'error')
    }
    setActionLoading(false)
  }

  const handleUninstall = async (id: string) => {
    setActionLoading(true)
    try {
      await apiClient.delete(`/marketplace/${id}/install`)
      setPartners(prev => prev.map(p => p.id === id ? { ...p, installed: false } : p))
    } catch (e: any) {
      toast(e.message || 'Failed to remove integration', 'error')
    }
    setActionLoading(false)
  }

  const filtered = partners.filter(p => {
    if (tab === 'installed' && !p.installed) return false
    if (tab === 'featured' && !p.featured) return false
    if (categoryFilter !== 'All' && p.category !== categoryFilter) return false
    if (pricingFilter !== 'All' && p.pricing !== pricingFilter) return false
    if (search) {
      const q = search.toLowerCase()
      return p.name.toLowerCase().includes(q) || p.category.toLowerCase().includes(q) || p.tagline.toLowerCase().includes(q)
    }
    return true
  })

  const installedCount = partners.filter(p => p.installed).length

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}>
            <Store className="h-5 w-5" style={{ color: '#06b6d4' }} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Partner Marketplace</h1>
            <p className="text-sm text-muted-foreground">Integrations and apps to extend your platform</p>
          </div>
        </div>
        {installedCount > 0 && (
          <span className="text-xs font-medium px-2.5 py-1 rounded-full" style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)', border: '1px solid rgba(52,211,153,0.2)' }}>
            {installedCount} installed
          </span>
        )}
      </div>

      <div {...anim(1)} className="kv-anim flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input className="w-full pl-9 pr-4 py-2.5 rounded-lg text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={inputStyle} placeholder="Search integrations..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className={inputCls} style={{ ...inputStyle, width: 'auto' }}
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className={inputCls} style={{ ...inputStyle, width: 'auto' }}
          value={pricingFilter} onChange={e => setPricingFilter(e.target.value)}>
          <option value="All">All Pricing</option>
          <option value="free">Free</option>
          <option value="freemium">Freemium</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div {...anim(2)} className="kv-anim flex gap-1" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        {(['all', 'featured', 'installed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium transition-colors capitalize"
            style={tab === t
              ? { borderBottom: '2px solid #06b6d4', color: '#06b6d4', marginBottom: '-1px' }
              : { borderBottom: '2px solid transparent', color: 'hsl(var(--muted-foreground))' }}>
            {t === 'installed' ? `Installed (${installedCount})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="rounded-xl h-48 animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <Store className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium text-foreground">{tab === 'installed' ? 'No integrations installed' : 'No results found'}</p>
          <p className="text-sm text-muted-foreground mt-1">{tab === 'installed' ? 'Browse the marketplace to install integrations' : 'Try a different search or category'}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(p => (
            <PartnerCard
              key={p.id}
              partner={p}
              onInstall={handleInstall}
              onUninstall={handleUninstall}
              onView={setSelected}
              loading={actionLoading}
            />
          ))}
        </div>
      )}

      {selected && (
        <PartnerModal
          partner={selected}
          onClose={() => setSelected(null)}
          onInstall={handleInstall}
          onUninstall={handleUninstall}
          loading={actionLoading}
        />
      )}
    </div>
  )
}
