'use client'

import { useState, useEffect } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, Eye, MousePointer, Target,
  Plus, Play, Pause, RefreshCw, ChevronRight, X, AlertCircle, CheckCircle, ExternalLink
} from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Campaign {
  id: string
  name: string
  status: 'ENABLED' | 'PAUSED' | 'REMOVED'
  type: string
  budget: number
  spend: number
  impressions: number
  clicks: number
  conversions: number
  ctr: number
  avgCpc: number
}

interface AccountSummary {
  totalCampaigns: number
  activeCampaigns: number
  totalSpend: number
  totalImpressions: number
  totalClicks: number
  totalConversions: number
  avgCtr: number
  costPerConversion: number
}

interface DailyMetric {
  date: string
  impressions: number
  clicks: number
  spend: number
  conversions: number
}

const fmt = (n: number, dec = 0) => n.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })
const fmtCurrency = (n: number) => `$${fmt(n, 2)}`
const fmtPct = (n: number) => `${(n * 100).toFixed(2)}%`

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function StatCard({ label, value, sub, icon: Icon, trend }: { label: string; value: string; sub?: string; icon: any; trend?: number }) {
  return (
    <div className="rounded-xl p-5" style={cardStyle}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.1)' }}>
          <Icon className="h-5 w-5" style={{ color: '#06b6d4' }} />
        </div>
      </div>
      {trend !== undefined && (
        <div className="flex items-center gap-1 mt-3 text-xs font-medium" style={{ color: trend >= 0 ? '#34d399' : '#f87171' }}>
          {trend >= 0 ? <TrendingUp className="h-3.5 w-3.5" /> : <TrendingDown className="h-3.5 w-3.5" />}
          {Math.abs(trend).toFixed(1)}% vs last month
        </div>
      )}
    </div>
  )
}

