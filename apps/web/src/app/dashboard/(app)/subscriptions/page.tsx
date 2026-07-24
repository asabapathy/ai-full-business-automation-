'use client'

import { useState, useEffect } from 'react'
import { CreditCard, Plus, TrendingUp, Users, DollarSign, Trash2 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

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

const statusColor: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  cancelled: 'bg-red-500/20 text-red-400',
  paused: 'bg-yellow-500/20 text-yellow-400',
}

export default function SubscriptionsPage() {
  const [subs, setSubs] = useState<Subscription[]>([])
  const [revenue, setRevenue] = useState<Revenue | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ contactId: '', name: '', amount: '', interval: 'monthly', description: '' })

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [subsRes, revRes] = await Promise.all([
      fetch(`${API_BASE}/customer-subscriptions`, { headers }),
      fetch(`${API_BASE}/customer-subscriptions/revenue`, { headers }),
    ])
    const subsData = await subsRes.json() as { subscriptions: Subscription[] }
    const revData = await revRes.json() as Revenue
    setSubs(subsData.subscriptions ?? [])
    setRevenue(revData)
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.contactId || !form.name || !form.amount) return
    await fetch(`${API_BASE}/customer-subscriptions`, {
      method: 'POST', headers,
      body: JSON.stringify({ ...form, amount: Number(form.amount) }),
    })
    setForm({ contactId: '', name: '', amount: '', interval: 'monthly', description: '' })
    setShowCreate(false)
    void load()
  }

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this subscription?')) return
    await fetch(`${API_BASE}/customer-subscriptions/${id}?immediate=true`, { method: 'DELETE', headers })
    void load()
  }

  const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><CreditCard className="w-6 h-6 text-indigo-400" /> Recurring Plans</h1>
          <p className="text-gray-400 text-sm mt-1">Manage customer subscription plans and recurring revenue</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> New Plan
        </button>
      </div>

      {/* MRR cards */}
      {revenue && (
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><TrendingUp className="w-4 h-4" /> MRR</div>
            <div className="text-2xl font-bold text-white">{fmt(revenue.mrr)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><DollarSign className="w-4 h-4" /> ARR</div>
            <div className="text-2xl font-bold text-white">{fmt(revenue.arr)}</div>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <div className="flex items-center gap-2 text-gray-400 text-sm mb-1"><Users className="w-4 h-4" /> Active</div>
            <div className="text-2xl font-bold text-white">{revenue.activeCount}</div>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading...</div>
      ) : subs.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No subscriptions yet. Create your first recurring plan.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {subs.map(sub => (
            <div key={sub.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{sub.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[sub.status] ?? 'bg-gray-500/20 text-gray-400'}`}>{sub.status}</span>
                  {sub.cancelAtPeriodEnd && <span className="text-xs text-yellow-400">Cancels at period end</span>}
                </div>
                <p className="text-sm text-gray-400">{sub.contact.firstName} {sub.contact.lastName} · {sub.contact.email}</p>
                <p className="text-sm text-indigo-400 font-medium mt-1">{fmt(Number(sub.amount))} / {sub.interval}</p>
                {sub.currentPeriodEnd && (
                  <p className="text-xs text-gray-500 mt-1">Renews {new Date(sub.currentPeriodEnd).toLocaleDateString()}</p>
                )}
              </div>
              <button onClick={() => handleCancel(sub.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-white mb-4">New Recurring Plan</h2>
            <div className="space-y-3">
              <input value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))} placeholder="Contact ID (UUID)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Plan name (e.g. Monthly Maintenance)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.amount} onChange={e => setForm(p => ({ ...p, amount: e.target.value }))} type="number" placeholder="Amount (USD)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <select value={form.interval} onChange={e => setForm(p => ({ ...p, interval: e.target.value }))} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none">
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Yearly</option>
              </select>
              <input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Description (optional)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Create Plan</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
