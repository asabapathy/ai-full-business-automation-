'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Truck, Plus, Trash2, Edit2, Search, ExternalLink, Mail, Phone } from 'lucide-react'

interface Vendor {
  id: string
  name: string
  email?: string
  phone?: string
  website?: string
  category?: string
  isActive: boolean
  createdAt: string
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([])
  const [stats, setStats] = useState<{ total: number; active: number; categories: string[] } | null>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Vendor | null>(null)
  const [form, setForm] = useState({ name: '', email: '', phone: '', website: '', category: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [search])

  async function load() {
    setLoading(true)
    try {
      const [vRes, sRes] = await Promise.all([
        apiClient.get<{ vendors: Vendor[] }>(`/vendors${search ? `?search=${encodeURIComponent(search)}` : ''}`),
        apiClient.get<{ total: number; active: number; categories: string[] }>('/vendors/stats'),
      ])
      setVendors(vRes.vendors)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        website: form.website || undefined,
        category: form.category || undefined,
      }
      if (editTarget) {
        await apiClient.put(`/vendors/${editTarget.id}`, payload)
      } else {
        await apiClient.post('/vendors', payload)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ name: '', email: '', phone: '', website: '', category: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  function edit(v: Vendor) {
    setEditTarget(v)
    setForm({ name: v.name, email: v.email ?? '', phone: v.phone ?? '', website: v.website ?? '', category: v.category ?? '' })
    setShowCreate(true)
  }

  async function remove(id: string) {
    if (!confirm('Remove this vendor?')) return
    await apiClient.delete(`/vendors/${id}`)
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your suppliers and service providers</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', email: '', phone: '', website: '', category: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total Vendors</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Categories</p>
            <p className="text-2xl font-bold">{stats.categories.length}</p>
          </div>
        </div>
      )}

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search vendors…"
          className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted-foreground">Loading…</div>
        ) : vendors.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No vendors yet</p>
          </div>
        ) : vendors.map(v => (
          <div key={v.id} className="bg-card border rounded-xl p-4 hover:shadow-sm transition-shadow">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold">{v.name}</p>
                {v.category && <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{v.category}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => edit(v)} className="p-1.5 rounded hover:bg-muted">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => remove(v.id)} className="p-1.5 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {v.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${v.email}`} className="hover:text-primary">{v.email}</a>
                </div>
              )}
              {v.phone && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Phone className="h-3.5 w-3.5" />
                  <span>{v.phone}</span>
                </div>
              )}
              {v.website && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ExternalLink className="h-3.5 w-3.5" />
                  <a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary truncate">{v.website}</a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Vendor' : 'Add Vendor'}</h2>
            {[
              { label: 'Name *', key: 'name', placeholder: 'Acme Corp' },
              { label: 'Email', key: 'email', placeholder: 'billing@vendor.com' },
              { label: 'Phone', key: 'phone', placeholder: '+1 555 000 0000' },
              { label: 'Website', key: 'website', placeholder: 'https://vendor.com' },
              { label: 'Category', key: 'category', placeholder: 'Software, Office, etc.' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-sm font-medium block mb-1">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
