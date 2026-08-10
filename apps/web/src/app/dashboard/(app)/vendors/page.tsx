'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    } catch (e: any) {
      toast(e.message || 'Failed to save vendor', 'error')
    } finally { setSaving(false) }
  }

  function edit(v: Vendor) {
    setEditTarget(v)
    setForm({ name: v.name, email: v.email ?? '', phone: v.phone ?? '', website: v.website ?? '', category: v.category ?? '' })
    setShowCreate(true)
  }

  async function remove(id: string) {
    setDeletingId(id)
    setVendors(prev => prev.filter(v => v.id !== id))
    try {
      await apiClient.delete(`/vendors/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to remove vendor', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Vendors</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage your suppliers and service providers</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', email: '', phone: '', website: '', category: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Add Vendor
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-3 gap-4">
          {[
            { label: 'Total Vendors', value: stats.total, color: 'hsl(var(--foreground))' },
            { label: 'Active', value: stats.active, color: '#34d399' },
            { label: 'Categories', value: stats.categories.length, color: 'hsl(var(--foreground))' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search vendors…"
          className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
          style={inputStyle} />
      </div>

      <div {...anim(3)} className="kv-anim grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted-foreground">Loading…</div>
        ) : vendors.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <Truck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No vendors yet</p>
          </div>
        ) : vendors.map(v => (
          <div key={v.id} className="rounded-xl p-4 transition-shadow" style={cardStyle}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-semibold text-foreground">{v.name}</p>
                {v.category && (
                  <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block text-muted-foreground"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                    {v.category}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => edit(v)} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => remove(v.id)} disabled={deletingId === v.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                </button>
              </div>
            </div>
            <div className="space-y-1.5">
              {v.email && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Mail className="h-3.5 w-3.5" />
                  <a href={`mailto:${v.email}`} className="hover:text-foreground transition-colors">{v.email}</a>
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
                  <a href={v.website} target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors truncate">{v.website}</a>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Vendor' : 'Add Vendor'}</h2>
            {[
              { label: 'Name *', key: 'name', placeholder: 'Acme Corp' },
              { label: 'Email', key: 'email', placeholder: 'billing@vendor.com' },
              { label: 'Phone', key: 'phone', placeholder: '+1 555 000 0000' },
              { label: 'Website', key: 'website', placeholder: 'https://vendor.com' },
              { label: 'Category', key: 'category', placeholder: 'Software, Office, etc.' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">{f.label}</label>
                <input value={(form as any)[f.key]} onChange={e => setForm({ ...form, [f.key]: e.target.value })}
                  placeholder={f.placeholder} className={inputCls} style={inputStyle} />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Add Vendor'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
