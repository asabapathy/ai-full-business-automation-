'use client'

import { useState, useEffect } from 'react'
import { Package, Plus, Pencil, Trash2, X, Search } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface CatalogItem {
  id: string
  name: string
  description?: string
  price: number
  unit: 'flat' | 'hour' | 'unit'
  category?: string
  active: boolean
}

const UNITS: { key: CatalogItem['unit']; label: string }[] = [
  { key: 'flat', label: 'Flat' },
  { key: 'hour', label: 'Per hour' },
  { key: 'unit', label: 'Per unit' },
]

const UNIT_SUFFIX: Record<CatalogItem['unit'], string> = { flat: '', hour: '/hr', unit: '/unit' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const fmtPrice = (n: number) =>
  `$${n.toLocaleString('en-US', { minimumFractionDigits: n % 1 === 0 ? 0 : 2, maximumFractionDigits: 2 })}`

const DEMO_ITEMS: CatalogItem[] = [
  { id: 's1', name: 'HVAC Tune-up', description: 'Full system inspection, filter change, coil cleaning and performance check.', price: 189, unit: 'flat', category: 'HVAC', active: true },
  { id: 's2', name: 'Drain Cleaning', description: 'Clear clogged drains with professional-grade auger and camera verification.', price: 149, unit: 'flat', category: 'Plumbing', active: true },
  { id: 's3', name: 'Panel Upgrade', description: 'Upgrade electrical panel to 200A service, permits and inspection included.', price: 1850, unit: 'flat', category: 'Electrical', active: true },
  { id: 's4', name: 'Hourly Labor', description: 'General labor rate for diagnostics, repairs and custom work.', price: 95, unit: 'hour', active: true },
  { id: 's5', name: 'Emergency Call-out', description: 'After-hours emergency dispatch, includes first 30 minutes on site.', price: 250, unit: 'flat', active: true },
  { id: 's6', name: 'Deep Clean — per sq ft', description: 'Deep cleaning service billed per square foot of treated area.', price: 0.18, unit: 'unit', category: 'Cleaning', active: true },
]

const emptyForm = { name: '', description: '', price: '', unit: 'flat' as CatalogItem['unit'] }

export default function CatalogPage() {
  const [items, setItems] = useState<CatalogItem[]>(DEMO_ITEMS)
  const [search, setSearch] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)

  useEffect(() => {
    apiClient.get('/catalog/items')
      .then((res: any) => { const list = res?.items ?? res; if (Array.isArray(list) && list.length) setItems(list) })
      .catch(() => {})
  }, [])

  const filtered = items.filter(item => item.name.toLowerCase().includes(search.toLowerCase()))

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (item: CatalogItem) => {
    setEditingId(item.id)
    setForm({ name: item.name, description: item.description ?? '', price: String(item.price), unit: item.unit })
    setShowModal(true)
  }

  const handleSave = async () => {
    const price = parseFloat(form.price)
    if (!form.name.trim() || isNaN(price) || price < 0) {
      toast('Enter a name and price', 'error')
      return
    }
    if (editingId) {
      setItems(prev => prev.map(i => i.id === editingId
        ? { ...i, name: form.name.trim(), description: form.description.trim() || undefined, price, unit: form.unit }
        : i
      ))
      try {
        await apiClient.put(`/catalog/items/${editingId}`, { name: form.name.trim(), description: form.description.trim(), price, unit: form.unit })
      } catch {
        // Demo mode: keep local state
      }
      toast('Service updated', 'success')
    } else {
      const item: CatalogItem = {
        id: `s${Date.now()}`,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price,
        unit: form.unit,
        active: true,
      }
      setItems(prev => [item, ...prev])
      try {
        await apiClient.post('/catalog/items', item)
      } catch {
        // Demo mode: keep local state
      }
      toast('Service added', 'success')
    }
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleToggle = async (item: CatalogItem) => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, active: !i.active } : i))
    try {
      await apiClient.put(`/catalog/items/${item.id}`, { active: !item.active })
    } catch {
      // Demo mode: keep local state
    }
    toast(item.active ? `${item.name} deactivated` : `${item.name} activated`, 'success')
  }

  const handleDelete = async (item: CatalogItem) => {
    setItems(prev => prev.filter(i => i.id !== item.id))
    try {
      await apiClient.delete(`/catalog/items/${item.id}`)
    } catch {
      // Demo mode: keep local state
    }
    toast('Service deleted', 'success')
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Service Catalog</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Your services and pricing — used in estimates and invoices</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Add Service
        </button>
      </div>

      {/* Search */}
      <div {...anim(1)} className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          className={inputCls + ' pl-9'}
          style={inputStyle}
          placeholder="Search services…"
        />
      </div>

      {/* Service cards */}
      {filtered.length === 0 ? (
        <div {...anim(2)} className="rounded-xl px-5 py-12 text-center" style={cardStyle}>
          <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No services match your search</p>
        </div>
      ) : (
        <div {...anim(2)} className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map(item => (
            <div
              key={item.id}
              className="group rounded-xl p-5 flex flex-col transition-opacity"
              style={{ ...cardStyle, opacity: item.active ? 1 : 0.5 }}
            >
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="font-semibold text-foreground text-sm">{item.name}</p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button
                    onClick={() => openEdit(item)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                    title="Edit service"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button
                    onClick={() => handleDelete(item)}
                    className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                    title="Delete service"
                  >
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
              {item.description && (
                <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{item.description}</p>
              )}
              <div className="mt-auto flex items-end justify-between gap-2 pt-2">
                <p className="text-2xl font-bold tabular" style={{ color: '#06b6d4' }}>
                  {fmtPrice(item.price)}
                  <span className="text-sm font-medium text-muted-foreground">{UNIT_SUFFIX[item.unit]}</span>
                </p>
                <div className="flex items-center gap-2">
                  {!item.active && (
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--muted-foreground))' }}>
                      Inactive
                    </span>
                  )}
                  <button
                    onClick={() => handleToggle(item)}
                    className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                    style={{ background: item.active ? '#06b6d4' : 'rgba(0,0,0,0.2)' }}
                    title={item.active ? 'Deactivate' : 'Activate'}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full transition-transform ${item.active ? 'translate-x-6' : 'translate-x-1'}`}
                      style={{ background: 'white' }}
                    />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Service' : 'Add Service'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. HVAC Tune-up"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                className={inputCls + ' resize-none'}
                style={inputStyle}
                rows={3}
                placeholder="What's included in this service?"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Price *</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.price}
                onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="0.00"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Pricing Unit</label>
              <div className="flex items-center gap-2">
                {UNITS.map(u => {
                  const active = form.unit === u.key
                  return (
                    <button
                      key={u.key}
                      onClick={() => setForm(f => ({ ...f, unit: u.key }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={active
                        ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                      }
                    >
                      {u.label}
                    </button>
                  )
                })}
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
                {editingId ? 'Save Changes' : 'Save Service'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
