'use client'

import { useState, useEffect } from 'react'
import { MapPin, Plus, Star, Trash2, Edit2, Phone, Mail } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

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

export default function LocationsPage() {
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', street: '', city: '', state: '', zip: '', phone: '', email: '', timezone: 'America/New_York', isDefault: false })

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const res = await fetch(`${API_BASE}/locations`, { headers })
    const data = await res.json() as { locations: Location[] }
    setLocations(data.locations ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleSubmit = async () => {
    if (!form.name) return
    const body = {
      name: form.name,
      address: { street: form.street, city: form.city, state: form.state, zip: form.zip },
      phone: form.phone || undefined,
      email: form.email || undefined,
      timezone: form.timezone,
      isDefault: form.isDefault,
    }

    if (editId) {
      await fetch(`${API_BASE}/locations/${editId}`, { method: 'PATCH', headers, body: JSON.stringify(body) })
    } else {
      await fetch(`${API_BASE}/locations`, { method: 'POST', headers, body: JSON.stringify(body) })
    }
    resetForm()
    void load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Remove this location?')) return
    await fetch(`${API_BASE}/locations/${id}`, { method: 'DELETE', headers })
    void load()
  }

  const handleEdit = (loc: Location) => {
    setEditId(loc.id)
    setForm({
      name: loc.name,
      street: (loc.address.street ?? ''),
      city: (loc.address.city ?? ''),
      state: (loc.address.state ?? ''),
      zip: (loc.address.zip ?? ''),
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
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><MapPin className="w-6 h-6 text-indigo-400" /> Locations</h1>
          <p className="text-gray-400 text-sm mt-1">Manage multiple business locations</p>
        </div>
        <button onClick={() => { setEditId(null); setShowCreate(true) }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Location
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading...</div>
      ) : locations.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <MapPin className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No locations yet. Add your first business location.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          {locations.map(loc => (
            <div key={loc.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-white">{loc.name}</span>
                    {loc.isDefault && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded-full flex items-center gap-1"><Star className="w-3 h-3" /> Default</span>}
                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {[loc.address.street, loc.address.city, loc.address.state].filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => handleEdit(loc)} className="p-1.5 text-gray-500 hover:text-indigo-400 rounded"><Edit2 className="w-4 h-4" /></button>
                  <button onClick={() => handleDelete(loc.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
              <div className="flex gap-3 text-xs text-gray-500 mt-2">
                {loc.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {loc.phone}</span>}
                {loc.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" /> {loc.email}</span>}
              </div>
              <div className="text-xs text-gray-600 mt-1">{loc.timezone}</div>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold text-white mb-4">{editId ? 'Edit' : 'Add'} Location</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Location name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.street} onChange={e => setForm(p => ({ ...p, street: e.target.value }))} placeholder="Street address" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <div className="grid grid-cols-3 gap-2">
                <input value={form.city} onChange={e => setForm(p => ({ ...p, city: e.target.value }))} placeholder="City" className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
                <input value={form.state} onChange={e => setForm(p => ({ ...p, state: e.target.value }))} placeholder="State" className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
                <input value={form.zip} onChange={e => setForm(p => ({ ...p, zip: e.target.value }))} placeholder="ZIP" className="px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              </div>
              <input value={form.phone} onChange={e => setForm(p => ({ ...p, phone: e.target.value }))} placeholder="Phone (optional)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="Email (optional)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
                <input type="checkbox" checked={form.isDefault} onChange={e => setForm(p => ({ ...p, isDefault: e.target.checked }))} className="rounded" />
                Set as default location
              </label>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={resetForm} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleSubmit} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">{editId ? 'Save' : 'Add Location'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
