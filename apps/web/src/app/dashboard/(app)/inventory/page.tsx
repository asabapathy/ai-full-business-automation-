'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Archive, Plus, Trash2, Edit2, AlertTriangle, Search, Package, DollarSign } from 'lucide-react'

interface InventoryItem {
  id: string
  name: string
  sku?: string
  category?: string
  description?: string
  quantity: number
  reorderPoint: number
  reorderQty: number
  unitCost?: string
  unitPrice?: string
  vendor?: string
  location?: string
  isActive: boolean
}

interface Stats { totalItems: number; lowStock: number; outOfStock: number; totalValue: number }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function InventoryPage() {
  const [items, setItems] = useState<InventoryItem[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<InventoryItem | null>(null)
  const [adjustTarget, setAdjustTarget] = useState<InventoryItem | null>(null)
  const [adjustQty, setAdjustQty] = useState('')
  const [adjustReason, setAdjustReason] = useState('')
  const [form, setForm] = useState({ name: '', sku: '', category: '', quantity: '0', reorderPoint: '5', unitCost: '', unitPrice: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [search, lowStockOnly])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (lowStockOnly) params.set('lowStock', 'true')
      const [iRes, sRes] = await Promise.all([
        apiClient.get<{ items: InventoryItem[] }>(`/inventory${params.size ? '?' + params : ''}`),
        apiClient.get<Stats>('/inventory/stats'),
      ])
      setItems(iRes.items)
      setStats(sRes)
    } catch {
      setItems([])
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        sku: form.sku || undefined,
        category: form.category || undefined,
        quantity: parseInt(form.quantity) || 0,
        reorderPoint: parseInt(form.reorderPoint) || 5,
        unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
        unitPrice: form.unitPrice ? parseFloat(form.unitPrice) : undefined,
      }
      if (editTarget) {
        await apiClient.put(`/inventory/${editTarget.id}`, payload)
      } else {
        await apiClient.post('/inventory', payload)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ name: '', sku: '', category: '', quantity: '0', reorderPoint: '5', unitCost: '', unitPrice: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save item', 'error')
    } finally { setSaving(false) }
  }

  async function adjust() {
    if (!adjustTarget || !adjustQty) return
    setSaving(true)
    try {
      await apiClient.post(`/inventory/${adjustTarget.id}/adjust`, {
        adjustment: parseInt(adjustQty),
        reason: adjustReason || undefined,
      })
      setAdjustTarget(null)
      setAdjustQty('')
      setAdjustReason('')
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to adjust quantity', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setItems(prev => prev.filter(i => i.id !== id))
    try {
      await apiClient.delete(`/inventory/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to archive item', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function edit(item: InventoryItem) {
    setEditTarget(item)
    setForm({
      name: item.name,
      sku: item.sku ?? '',
      category: item.category ?? '',
      quantity: String(item.quantity),
      reorderPoint: String(item.reorderPoint),
      unitCost: item.unitCost ?? '',
      unitPrice: item.unitPrice ?? '',
    })
    setShowCreate(true)
  }

  function stockColor(item: InventoryItem): string {
    if (item.quantity === 0) return '#f87171'
    if (item.quantity <= item.reorderPoint) return '#fbbf24'
    return '#34d399'
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Track stock levels and product catalog</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', sku: '', category: '', quantity: '0', reorderPoint: '5', unitCost: '', unitPrice: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: stats.totalItems, icon: Package, color: '#a78bfa' },
            { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: '#fbbf24' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: '#f87171' },
            { label: 'Total Value', value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-9 pr-4 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 py-2.5"
            style={inputStyle} />
        </div>
        <button onClick={() => setLowStockOnly(!lowStockOnly)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all"
          style={lowStockOnly
            ? { color: '#fbbf24', background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }
            : { color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
          }>
          <AlertTriangle className="h-4 w-4" /> Low Stock
        </button>
      </div>

      <div {...anim(3)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No items yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Name', 'SKU', 'Category', 'Stock', 'Cost', 'Price', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((item, i) => (
                  <tr key={item.id} style={{ borderBottom: i < items.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-4 py-3 font-medium text-foreground">{item.name}</td>
                    <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku ?? '—'}</td>
                    <td className="px-4 py-3">
                      {item.category ? (
                        <span className="rounded px-2 py-0.5 text-xs text-muted-foreground" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid hsl(var(--border))' }}>{item.category}</span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold" style={{ color: stockColor(item) }}>{item.quantity}</span>
                      <span className="text-xs text-muted-foreground ml-1">/ {item.reorderPoint} min</span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unitCost ? `$${Number(item.unitCost).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{item.unitPrice ? `$${Number(item.unitPrice).toFixed(2)}` : '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <button onClick={() => setAdjustTarget(item)} className="px-2 py-1 rounded text-xs font-medium transition-colors hover:opacity-80" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>±Qty</button>
                        <button onClick={() => edit(item)} className="p-1.5 rounded transition-colors hover:text-foreground text-muted-foreground">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => remove(item.id)} disabled={deletingId === item.id}
                          className="p-1.5 rounded transition-colors" style={{ color: '#f87171' }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Item' : 'Add Inventory Item'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name <span style={{ color: '#f87171' }}>*</span></label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Product name"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">SKU</label>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="Electronics, etc."
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Quantity</label>
                <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  type="number" min="0"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reorder Point</label>
                <input value={form.reorderPoint} onChange={e => setForm({ ...form, reorderPoint: e.target.value })}
                  type="number" min="0"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Unit Cost ($)</label>
                <input value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Unit Price ($)</label>
                <input value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Adjust Quantity</h2>
            <p className="text-sm text-muted-foreground">Current: <strong className="text-foreground">{adjustTarget.quantity}</strong> units of <strong className="text-foreground">{adjustTarget.name}</strong></p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Adjustment (negative to reduce)</label>
              <input value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                type="number" placeholder="+10 or -5"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Reason (optional)</label>
              <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder="Received shipment, damaged, etc."
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdjustTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={adjust} disabled={saving || !adjustQty}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