function SparkLine({ data, color = '#06b6d4' }: { data: number[]; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const w = 120
  const h = 32
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - min) / range) * h}`).join(' ')
  return (
    <svg width={w} height={h} className="mt-2">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

function CampaignDrawer({
  campaign, onClose, onStatusChange
}: {
  campaign: Campaign
  onClose: () => void
  onStatusChange: (id: string, status: 'ENABLED' | 'PAUSED') => void
}) {
  const [metrics, setMetrics] = useState<DailyMetric[]>([])
  const [days, setDays] = useState(30)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    apiClient.get<{ data: { daily: DailyMetric[] } }>(`/google-ads/campaigns/${campaign.id}/metrics?days=${days}`)
      .then(r => setMetrics((r as any).data?.daily ?? []))
      .catch(() => setMetrics([]))
      .finally(() => setLoading(false))
  }, [campaign.id, days])

  const maxSpend = Math.max(...metrics.map(m => m.spend), 1)
  const isEnabled = campaign.status === 'ENABLED'

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose} />
      <div className="relative w-full max-w-lg shadow-2xl flex flex-col overflow-hidden"
        style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between p-5" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 className="font-semibold text-foreground">{campaign.name}</h2>
            <p className="text-xs text-muted-foreground mt-0.5">{campaign.type} · {campaign.status}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStatusChange(campaign.id, isEnabled ? 'PAUSED' : 'ENABLED')}
              className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
              style={isEnabled
                ? { color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }
                : { color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}
            >
              {isEnabled ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
              {isEnabled ? 'Pause' : 'Enable'}
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Total Spend', value: fmtCurrency(campaign.spend) },
              { label: 'Conversions', value: fmt(campaign.conversions) },
              { label: 'Impressions', value: fmt(campaign.impressions) },
              { label: 'Clicks', value: fmt(campaign.clicks) },
              { label: 'CTR', value: fmtPct(campaign.ctr) },
              { label: 'Avg CPC', value: fmtCurrency(campaign.avgCpc) },
            ].map(({ label, value }) => (
              <div key={label} className="rounded-lg p-3" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                <p className="text-xs text-muted-foreground">{label}</p>
                <p className="text-lg font-bold text-foreground mt-0.5 tabular-nums">{value}</p>
              </div>
            ))}
          </div>

          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-foreground">Daily Spend</h3>
              <div className="flex gap-1">
                {[7, 14, 30].map(d => (
                  <button key={d} onClick={() => setDays(d)}
                    className="text-xs px-2 py-0.5 rounded transition-colors"
                    style={days === d
                      ? { color: '#06b6d4', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.3)' }
                      : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }}>
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            {loading ? (
              <div className="h-24 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ) : (
              <div className="flex items-end gap-1 h-24">
                {metrics.map((m, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-0.5 group relative">
                    <div
                      className="w-full rounded-t-sm transition-opacity hover:opacity-80 cursor-pointer"
                      style={{ height: `${(m.spend / maxSpend) * 80}px`, background: '#06b6d4' }}
                    />
                    <div className="absolute bottom-full mb-1 text-xs rounded px-1.5 py-0.5 whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none z-10 text-white"
                      style={{ background: 'hsl(var(--foreground) / 0.9)' }}>
                      {m.date}: {fmtCurrency(m.spend)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {!loading && metrics.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">Clicks vs Conversions</h3>
              <div className="space-y-1.5">
                {metrics.slice(-7).map((m, i) => {
                  const maxClicks = Math.max(...metrics.map(x => x.clicks), 1)
                  return (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="w-12 text-muted-foreground text-right tabular-nums">{m.date.slice(5)}</span>
                      <div className="flex-1 rounded-full h-3 overflow-hidden" style={{ background: 'hsl(var(--muted))' }}>
                        <div className="h-full rounded-full" style={{ width: `${(m.clicks / maxClicks) * 100}%`, background: '#60a5fa' }} />
                      </div>
                      <span className="w-8 text-muted-foreground tabular-nums">{m.clicks}</span>
                      <span className="w-6 tabular-nums font-medium" style={{ color: '#34d399' }}>{m.conversions}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function NewCampaignModal({ onClose, onCreate }: { onClose: () => void; onCreate: (data: any) => void }) {
  const [form, setForm] = useState({ name: '', budget: '20', targetCpa: '', keywords: '', adHeadlines: '', adDescriptions: '' })
  const [saving, setSaving] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await onCreate({
        name: form.name,
        budget: parseFloat(form.budget),
        targetCpa: form.targetCpa ? parseFloat(form.targetCpa) : undefined,
        keywords: form.keywords.split('\n').map(k => k.trim()).filter(Boolean),
        adHeadlines: form.adHeadlines.split('\n').map(h => h.trim()).filter(Boolean),
        adDescriptions: form.adDescriptions.split('\n').map(d => d.trim()).filter(Boolean),
      })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
      <div className="relative w-full max-w-md rounded-2xl overflow-hidden" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="font-semibold text-foreground">New Search Campaign</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Campaign Name *</label>
            <input className={inputCls} style={inputStyle}
              value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Daily Budget ($) *</label>
              <input type="number" min="1" className={inputCls} style={inputStyle}
                value={form.budget} onChange={e => setForm(f => ({ ...f, budget: e.target.value }))} required />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target CPA ($)</label>
              <input type="number" min="0" step="0.01" placeholder="Optional" className={inputCls} style={inputStyle}
                value={form.targetCpa} onChange={e => setForm(f => ({ ...f, targetCpa: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Keywords (one per line)</label>
            <textarea rows={3} placeholder="plumber near me&#10;emergency plumbing&#10;pipe repair"
              className={`${inputCls} resize-none`} style={inputStyle}
              value={form.keywords} onChange={e => setForm(f => ({ ...f, keywords: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ad Headlines (one per line, max 30 chars each)</label>
            <textarea rows={3} placeholder="Fast Plumbing Service&#10;24/7 Emergency Plumber&#10;Licensed & Insured"
              className={`${inputCls} resize-none`} style={inputStyle}
              value={form.adHeadlines} onChange={e => setForm(f => ({ ...f, adHeadlines: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Ad Descriptions (one per line, max 90 chars each)</label>
            <textarea rows={2} placeholder="Get fast, reliable plumbing service. Call now for a free estimate."
              className={`${inputCls} resize-none`} style={inputStyle}
              value={form.adDescriptions} onChange={e => setForm(f => ({ ...f, adDescriptions: e.target.value }))} />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              Cancel
            </button>
            <button type="submit" disabled={saving || !form.name}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              {saving ? 'Creating…' : 'Create Campaign'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function GoogleAdsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [summary, setSummary] = useState<AccountSummary | null>(null)
  const [connected, setConnected] = useState(false)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Campaign | null>(null)
  const [showNew, setShowNew] = useState(false)
  const [showConnect, setShowConnect] = useState(false)
  const [connectForm, setConnectForm] = useState({ customerId: '', developerToken: '' })
  const [connecting, setConnecting] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [statusRes, summaryRes, campaignsRes] = await Promise.all([
        apiClient.get<{ data: { connected: boolean } }>('/google-ads/status'),
        apiClient.get<{ data: AccountSummary }>('/google-ads/summary'),
        apiClient.get<{ data: Campaign[] }>('/google-ads/campaigns'),
      ])
      setConnected((statusRes as any).data?.connected ?? false)
      setSummary((summaryRes as any).data ?? null)
      setCampaigns((campaignsRes as any).data ?? [])
    } catch {
      setConnected(false)
      setSummary({ totalCampaigns: 4, activeCampaigns: 3, totalSpend: 2610.70, totalImpressions: 272600, totalClicks: 4950, totalConversions: 176, avgCtr: 1.82, costPerConversion: 14.83 })
      setCampaigns([
        { id: '1', name: 'Brand Awareness Q4', status: 'ENABLED', type: 'SEARCH', budget: 50, spend: 1240.50, impressions: 84200, clicks: 2310, conversions: 47, ctr: 0.027, avgCpc: 0.54 },
        { id: '2', name: 'Lead Gen - Local Services', status: 'ENABLED', type: 'SEARCH', budget: 30, spend: 820.00, impressions: 31000, clicks: 1540, conversions: 89, ctr: 0.049, avgCpc: 0.53 },
        { id: '3', name: 'Competitor Keywords', status: 'PAUSED', type: 'SEARCH', budget: 20, spend: 340.20, impressions: 12400, clicks: 480, conversions: 12, ctr: 0.038, avgCpc: 0.71 },
        { id: '4', name: 'Retargeting - Website Visitors', status: 'ENABLED', type: 'DISPLAY', budget: 15, spend: 210.00, impressions: 145000, clicks: 620, conversions: 28, ctr: 0.004, avgCpc: 0.34 },
      ])
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const handleConnect = async () => {
    setConnecting(true)
    try {
      await apiClient.post('/google-ads/config', connectForm)
      const { data } = await apiClient.get<{ data: { url: string } }>('/google-ads/auth') as any
      if (data?.url) window.location.href = data.url
    } catch {
      toast('Failed to initiate Google Ads connection', 'error')
    }
    setConnecting(false)
  }

  const handleStatusChange = async (id: string, status: 'ENABLED' | 'PAUSED') => {
    try {
      await apiClient.patch(`/google-ads/campaigns/${id}/status`, { status })
      setCampaigns(prev => prev.map(c => c.id === id ? { ...c, status } : c))
      if (selected?.id === id) setSelected(prev => prev ? { ...prev, status } : prev)
    } catch {
      toast('Failed to update campaign status', 'error')
    }
  }

  const handleCreate = async (data: any) => {
    try {
      await apiClient.post('/google-ads/campaigns', data)
      setShowNew(false)
      load()
    } catch {
      toast('Failed to create campaign', 'error')
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" style={{ color: '#06b6d4' }} />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6 max-w-6xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <svg viewBox="0 0 24 24" className="h-6 w-6 fill-white">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Google Ads</h1>
            <p className="text-sm text-muted-foreground">Manage campaigns, budgets and performance</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {!connected && (
            <button onClick={() => setShowConnect(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <ExternalLink className="h-4 w-4" />
              Connect Google Ads
            </button>
          )}
          {connected && (
            <>
              <span className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
                style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.3)' }}>
                <CheckCircle className="h-3.5 w-3.5" />Connected
              </span>
              <button onClick={() => setShowNew(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                <Plus className="h-4 w-4" />
                New Campaign
              </button>
            </>
          )}
          <button onClick={load} className="p-2 rounded-lg hover:bg-muted transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>
            <RefreshCw className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {!connected && (
        <div className="rounded-xl p-4 flex items-start gap-3"
          style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" style={{ color: '#fbbf24' }} />
          <div>
            <p className="text-sm font-medium" style={{ color: '#fbbf24' }}>Demo data — connect your Google Ads account to see real campaigns</p>
            <p className="text-xs text-muted-foreground mt-0.5">Click "Connect Google Ads" to link your account via OAuth.</p>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatCard label="Total Spend" value={fmtCurrency(summary.totalSpend)} icon={DollarSign} trend={8.3} />
          <StatCard label="Impressions" value={fmt(summary.totalImpressions)} icon={Eye} trend={12.1} />
          <StatCard label="Clicks" value={fmt(summary.totalClicks)} icon={MousePointer} trend={5.7} />
          <StatCard label="Conversions" value={fmt(summary.totalConversions)} sub={`$${summary.costPerConversion.toFixed(2)} per conv.`} icon={Target} trend={-2.4} />
        </div>
      )}

      <div className="rounded-xl overflow-hidden" style={cardStyle}>
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <h2 className="text-base font-semibold text-foreground">Campaigns</h2>
          <span className="text-xs text-muted-foreground">{campaigns.length} total</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid hsl(var(--border))' }}>
                {['Campaign', 'Status', 'Budget/day', 'Spend', 'Impressions', 'Clicks', 'CTR', 'Conv.', ''].map(h => (
                  <th key={h} className="text-left text-xs font-medium text-muted-foreground px-4 py-3 whitespace-nowrap uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {campaigns.map((c, i) => (
                <tr key={c.id} className="cursor-pointer hover:bg-muted/30 transition-colors"
                  style={{ borderBottom: i < campaigns.length - 1 ? '1px solid hsl(var(--border))' : undefined }}
                  onClick={() => setSelected(c)}>
                  <td className="px-4 py-3 font-medium text-foreground max-w-[180px] truncate">{c.name}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full"
                      style={c.status === 'ENABLED'
                        ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                        : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: c.status === 'ENABLED' ? '#34d399' : '#94a3b8' }} />
                      {c.status === 'ENABLED' ? 'Active' : 'Paused'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtCurrency(c.budget)}</td>
                  <td className="px-4 py-3 font-medium text-foreground tabular-nums">{fmtCurrency(c.spend)}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmt(c.impressions)}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmt(c.clicks)}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{fmtPct(c.ctr)}</td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums">{c.conversions}</td>
                  <td className="px-4 py-3">
                    <button onClick={e => { e.stopPropagation(); setSelected(c) }}
                      className="p-1.5 rounded-lg hover:bg-muted transition-colors">
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="relative w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="font-semibold text-foreground">Connect Google Ads</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Customer ID (without dashes)</label>
              <input className={inputCls} style={inputStyle}
                placeholder="1234567890"
                value={connectForm.customerId}
                onChange={e => setConnectForm(f => ({ ...f, customerId: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Developer Token</label>
              <input type="password" className={inputCls} style={inputStyle}
                placeholder="Your developer token"
                value={connectForm.developerToken}
                onChange={e => setConnectForm(f => ({ ...f, developerToken: e.target.value }))} />
            </div>
            <p className="text-xs text-muted-foreground">You'll be redirected to Google to authorize access. Ensure your Google Ads developer token is approved for production use.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowConnect(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={handleConnect} disabled={connecting || !connectForm.customerId || !connectForm.developerToken}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {connecting ? 'Connecting…' : 'Connect & Authorize'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <CampaignDrawer campaign={selected} onClose={() => setSelected(null)} onStatusChange={handleStatusChange} />
      )}

      {showNew && (
        <NewCampaignModal onClose={() => setShowNew(false)} onCreate={handleCreate} />
      )}
    </div>
  )
}
