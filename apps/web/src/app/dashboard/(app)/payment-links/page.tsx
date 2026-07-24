'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Link2, Plus, Copy, XCircle, CheckCircle, DollarSign, Clock, TrendingUp } from 'lucide-react'

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

export default function PaymentLinksPage() {
  const [links, setLinks] = useState<PaymentLink[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ amount: '', currency: 'USD', description: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [filter, setFilter] = useState('all')

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [linksRes, statsRes] = await Promise.all([
        apiClient.get<{ links: PaymentLink[] }>('/payment-links'),
        apiClient.get<Stats>('/payment-links/stats'),
      ])
      setLinks(linksRes.links)
      setStats(statsRes)
    } finally { setLoading(false) }
  }

  async function create() {
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
      load()
    } catch (e: any) { alert(e.message) } finally { setCreating(false) }
  }

  async function deactivate(id: string) {
    if (!confirm('Deactivate this payment link?')) return
    await apiClient.post(`/payment-links/${id}/deactivate`, {})
    load()
  }

  async function markPaid(id: string) {
    if (!confirm('Mark this link as paid?')) return
    await apiClient.post(`/payment-links/${id}/mark-paid`, {})
    load()
  }

  function copyLink(url: string, id: string) {
    navigator.clipboard.writeText(url)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const filtered = links.filter(l => filter === 'all' || l.status === filter)

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    paid: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payment Links</h1>
          <p className="text-muted-foreground text-sm mt-1">Generate shareable payment links via Stripe</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Create Link
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Links', value: stats.total, icon: Link2, color: 'text-purple-500' },
            { label: 'Active', value: stats.active, icon: Clock, color: 'text-green-500' },
            { label: 'Paid', value: stats.paid, icon: CheckCircle, color: 'text-blue-500' },
            { label: 'Revenue', value: `$${stats.totalRevenue.toLocaleString()}`, icon: DollarSign, color: 'text-emerald-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        {['all', 'active', 'paid', 'expired', 'inactive'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${filter === f ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center">
            <Link2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No payment links yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Description', 'Amount', 'Status', 'Expires', 'Contact', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(link => (
                <tr key={link.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{link.description || '—'}</td>
                  <td className="px-4 py-3">${(link.amount / 100).toFixed(2)} {link.currency}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[link.status] ?? ''}`}>{link.status}</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {link.expiresAt ? new Date(link.expiresAt).toLocaleDateString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {link.contact ? `${link.contact.firstName} ${link.contact.lastName}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <button onClick={() => copyLink(link.url, link.id)} title="Copy link"
                        className="p-1.5 rounded hover:bg-muted transition-colors">
                        {copiedId === link.id ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
                      </button>
                      {link.status === 'active' && (
                        <>
                          <button onClick={() => markPaid(link.id)} title="Mark paid"
                            className="p-1.5 rounded hover:bg-muted transition-colors">
                            <CheckCircle className="h-4 w-4 text-blue-500" />
                          </button>
                          <button onClick={() => deactivate(link.id)} title="Deactivate"
                            className="p-1.5 rounded hover:bg-muted transition-colors">
                            <XCircle className="h-4 w-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Create Payment Link</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Amount (USD)</label>
              <input value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })}
                type="number" min="0.01" step="0.01" placeholder="0.00"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="Payment for services…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Expires At (optional)</label>
              <input value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                type="datetime-local"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={create} disabled={creating || !form.amount}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating…' : 'Create Link'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
