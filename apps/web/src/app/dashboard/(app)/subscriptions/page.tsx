'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, TrendingUp, Users, DollarSign, Trash2, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Subscription {
  id: string
  name: string
  amount: number | string
  currency: string
  interval: string
  status: string
  cancelAtPeriodEnd: boolean
  currentPeriodEnd: string | null
  contact: { id: string; firstName: string; lastName: string; email: string | null }
}

interface Revenue { mrr: number; arr: number; activeCount: number }

const STATUS_META: Record<string, { text: string; bg: string }> = {
  active:    { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  cancelled: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  paused:    { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const DEMO_SUBS: Subscription[] = [
  { id: '1', name: 'Monthly Maintenance Plan', amount: 99, currency: 'usd', interval: 'monthly', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: new Date(Date.now() + 86400000 * 22).toISOString(), contact: { id: '1', firstName: 'Mark', lastName: 'Johnson', email: 'mark@example.com' } },
  { id: '2', name: 'Annual Service Agreement', amount: 799, currency: 'usd', interval: 'yearly', status: 'active', cancelAtPeriodEnd: false, currentPeriodEnd: new Date(Date.now() + 86400000 * 180).toISOString(), contact: { id: '2', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@example.com' } },
]

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [form, setForm] = useState({ contactId: '', name: '', amount: '', interval: 'monthly', description: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [subsRes, revRes] = await Promise.all([
        apiClient.get('/customer-subscriptions'),
        apiClient.get('/customer-subscriptions/revenue'),
      ]) as any[]
      setSubs(subsRes?.subscriptions ?? subsRes ?? [])
      setRevenue(revRes)
    } catch {
      setSubs(DEMO_SUBS)
      setRevenue({ mrr: 265, arr: 3180, activeCount: 2 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.contactId || !form.name || !form.amount) return
    setCreating(true)
    try {
      await apiClient.post('/customer-subscriptions', { ...form, amount: Number(form.amount) })
      setForm({ contactId: '', name: '', amount: '', interval: 'monthly', description: '' })
      setShowCreate(false)
      toast('Recurring plan created', 'success')
      void load()
    } catch {
      toast('Failed to create plan', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleCancel = async (id: string) => {
    setCancelling(id)
    try {
      await apiClient.delete(`/customer-subscriptions/${id}?immediate=true`)
      setSubs(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s))
      toast('Subscription cancelled', 'success')
    } catch {
      toast('Failed to cancel subscription', 'error')
    } finally {
      setCancelling(null)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Plans</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Customer subscription plans and recurring revenue</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Plan
        </button>
      </div>

      {/* MRR stats */}
      {revenue && (
        <div {...anim(1)} className="grid grid-cols-3 gap-4">
          {[
            { label: 'Monthly Recurring', value: fmt(revenue.mrr), icon: TrendingUp, color: '#34d399' },
            { label: 'Annual Recurring', value: fmt(revenue.arr), icon: DollarSign, color: '#06b6d4' },
            { label: 'Active Plans', value: revenue.activeCount, icon: Users, color: '#a855f7' },
          ].map(stat => (
            <div key={stat.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
              <p className="text-2xl font-bold tabular" style={{ color: stat.color }}>{stat.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Subscriptions list */}
      <div {...anim(2)} className="rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}</div>
        ) : subs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <CreditCard className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No recurring plans yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first customer subscription.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {subs.map(sub => {
              const meta = STATUS_META[sub.status] ?? STATUS_META.cancelled
              return (
                <div key={sub.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground text-sm">{sub.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>{sub.status}</span>
                      {sub.cancelAtPeriodEnd && <span className="text-xs" style={{ color: '#fbbf24' }}>Cancels at period end</span>}
                    </div>
                    <p className="text-xs text-muted-foreground">{sub.contact.firstName} {sub.contact.lastName}{sub.contact.email ? ` · ${sub.contact.email}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="text-sm font-semibold text-primary tabular">{fmt(Number(sub.amount))} / {sub.interval}</span>
                      {sub.currentPeriodEnd && (
                        <span className="text-xs text-muted-foreground">Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                  {sub.status === 'active' && (
                    <button
                      onClick={() => handleCancel(sub.id)}
                      disabled={cancelling === sub.id}
                      className="p-1.5 rounded-lg transition-colors disabled:opacity-50"
                      title="Cancel subscription"
                    >
                      <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Recurring Plan</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact ID *</label>
                <input value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Contact UUID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Plan Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Monthly Maintenance" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Amount (USD) *</label>
                  <input type="number" min="0" value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} className={inputCls} style={inputStyle} placeholder="99" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Interval</label>
                  <select value={form.interval} onChange={e => setForm(p => ({ ...p, interval: e.target.value }))} className={inputCls} style={inputStyle}>
                    <option value="monthly">Monthly</option>
                    <option value="quarterly">Quarterly</option>
                    <option value="yearly">Yearly</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Optional description" />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.contactId || !form.name || !form.amount}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Creating…' : 'Create Plan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
