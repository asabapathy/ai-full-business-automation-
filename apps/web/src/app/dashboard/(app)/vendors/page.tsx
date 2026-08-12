'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Truck, Plus, Pencil, Trash2, X, Search, Phone, Mail, Star } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Vendor {
  id: string
  name: string
  category: string
  contactName?: string
  phone?: string
  email?: string
  totalSpend: number
  openOrders: number
  rating: number
  notes?: string
}

const CATEGORIES = ['Materials', 'Equipment', 'Fuel', 'Services', 'Other'] as const

const CATEGORY_COLORS: Record<string, string> = {
  Materials: '#06b6d4',
  Equipment: '#a78bfa',
  Fuel: '#fbbf24',
  Services: '#34d399',
  Other: '#94a3b8',
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const fmtMoney = (n: number) => `$${n.toLocaleString('en-US', { maximumFractionDigits: 0 })}`

const DEMO_VENDORS: Vendor[] = [
  { id: 'v1', name: 'Home Depot', category: 'Materials', contactName: 'Pro Desk', phone: '(555) 210-4488', email: 'prodesk@homedepot.com', totalSpend: 8420, openOrders: 1, rating: 4.5, notes: 'Pro Xtra account — 5% back on paint and lumber.' },
  { id: 'v2', name: 'Ferguson Plumbing Supply', category: 'Materials', contactName: 'Dana Wells', phone: '(555) 318-7702', email: 'dana.wells@ferguson.com', totalSpend: 5960, openOrders: 2, rating: 4.8, notes: 'Net-30 terms. Will-call pickup at the 5th St branch.' },
  { id: 'v3', name: 'United Rentals', category: 'Equipment', contactName: 'Marcus Lee', phone: '(555) 442-9013', email: 'mlee@unitedrentals.com', totalSpend: 3150, openOrders: 1, rating: 4.2, notes: 'Weekly rate on the mini excavator beats daily after 3 days.' },
  { id: 'v4', name: 'Shell Fleet', category: 'Fuel', contactName: 'Fleet Support', phone: '(555) 800-3121', email: 'fleet@shell.com', totalSpend: 2740, openOrders: 0, rating: 4.0 },
  { id: 'v5', name: 'ADP Payroll', category: 'Services', contactName: 'Priya Nair', phone: '(555) 676-2280', email: 'priya.nair@adp.com', totalSpend: 2280, openOrders: 0, rating: 4.6, notes: 'Payroll runs Thursdays. Renewal comes up in January.' },
  { id: 'v6', name: 'Grainger', category: 'Materials', contactName: 'Tom Alvarez', phone: '(555) 903-5540', email: 'tom.alvarez@grainger.com', totalSpend: 1890, openOrders: 1, rating: 4.3 },
]

const emptyForm = { name: '', category: 'Materials', contactName: '', phone: '', email: '', notes: '', rating: 5 }

function StarRow({ rating, size = 'h-3.5 w-3.5' }: { rating: number; size?: string }) {
  const filled = Math.round(rating) // half rounding: 4.5 → 5, 4.4 → 4
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map(n => (
        <Star
          key={n}
          className={size}
          style={n <= filled
            ? { color: '#fbbf24', fill: '#fbbf24' }
            : { color: 'hsl(var(--muted-foreground))', opacity: 0.35 }}
        />
      ))}
    </div>
  )
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>(DEMO_VENDORS)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<string>('All')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    apiClient.get('/vendors')
      .then((res: any) => { const list = res?.vendors ?? res; if (Array.isArray(list) && list.length) setVendors(list) })
      .catch(() => {})
  }, [])

  const filtered = vendors.filter(v =>
    (categoryFilter === 'All' || v.category === categoryFilter) &&
    v.name.toLowerCase().includes(search.toLowerCase())
  )

  const totalSpend = vendors.reduce((s, v) => s + v.totalSpend, 0)
  const openOrders = vendors.reduce((s, v) => s + v.openOrders, 0)

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (v: Vendor) => {
    setEditingId(v.id)
    setForm({
      name: v.name,
      category: v.category,
      contactName: v.contactName ?? '',
      phone: v.phone ?? '',
      email: v.email ?? '',
      notes: v.notes ?? '',
      rating: v.rating,
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast('Enter a vendor name', 'error')
      return
    }
    const payload = {
      name: form.name.trim(),
      category: form.category,
      contactName: form.contactName.trim() || undefined,
      phone: form.phone.trim() || undefined,
      email: form.email.trim() || undefined,
      notes: form.notes.trim() || undefined,
      rating: form.rating,
    }
    if (editingId) {
      setVendors(prev => prev.map(v => v.id === editingId ? { ...v, ...payload } : v))
      try {
        await apiClient.put(`/vendors/${editingId}`, payload)
      } catch {
        // Demo mode: keep local state
      }
      toast('Vendor updated', 'success')
    } else {
      const vendor: Vendor = { id: `v${Date.now()}`, ...payload, totalSpend: 0, openOrders: 0 }
      setVendors(prev => [vendor, ...prev])
      try {
        await apiClient.post('/vendors', vendor)
      } catch {
        // Demo mode: keep local state
      }
      toast('Vendor added', 'success')
    }
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = async (v: Vendor) => {
    setVendors(prev => prev.filter(x => x.id !== v.id))
    try {
      await apiClient.delete(`/vendors/${v.id}`)
    } catch {
      // Demo mode: keep local state
    }
    toast('Vendor deleted', 'success')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Suppliers, spend, and open orders in one place</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Add Vendor
        </button>
      </div>

      {/* Stats */}
      <div {...anim(1)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total spend YTD</p>
          <p className="text-2xl font-bold tabular mt-1" style={{ color: '#06b6d4' }}>{fmtMoney(totalSpend)}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Open orders</p>
          <p className="text-2xl font-bold tabular mt-1" style={{ color: '#fbbf24' }}>{openOrders}</p>
        </div>
        <div className="rounded-xl p-4" style={cardStyle}>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Vendors</p>
          <p className="text-2xl font-bold tabular mt-1 text-muted-foreground">{vendors.length}</p>
        </div>
      </div>

      {/* Filters */}
      <div {...anim(2)} className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {['All', ...CATEGORIES].map(cat => {
            const active = categoryFilter === cat
            const color = CATEGORY_COLORS[cat] ?? '#06b6d4'
            return (
              <button
                key={cat}
                onClick={() => setCategoryFilter(cat)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={active
                  ? { background: `${color}1f`, color, border: `1px solid ${color}66` }
                  : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                }
              >
                {cat}
              </button>
            )
          })}
        </div>
        <div className="relative max-w-xs flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={inputCls + ' pl-9'}
            style={inputStyle}
            placeholder="Search vendors…"
          />
        </div>
      </div>

      {/* Vendor cards */}
      {filtered.length === 0 ? (
        <div {...anim(3)} className="rounded-xl px-5 py-12 text-center" style={cardStyle}>
          <Truck className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No vendors match your filters</p>
        </div>
      ) : (
        <div {...anim(3)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(v => {
            const color = CATEGORY_COLORS[v.category] ?? CATEGORY_COLORS.Other
            return (
              <div key={v.id} className="group rounded-xl p-5 flex flex-col" style={cardStyle}>
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground text-sm truncate">{v.name}</p>
                    <span
                      className="inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: `${color}1f`, color }}
                    >
                      {v.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => openEdit(v)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                      title="Edit vendor"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(v)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                      title="Delete vendor"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                </div>

                <div className="space-y-1 mb-3">
                  {v.contactName && (
                    <p className="text-xs text-muted-foreground truncate">{v.contactName}</p>
                  )}
                  {v.phone && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Phone className="h-3 w-3 shrink-0 opacity-60" />{v.phone}
                    </p>
                  )}
                  {v.email && (
                    <p className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                      <Mail className="h-3 w-3 shrink-0 opacity-60" />{v.email}
                    </p>
                  )}
                </div>

                <div className="mt-auto space-y-2 pt-2">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-bold tabular" style={{ color: '#34d399' }}>
                      {fmtMoney(v.totalSpend)} <span className="font-medium text-muted-foreground text-xs">YTD</span>
                    </p>
                    {v.openOrders > 0 && (
                      <span
                        className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                        style={{ background: 'rgba(251,191,36,0.12)', color: '#fbbf24' }}
                      >
                        {v.openOrders} open {v.openOrders === 1 ? 'order' : 'orders'}
                      </span>
                    )}
                  </div>
                  <StarRow rating={v.rating} />
                  <Link
                    href="/dashboard/job-costing"
                    className="block text-xs text-muted-foreground hover:text-foreground transition-colors pt-1"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                  >
                    View purchase orders →
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Vendor' : 'Add Vendor'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. Home Depot"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Category</label>
              <div className="flex flex-wrap items-center gap-2">
                {CATEGORIES.map(cat => {
                  const active = form.category === cat
                  const color = CATEGORY_COLORS[cat]
                  return (
                    <button
                      key={cat}
                      onClick={() => setForm(f => ({ ...f, category: cat }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={active
                        ? { background: `${color}1f`, color, border: `1px solid ${color}66` }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                      }
                    >
                      {cat}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact Name</label>
              <input
                value={form.contactName}
                onChange={e => setForm(f => ({ ...f, contactName: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. Dana Wells"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phone</label>
                <input
                  value={form.phone}
                  onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="(555) 000-0000"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
                <input
                  type="email"
                  value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="orders@vendor.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Notes</label>
              <textarea
                value={form.notes}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className={inputCls + ' resize-none'}
                style={inputStyle}
                rows={3}
                placeholder="Account terms, pickup locations, discounts…"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Rating</label>
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(n => (
                  <button key={n} onClick={() => setForm(f => ({ ...f, rating: n }))} className="p-0.5" title={`${n} star${n > 1 ? 's' : ''}`}>
                    <Star
                      className="h-5 w-5 transition-colors"
                      style={n <= form.rating
                        ? { color: '#fbbf24', fill: '#fbbf24' }
                        : { color: 'hsl(var(--muted-foreground))', opacity: 0.35 }}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
              >
                {editingId ? 'Save Changes' : 'Save Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
