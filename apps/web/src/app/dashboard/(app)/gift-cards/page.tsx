'use client'

import { useState, useEffect } from 'react'
import { Gift, Plus, Search, Ban, DollarSign, CreditCard, TrendingUp } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface GiftCard {
  id: string
  code: string
  initialAmount: number
  balance: number
  currency: string
  status: string
  contactId?: string
  contact?: { firstName: string; lastName: string; email: string }
  expiresAt?: string
  createdAt: string
}

interface Stats {
  total: number
  active: number
  totalIssued: number
  totalRedeemed: number
  totalBalance: number
}

export default function GiftCardsPage() {
  const [cards, setCards] = useState<GiftCard[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, totalIssued: 0, totalRedeemed: 0, totalBalance: 0 })
  const [loading, setLoading] = useState(true)
  const [showIssue, setShowIssue] = useState(false)
  const [showRedeem, setShowRedeem] = useState(false)
  const [search, setSearch] = useState('')
  const [form, setForm] = useState({ contactId: '', amount: '', currency: 'USD', expiresAt: '', message: '' })
  const [redeemForm, setRedeemForm] = useState({ code: '', amount: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [cardRes, statRes] = await Promise.all([
        apiClient.get('/gift-cards') as any,
        apiClient.get('/gift-cards/stats') as any,
      ])
      setCards(cardRes?.cards ?? [])
      setStats(statRes ?? stats)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const issue = async () => {
    if (!form.amount) return
    try {
      await apiClient.post('/gift-cards', { ...form, amount: parseFloat(form.amount) })
      setShowIssue(false)
      setForm({ contactId: '', amount: '', currency: 'USD', expiresAt: '', message: '' })
      load()
    } catch {}
  }

  const redeem = async () => {
    if (!redeemForm.code || !redeemForm.amount) return
    try {
      const res = await apiClient.post('/gift-cards/redeem', { code: redeemForm.code, amount: parseFloat(redeemForm.amount) }) as any
      alert(`Redeemed! New balance: $${res.giftCard?.balance?.toFixed(2) ?? 0}`)
      setShowRedeem(false)
      setRedeemForm({ code: '', amount: '' })
      load()
    } catch (e: any) {
      alert(e.message ?? 'Redemption failed')
    }
  }

  const voidCard = async (id: string) => {
    if (!confirm('Void this gift card?')) return
    try {
      await apiClient.delete(`/gift-cards/${id}`)
      load()
    } catch {}
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    redeemed: 'bg-gray-100 text-gray-500',
    expired: 'bg-red-100 text-red-600',
    voided: 'bg-red-100 text-red-600',
  }

  const filtered = cards.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact && `${c.contact.firstName} ${c.contact.lastName}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gift Cards</h1>
          <p className="text-sm text-gray-500 mt-1">Issue and manage gift cards and vouchers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRedeem(true)} className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100">
            <CreditCard className="h-4 w-4" />
            Redeem
          </button>
          <button onClick={() => setShowIssue(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Issue Gift Card
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Cards', value: stats.active, icon: Gift, color: 'text-blue-600' },
          { label: 'Total Issued', value: `$${stats.totalIssued.toFixed(2)}`, icon: TrendingUp, color: 'text-purple-600' },
          { label: 'Total Redeemed', value: `$${stats.totalRedeemed.toFixed(2)}`, icon: DollarSign, color: 'text-green-600' },
          { label: 'Outstanding Balance', value: `$${stats.totalBalance.toFixed(2)}`, icon: CreditCard, color: 'text-orange-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <input className="w-full rounded-lg border border-gray-200 pl-9 pr-4 py-2 text-sm" placeholder="Search by code or customer name..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No gift cards found</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Code</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Initial</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Balance</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expires</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-sm text-gray-900">{c.code}</td>
                  <td className="px-4 py-3">
                    {c.contact ? (
                      <>
                        <p className="font-medium text-gray-900">{c.contact.firstName} {c.contact.lastName}</p>
                        <p className="text-xs text-gray-500">{c.contact.email}</p>
                      </>
                    ) : <span className="text-gray-400">—</span>}
                  </td>
                  <td className="px-4 py-3 text-gray-900">${c.initialAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 font-semibold text-gray-900">${c.balance.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[c.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {c.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    {c.status === 'active' && (
                      <button onClick={() => voidCard(c.id)} className="text-red-400 hover:text-red-600">
                        <Ban className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Issue Modal */}
      {showIssue && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Issue Gift Card</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount ($)</label>
              <input type="number" min="1" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="50.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID (optional)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Expires At (optional)</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Message</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Happy Birthday!" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowIssue(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={issue} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Issue</button>
            </div>
          </div>
        </div>
      )}

      {/* Redeem Modal */}
      {showRedeem && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Redeem Gift Card</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Gift Card Code</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono" placeholder="XXXX-XXXX-XXXX-XXXX" value={redeemForm.code} onChange={e => setRedeemForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Amount to Redeem ($)</label>
              <input type="number" min="0.01" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="25.00" value={redeemForm.amount} onChange={e => setRedeemForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowRedeem(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={redeem} className="px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">Redeem</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
