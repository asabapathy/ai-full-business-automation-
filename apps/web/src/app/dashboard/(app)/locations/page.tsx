'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Star, Trash2, Edit2, Phone, Mail, X, Globe } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Skeleton } from '../../../../components/ui/skeleton'

interface Location {
  id: string
  name: string
  address: Record<string, string>
  phone: string | null
  email: string | null
  timezone: string
  isDefault: boolean
  isActive: boolean
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const TIMEZONES = [
  'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles',
  'America/Phoenix', 'America/Anchorage', 'Pacific/Honolulu',
]

const DEMO_LOCATIONS: Location[] = [
  { id: '1', name: 'Main Office', address: { street: '123 Main St', city: 'Austin', state: 'TX', zip: '78701' }, phone: '512-555-0100', email: 'main@example.com', timezone: 'America/Chicago', isDefault: true, isActive: true },
]

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState<string | null>(null)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', street: '', city: '', state: '', zip: '', phone: '', email: '', timezone: 'America/New_York', isDefault: false })

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get('/locations') as any
      setLocations(data?.locations ?? data ?? [])
    } catch {
      setLocations(DEMO_LOCATIONS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleSubmit = async () => {
    if (!form.name) return
    setSaving(true)
    try {
      const body = {
        name: form.name,
        address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
        phone: form.phone || undefined,
        email: form.email || undefined,
        timezone: form.timezone,
        isDefault: form.isDefault,
      }
      if (editId) {
        await apiClient.patch(`/locations/${editId}`, body)
        toast('Location updated', 'success')
      } else {
        await apiClient.post('/locations', body)
        toast('Location added', 'success')
      }
      resetForm()
      void load()
    } catch {
      toast('Failed to save location', 'error')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    setRemoving(id)
    try {
      await apiClient.delete(`/locations/${id}`)
      setLocations(prev => prev.filter(l => l.id !== id))
      toast('Location removed', 'success')
    } catch {
      toast('Failed to remove location', 'error')
    } finally {
      setRemoving(null)
    }
  }

  const handleEdit = (loc: Location) => {
    setEditId(loc.id)
    setForm({
      name: loc.name,
      street: loc.address.street ?? '',
      city: loc.address.city ?? '',
      state: loc.address.state ?? '',
      zip: loc.address.zip ?? '',
      phone: loc.phone ?? '',
      email: loc.email ?? '',
      timezone: loc.timezone,
      isDefault: loc.isDefault,
    })
    setShowCreate(true)
  }

  const resetForm = () => {
    setForm({ name: '', street: '', city: '', state: '', zip: '', phone: '', email: '', timezone: 'America/New_York', isDefault: false })
    setEditId(null)
    setShowCreate(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1000px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Locations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Manage multiple business locations</p>
        </div>
        <button
          onClick={() => { setEditId(null); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Add Location
        </button>
      </div>

      {/* Location cards */}
      {loading ? (
        <div {...anim(1)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-36" />)}
        </div>
      ) : locations.length === 0 ? (
        <div {...anim(1)} className="flex flex-col items-center justify-center py-16 text-center rounded-xl" style={cardStyle}>
          <MapPin className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">No locations yet</p>
          <p className="text-sm text-muted-foreground mt-1">Add your first business location.</p>
        </div>
      ) : (
        <div {...anim(1)} className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {locations.map((loc, i) => (
            <div
              key={loc.id}
              className="kv-anim rounded-xl p-5"
              style={{ animationDelay: `${0.11 + i * 0.07}s`, ...cardStyle }}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-foreground">{loc.name}</p>
                    {loc.isDefault && (
                      <span className="flex items-center gap-1 text-xs px-1.5 py-0.5 rounded-full" style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
                        <Star className="h-2.5 w-2.5" />
                        Default
                      </span>
                    )}
                    {!loc.isActive && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ color: '#94a3b8', background: 'rgba(148,163,184,0.1)' }}>Inactive</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {[loc.address.street, loc.address.city, loc.address.state].filter(Boolean).join(', ')}
                    {loc.address.zip && ` ${loc.address.zip}`}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => handleEdit(loc)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors">
                    <Edit2 className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => handleDelete(loc.id)}
                    disabled={removing === loc.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                {loc.phone && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Phone className="h-3 w-3" />
                    {loc.phone}
                  </span>
                )}
                {loc.email && (
                  <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Mail className="h-3 w-3" />
                    {loc.email}
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Globe className="h-3 w-3" />
                  {loc.timezone}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editId ? 'Edit' : 'Add'} Location</h2>
              <button onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Location Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Downtown Office" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Street Address</label>
                <input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} className={inputCls} style={inputStyle} placeholder="123 Main St" />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} className={inputCls} style={inputStyle} placeholder="City" />
                <input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} className={inputCls} style={inputStyle} placeholder="State" />
                <input value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} className={inputCls} style={inputStyle} placeholder="ZIP" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Phone</label>
                  <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} className={inputCls} style={inputStyle} placeholder="555-0100" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Email</label>
                  <input type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} className={inputCls} style={inputStyle} placeholder="office@example.com" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Timezone</label>
                <select value={form.timezone} onChange={e => setForm(p => ({ ...p, timezone: e.target.value }))} className={inputCls} style={inputStyle}>
                  {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.isDefault}
                  onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))}
                  className="rounded"
                />
                <span className="text-sm text-foreground">Set as default location</span>
              </label>
            </div>
            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleSubmit}
                disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Saving…' : editId ? 'Save Changes' : 'Add Location'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
