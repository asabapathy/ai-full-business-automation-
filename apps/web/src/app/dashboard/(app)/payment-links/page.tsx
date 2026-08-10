'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

import { Link2, Plus, Copy, XCircle, CheckCircle, DollarSign, Clock, TrendingUp, X } from 'lucide-react'

interface PaymentLink {
  id: string
  amount: number
  currency: string
  description?: string
  url: string
  status: string
  expiresAt?: string
  createdAt: string
  contact?: { firstName: string; lastName: string }
}

interface Stats { total: number; active: number; paid: number; totalRevenue: number }

const STATUS_META: Record<string, { text: string; bg: string }> = {
  active:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  paid:     { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  expired:  { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  inactive: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const DEMO_LINKS: PaymentLink[] = [
  {
    id: '1',
    amount: 450000,
    currency: 'USD',
    description: 'HVAC Installation — Johnson Residence',
    url: 'https://buy.stripe.com/demo_hvac_johnson',
    status: 'paid',
    createdAt: new Date(Date.now() - 14 * 86400000).toISOString(),
    contact: { firstName: 'Mark', lastName: 'Johnson' },
  },
  {
    id: '2',
    amount: 120000,
    currency: 'USD',
    description: 'Annual Maintenance Contract',
    url: 'https://buy.stripe.com/demo_maintenance',
    status: 'active',
    expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    contact: { firstName: 'Sarah', lastName: 'Williams' },
  },
  {
    id: '3',
    amount: 85000,
    currency: 'USD',
    description: 'Emergency Repair — Deposit',
    url: 'https://buy.stripe.com/demo_repair',
    status: 'active',
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
  },
]

const DEMO_STATS: Stats = { total: 3, active: 2, paid: 1, totalRevenue: 4500 }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [stats, setStats] = useState<Stats>(DEMO_STATS)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ amount: '', currency: 'USD', description: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null)
  const [markingPaidId, setMarkingPaidId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  const load = async () => {
    setLoading(true)
    try {
      const [linksRes, statsRes] = await Promise.all([
        apiClient.get('/payment-links'),
        apiClient.get('/payment-links/stats'),
      ]) as any[]
      setLinks(linksRes?.links ?? [])
      if (statsRes?.total !== undefined) setStats(statsRes)
    } catch {
      setLinks(DEMO_LINKS)
      setStats(DEMO_STATS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const create = async () => {
    if (!form.amount) return
    setCreating(true)
    try {
      await apiClient.post('/payment-links', {
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description || undefined,
        expiresAt: form.expiresAt || undefined,
      })
      setShowCreate(false)
      setForm({ amount: '', currency: 'USD', description: '', expiresAt: '' })
      toast('Payment link created', 'success')
      void load()
    } catch {
      toast('Failed to create payment link', 'error')
    } finally {
      setCreating(false)
    }
  }

  const deactivate = async (id: string) => {
    setDeactivatingId(id)
    try {
      await apiClient.post(`/payment-links/${id}/deactivate`, {})
      toast('Payment link deactivated', 'success')
      void load()
    } catch {
      toast('Failed to deactivate link', 'error')
    } finally {
      setDeactivatingId(null)
    }
  }

  const markPaid = async (id: string) => {
    setMarkingPaidId(id)
    try {
      await apiClient.post(`/payment-links/${id}/mark-paid`, {})
      toast('Marked as paid', 'success')
      void load()
    } catch {
      toast('Failed to update link', 'error')
    } finally {
      setMarkingPaidId(null)
    }
  }

  const copyLink = (url: string, id: string) => {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = links.filter(l => filter === 'all' || l.status === filter)

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Payment Links</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Generate shareable payment links via Stripe</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Create Link
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Links', value: stats.total, icon: Link2, colorStyle: { color: 'hsl(var(--primary))' } },
          { label: 'Active', value: stats.active, icon: Clock, colorStyle: { color: '#34d399' } },
          { label: 'Paid', value: stats.paid, icon: CheckCircle, colorStyle: { color: 'hsl(var(--primary))' } },
          { label: 'Revenue Collected', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, colorStyle: { color: '#34d399' } },
        ].map((s, i) => (
          <div
            key={s.label}
            className="kv-anim rounded-xl border p-4"
            style={{ ...cardStyle, animationDelay: `${0.11 + i * 0.07}s` }}
          >
            <div className="flex items-center gap-2 mb-1">
              <s.icon className="h-4 w-4" style={s.colorStyle} />
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </div>
            <p className="text-2xl font-bold tabular" style={s.colorStyle}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div {...anim(5)} className="kv-anim flex gap-2 flex-wrap" style={{ animationDelay: '0.39s' }}>
        {['all', 'active', 'paid', 'expired', 'inactive'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
            style={filter === f
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
            }
          >
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      <div
        className="kv-anim rounded-xl overflow-hidden"
        style={{ ...cardStyle, animationDelay: '0.46s' }}
      >
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Link2 className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No payment links</p>
            <p className="text-sm text-muted-foreground mt-1">Create a link to start collecting payments instantly.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Description', 'Amount', 'Status', 'Expires', 'Contact', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(link => {
                  const meta = STATUS_META[link.status] ?? STATUS_META['inactive']!
                  return (
                    <tr key={link.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 font-medium text-foreground">{link.description || '—'}</td>
                      <td className="px-4 py-3 text-foreground/80 tabular">
                        ${(link.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2 })} {link.currency}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ color: meta.text, background: meta.bg }}
                        >
                          {link.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {link.contact ? `${link.contact.firstName} ${link.contact.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => copyLink(link.url, link.id)}
                            title="Copy link"
                            className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors"
                          >
                            {copiedId === link.id
                              ? <CheckCircle className="h-4 w-4" style={{ color: '#34d399' }} />
                              : <Copy className="h-4 w-4 text-muted-foreground" />
                            }
                          </button>
                          {link.status === 'active' && (
                            <>
                              <button
                                onClick={() => markPaid(link.id)}
                                disabled={markingPaidId === link.id}
                                title="Mark paid"
                                className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="h-4 w-4" style={{ color: '#38bdf8' }} />
                              </button>
                              <button
                                onClick={() => deactivate(link.id)}
                                disabled={deactivatingId === link.id}
                                title="Deactivate"
                                className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="h-4 w-4" style={{ color: '#f87171' }} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Create Payment Link</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Amount (USD) *</label>
                <input
                  type="number" min="0.01" step="0.01"
                  value={form.amount}
                  onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="0.00"
                />
                <p className="text-xs text-muted-foreground mt-1">Enter in dollars (e.g. 450.00 = $450)</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                <input
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="Payment for services…"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Expires At (optional)</label>
                <input
                  type="datetime-local"
                  value={form.expiresAt}
                  onChange={e => setForm(p => ({ ...p, expiresAt: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              {form.amount && (
                <div className="rounded-xl p-3 text-right" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <span className="text-xs text-muted-foreground">Link amount: </span>
                  <span className="font-bold text-foreground tabular">
                    ${parseFloat(form.amount || '0').toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={create}
                disabled={creating || !form.amount}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Creating…' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
