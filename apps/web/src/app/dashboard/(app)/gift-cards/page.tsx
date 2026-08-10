'use client'

import { useState, useEffect } from 'react'
import { Gift, Plus, Search, Ban, DollarSign, CreditCard, TrendingUp } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

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

const STATUS_META: Record<string, { text: string; bg: string }> = {
  active:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  redeemed: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  expired:  { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  voided:   { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
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
  const [voidingId, setVoidingId] = useState<string | null>(null)

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
      toast(`Redeemed! New balance: $${res.giftCard?.balance?.toFixed(2) ?? 0}`, 'success')
      setShowRedeem(false)
      setRedeemForm({ code: '', amount: '' })
      load()
    } catch (e: any) {
      toast(e.message ?? 'Redemption failed', 'error')
    }
  }

  const voidCard = async (id: string) => {
    setVoidingId(id)
    setCards(prev => prev.filter(c => c.id !== id))
    try {
      await apiClient.delete(`/gift-cards/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to void gift card', 'error')
      load()
    } finally { setVoidingId(null) }
  }

  const filtered = cards.filter(c =>
    c.code.toLowerCase().includes(search.toLowerCase()) ||
    (c.contact && `${c.contact.firstName} ${c.contact.lastName}`.toLowerCase().includes(search.toLowerCase()))
  )

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Gift Cards</h1>
          <p className="text-sm text-muted-foreground mt-1">Issue and manage gift cards and vouchers</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowRedeem(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all hover:text-foreground text-muted-foreground" style={{ border: '1px solid hsl(var(--border))' }}>
            <CreditCard className="h-4 w-4" />
            Redeem
          </button>
          <button onClick={() => setShowIssue(true)} className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Plus className="h-4 w-4" />
            Issue Gift Card
          </button>
        </div>
      </div>

      <div {...anim(1)} className="kv-anim grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Active Cards', value: stats.active, icon: Gift, color: '#60a5fa' },
          { label: 'Total Issued', value: `$${stats.totalIssued.toFixed(2)}`, icon: TrendingUp, color: '#a78bfa' },
          { label: 'Total Redeemed', value: `$${stats.totalRedeemed.toFixed(2)}`, icon: DollarSign, color: '#34d399' },
          { label: 'Outstanding Balance', value: `$${stats.totalBalance.toFixed(2)}`, icon: CreditCard, color: '#fb923c' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div {...anim(2)} className="kv-anim relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input className="w-full rounded-xl pl-9 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          style={inputStyle} placeholder="Search by code or customer name..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div {...anim(3)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No gift cards found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Code', 'Customer', 'Initial', 'Balance', 'Status', 'Expires', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((c, i) => {
                  const sm = STATUS_META[c.status] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                  return (
                    <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                      <td className="px-4 py-3 font-mono text-sm text-foreground">{c.code}</td>
                      <td className="px-4 py-3">
                        {c.contact ? (
                          <>
                            <p className="font-medium text-foreground">{c.contact.firstName} {c.contact.lastName}</p>
                            <p className="text-xs text-muted-foreground">{c.contact.email}</p>
                          </>
                        ) : <span className="text-muted-foreground">—</span>}
                      </td>
                      <td className="px-4 py-3 text-foreground">${c.initialAmount.toFixed(2)}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">${c.balance.toFixed(2)}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize" style={{ color: sm.text, background: sm.bg }}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{c.expiresAt ? new Date(c.expiresAt).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        {c.status === 'active' && (
                          <button onClick={() => voidCard(c.id)} disabled={voidingId === c.id} className="transition-colors hover:opacity-80" style={{ color: '#f87171' }}>
                            <Ban className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showIssue && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="font-bold text-lg text-foreground">Issue Gift Card</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Amount ($)</label>
              <input type="number" min="1" className={inputCls} style={inputStyle} placeholder="50.00" value={form.amount} onChange={e => setForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact ID (optional)</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Expires At (optional)</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.expiresAt} onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message</label>
              <input className={inputCls} style={inputStyle} placeholder="Happy Birthday!" value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowIssue(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={issue} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Issue</button>
            </div>
          </div>
        </div>
      )}

      {showRedeem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="font-bold text-lg text-foreground">Redeem Gift Card</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Gift Card Code</label>
              <input className={`${inputCls} font-mono`} style={inputStyle} placeholder="XXXX-XXXX-XXXX-XXXX" value={redeemForm.code} onChange={e => setRedeemForm(f => ({ ...f, code: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Amount to Redeem ($)</label>
              <input type="number" min="0.01" className={inputCls} style={inputStyle} placeholder="25.00" value={redeemForm.amount} onChange={e => setRedeemForm(f => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowRedeem(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={redeem} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Redeem</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
