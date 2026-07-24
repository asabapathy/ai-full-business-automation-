'use client'

import { useState, useEffect } from 'react'
import {
  Store, Star, CheckCircle, Search, Filter, X, ExternalLink,
  Zap, Globe, Clock, Download, Trash2
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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

const PRICING_BADGE: Record<string, { label: string; cls: string }> = {
  free: { label: 'Free', cls: 'bg-green-50 text-green-700 border-green-200' },
  freemium: { label: 'Freemium', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
  paid: { label: 'Paid', cls: 'bg-purple-50 text-purple-700 border-purple-200' },
}

const INTEGRATION_BADGE: Record<string, { label: string; cls: string }> = {
  native: { label: 'Native', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  zapier: { label: 'Zapier', cls: 'bg-orange-50 text-orange-700 border-orange-200' },
  api: { label: 'API', cls: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  manual: { label: 'Manual', cls: 'bg-gray-50 text-gray-600 border-gray-200' },
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

function PartnerCard({ partner, onInstall, onUninstall, onView, loading }: {
  partner: Partner
  onInstall: (id: string) => void
  onUninstall: (id: string) => void
  onView: (p: Partner) => void
  loading: boolean
}) {
  const priceBadge = PRICING_BADGE[partner.pricing]
  const intBadge = INTEGRATION_BADGE[partner.integrationStatus]
  const icon = PARTNER_ICONS[partner.name] ?? '🔌'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-all group relative">
      {partner.featured && (
        <div className="absolute top-3 right-3">
          <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">Featured</span>
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        <div className="text-3xl leading-none w-12 h-12 flex items-center justify-center bg-gray-50 rounded-xl border">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900">{partner.name}</h3>
            {partner.installed && (
              <span className="flex items-center gap-0.5 text-[10px] font-medium bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full">
                <CheckCircle className="h-2.5 w-2.5" />Installed
              </span>
            )}
          </div>
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-1">{partner.tagline}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${priceBadge.cls}`}>{priceBadge.label}</span>
        <span className={`text-[10px] font-medium border px-1.5 py-0.5 rounded-full ${intBadge.cls}`}>{intBadge.label}</span>
        {partner.setupMinutes && (
          <span className="flex items-center gap-0.5 text-[10px] text-gray-500"><Clock className="h-2.5 w-2.5" />{partner.setupMinutes}m setup</span>
        )}
      </div>

      <div className="flex items-center gap-1 mb-4">
        <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
        <span className="text-xs font-medium text-gray-700">{partner.rating}</span>
        <span className="text-xs text-gray-400">({partner.reviewCount})</span>
      </div>

      <div className="flex gap-2">
        <button onClick={() => onView(partner)}
          className="flex-1 px-3 py-1.5 border rounded-lg text-xs font-medium text-gray-600 hover:bg-gray-50">
          View Details
        </button>
        {partner.installed ? (
          <button onClick={() => onUninstall(partner.id)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-600 rounded-lg text-xs font-medium hover:bg-red-50 disabled:opacity-50">
            <Trash2 className="h-3 w-3" />Remove
          </button>
        ) : (
          <button onClick={() => onInstall(partner.id)} disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50">
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
  const priceBadge = PRICING_BADGE[partner.pricing]
  const intBadge = INTEGRATION_BADGE[partner.integrationStatus]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        <div className="flex items-start gap-4 p-6 border-b">
          <div className="text-5xl">{icon}</div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-gray-900">{partner.name}</h2>
              {partner.installed && (
                <span className="flex items-center gap-1 text-xs font-medium bg-green-100 text-green-700 px-2 py-0.5 rounded-full">
                  <CheckCircle className="h-3 w-3" />Installed
                </span>
              )}
            </div>
            <p className="text-sm text-gray-500 mt-0.5">{partner.category}</p>
            <div className="flex gap-1.5 mt-2">
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${priceBadge.cls}`}>{priceBadge.label}{partner.pricingDetail ? ` · ${partner.pricingDetail}` : ''}</span>
              <span className={`text-xs font-medium border px-2 py-0.5 rounded-full ${intBadge.cls}`}>{intBadge.label} integration</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <p className="text-sm text-gray-700 leading-relaxed">{partner.description}</p>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(i => <Star key={i} className={`h-4 w-4 ${i <= Math.round(partner.rating) ? 'fill-amber-400 text-amber-400' : 'text-gray-200'}`} />)}
            </div>
            <span className="text-sm font-medium text-gray-700">{partner.rating}</span>
            <span className="text-sm text-gray-400">· {partner.reviewCount} reviews</span>
          </div>

          {partner.tags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {partner.tags.map(t => (
                <span key={t} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{t}</span>
              ))}
            </div>
          )}

          {partner.setupMinutes && (
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-blue-50 rounded-lg px-3 py-2">
              <Clock className="h-4 w-4 text-blue-500" />
              Estimated setup time: <strong>{partner.setupMinutes} minutes</strong>
            </div>
          )}
        </div>
        <div className="flex gap-3 px-6 pb-6">
          {partner.websiteUrl && (
            <a href={partner.websiteUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-4 py-2 border rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <ExternalLink className="h-4 w-4" />Visit Website
            </a>
          )}
          {partner.installed ? (
            <button onClick={() => { onUninstall(partner.id); onClose() }} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg text-sm font-medium hover:bg-red-50 disabled:opacity-50">
              <Trash2 className="h-4 w-4" />Remove Integration
            </button>
          ) : (
            <button onClick={() => { onInstall(partner.id); onClose() }} disabled={loading}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              <Download className="h-4 w-4" />Install Integration
            </button>
          )}
        </div>
      </div>
    </div>
  )
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
    } catch {
      alert('Failed to install integration')
    }
    setActionLoading(false)
  }

  const handleUninstall = async (id: string) => {
    setActionLoading(true)
    try {
      await apiClient.delete(`/marketplace/${id}/install`)
      setPartners(prev => prev.map(p => p.id === id ? { ...p, installed: false } : p))
    } catch {
      alert('Failed to remove integration')
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
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
            <Store className="h-5 w-5 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Partner Marketplace</h1>
            <p className="text-sm text-gray-500">Integrations and apps to extend your platform</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {installedCount > 0 && (
            <span className="text-xs font-medium bg-green-50 text-green-700 border border-green-200 px-2.5 py-1 rounded-full">
              {installedCount} installed
            </span>
          )}
        </div>
      </div>

      {/* Search & filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <input className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search integrations..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}>
          <option value="All">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          value={pricingFilter} onChange={e => setPricingFilter(e.target.value)}>
          <option value="All">All Pricing</option>
          <option value="free">Free</option>
          <option value="freemium">Freemium</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {(['all', 'featured', 'installed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'installed' ? `Installed (${installedCount})` : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map(i => <div key={i} className="bg-gray-100 rounded-xl h-48 animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Store className="h-12 w-12 mx-auto mb-3 opacity-40" />
          <p className="text-lg font-medium">{tab === 'installed' ? 'No integrations installed' : 'No results found'}</p>
          <p className="text-sm mt-1">{tab === 'installed' ? 'Browse the marketplace to install integrations' : 'Try a different search or category'}</p>
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
