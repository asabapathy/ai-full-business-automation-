'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Archive this item?')) return
    await apiClient.delete(`/inventory/${id}`)
    load()
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground text-sm mt-1">Track stock levels and product catalog</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', sku: '', category: '', quantity: '0', reorderPoint: '5', unitCost: '', unitPrice: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Item
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Items', value: stats.totalItems, icon: Package, color: 'text-purple-500' },
            { label: 'Low Stock', value: stats.lowStock, icon: AlertTriangle, color: 'text-yellow-500' },
            { label: 'Out of Stock', value: stats.outOfStock, icon: AlertTriangle, color: 'text-red-500' },
            { label: 'Total Value', value: `$${stats.totalValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-green-500' },
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

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or SKU…"
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
        <button onClick={() => setLowStockOnly(!lowStockOnly)}
          className={`flex items-center gap-2 px-4 py-2.5 border rounded-xl text-sm font-medium transition-colors ${lowStockOnly ? 'bg-yellow-100 border-yellow-300 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' : 'hover:bg-muted'}`}>
          <AlertTriangle className="h-4 w-4" /> Low Stock
        </button>
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : items.length === 0 ? (
          <div className="p-12 text-center">
            <Archive className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No items yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Name', 'SKU', 'Category', 'Stock', 'Cost', 'Price', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map(item => (
                <tr key={item.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{item.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{item.sku ?? '—'}</td>
                  <td className="px-4 py-3">
                    {item.category ? <span className="bg-muted px-2 py-0.5 rounded text-xs">{item.category}</span> : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`font-semibold ${item.quantity === 0 ? 'text-red-500' : item.quantity <= item.reorderPoint ? 'text-yellow-500' : 'text-green-500'}`}>
                      {item.quantity}
                    </span>
                    <span className="text-xs text-muted-foreground ml-1">/ {item.reorderPoint} min</span>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{item.unitCost ? `$${Number(item.unitCost).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{item.unitPrice ? `$${Number(item.unitPrice).toFixed(2)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setAdjustTarget(item)} className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">±Qty</button>
                      <button onClick={() => edit(item)} className="p-1.5 rounded hover:bg-muted">
                        <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      <button onClick={() => remove(item.id)} className="p-1.5 rounded hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
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
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Item' : 'Add Inventory Item'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Product name"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">SKU</label>
                <input value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })}
                  placeholder="SKU-001"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  placeholder="Electronics, etc."
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Quantity</label>
                <input value={form.quantity} onChange={e => setForm({ ...form, quantity: e.target.value })}
                  type="number" min="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Reorder Point</label>
                <input value={form.reorderPoint} onChange={e => setForm({ ...form, reorderPoint: e.target.value })}
                  type="number" min="0"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Unit Cost ($)</label>
                <input value={form.unitCost} onChange={e => setForm({ ...form, unitCost: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Unit Price ($)</label>
                <input value={form.unitPrice} onChange={e => setForm({ ...form, unitPrice: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}

      {adjustTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Adjust Quantity</h2>
            <p className="text-sm text-muted-foreground">Current: <strong>{adjustTarget.quantity}</strong> units of <strong>{adjustTarget.name}</strong></p>
            <div>
              <label className="text-sm font-medium block mb-1">Adjustment (use negative to reduce)</label>
              <input value={adjustQty} onChange={e => setAdjustQty(e.target.value)}
                type="number" placeholder="+10 or -5"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Reason (optional)</label>
              <input value={adjustReason} onChange={e => setAdjustReason(e.target.value)}
                placeholder="Received shipment, damaged, etc."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAdjustTarget(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={adjust} disabled={saving || !adjustQty}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Updating…' : 'Apply'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
