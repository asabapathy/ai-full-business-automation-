'use client'

import { useState, useEffect } from 'react'
import { Box, Plus, Calendar, Trash2, Edit2, Check, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface Resource {
  id: string
  name: string
  type?: string
  description?: string
  capacity?: number
  color?: string
  isActive: boolean
}

interface ResourceBooking {
  id: string
  resourceId: string
  resource?: { name: string; color?: string }
  startTime: string
  endTime: string
  title?: string
  notes?: string
  bookedBy?: string
  appointmentId?: string
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<ResourceBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'resources' | 'schedule'>('schedule')
  const [showCreate, setShowCreate] = useState(false)
  const [showBook, setShowBook] = useState<string | null>(null)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [form, setForm] = useState({ name: '', type: '', description: '', capacity: '', color: '#3b82f6' })
  const [bookForm, setBookForm] = useState({ startTime: '', endTime: '', title: '', notes: '' })
  const [dateRange, setDateRange] = useState({
    from: new Date().toISOString().split('T')[0],
    to: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
  })

  const load = async () => {
    setLoading(true)
    try {
      const [resRes, schedRes] = await Promise.all([
        apiClient.get('/resources') as any,
        apiClient.get(`/resources/schedule?from=${dateRange.from}&to=${dateRange.to}`) as any,
      ])
      setResources(resRes?.resources ?? [])
      setBookings(schedRes?.schedule ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [dateRange])

  const create = async () => {
    if (!form.name) return
    try {
      await apiClient.post('/resources', { ...form, capacity: form.capacity ? parseInt(form.capacity) : undefined })
      setShowCreate(false)
      setForm({ name: '', type: '', description: '', capacity: '', color: '#3b82f6' })
      load()
    } catch {}
  }

  const update = async () => {
    if (!editing) return
    try {
      await apiClient.patch(`/resources/${editing.id}`, { name: editing.name, type: editing.type, description: editing.description, color: editing.color })
      setEditing(null)
      load()
    } catch {}
  }

  const deleteResource = async (id: string) => {
    if (!confirm('Delete this resource?')) return
    try {
      await apiClient.delete(`/resources/${id}`)
      load()
    } catch {}
  }

  const book = async () => {
    if (!showBook || !bookForm.startTime || !bookForm.endTime) return
    try {
      await apiClient.post('/resources/bookings', {
        resourceId: showBook,
        startTime: new Date(bookForm.startTime).toISOString(),
        endTime: new Date(bookForm.endTime).toISOString(),
        title: bookForm.title,
        notes: bookForm.notes,
      })
      setShowBook(null)
      setBookForm({ startTime: '', endTime: '', title: '', notes: '' })
      load()
    } catch (e: any) {
      alert(e.message ?? 'Resource not available for selected time')
    }
  }

  const cancelBooking = async (id: string) => {
    try {
      await apiClient.delete(`/resources/bookings/${id}`)
      load()
    } catch {}
  }

  const hours = Array.from({ length: 13 }, (_, i) => i + 8)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Resource Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Manage rooms, equipment, and other bookable resources</p>
        </div>
        <div className="flex gap-2">
          {tab === 'schedule' && showBook === null && (
            <button onClick={() => setShowBook(resources[0]?.id ?? '')} className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
              <Calendar className="h-4 w-4" />
              Book
            </button>
          )}
          {tab === 'resources' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              <Plus className="h-4 w-4" />
              Add Resource
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-2 border-b">
        {(['schedule', 'resources'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'schedule' ? 'Schedule' : 'Resources'}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
            <span className="text-gray-400">to</span>
            <input type="date" className="rounded-lg border border-gray-200 px-3 py-2 text-sm" value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
          </div>

          <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-gray-400">Loading...</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-gray-400">No bookings in this period</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Resource</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Start</th>
                    <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">End</th>
                    <th className="px-4 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {bookings.map(b => (
                    <tr key={b.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-3 w-3 rounded-full" style={{ backgroundColor: b.resource?.color ?? '#3b82f6' }} />
                          <span className="font-medium text-gray-900">{b.resource?.name ?? 'Resource'}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{b.title ?? '—'}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(b.startTime).toLocaleString()}</td>
                      <td className="px-4 py-3 text-gray-600">{new Date(b.endTime).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <button onClick={() => cancelBooking(b.id)} className="text-red-400 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 p-8 text-center text-gray-400">Loading...</div>
          ) : resources.length === 0 ? (
            <div className="col-span-3 rounded-xl border bg-white p-8 text-center text-gray-400">No resources yet</div>
          ) : resources.map(r => (
            <div key={r.id} className="rounded-xl border bg-white p-5 shadow-sm">
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={editing.name} onChange={e => setEditing(ed => ed ? { ...ed, name: e.target.value } : ed)} />
                  <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Type" value={editing.type ?? ''} onChange={e => setEditing(ed => ed ? { ...ed, type: e.target.value } : ed)} />
                  <div className="flex gap-2">
                    <input type="color" className="h-9 w-16 rounded border" value={editing.color ?? '#3b82f6'} onChange={e => setEditing(ed => ed ? { ...ed, color: e.target.value } : ed)} />
                    <button onClick={update} className="flex-1 flex items-center justify-center gap-1 rounded-lg bg-green-600 py-2 text-sm text-white hover:bg-green-700">
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="flex-1 rounded-lg border py-2 text-sm text-gray-600 hover:bg-gray-50">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: r.color ?? '#3b82f6' }} />
                      <p className="font-semibold text-gray-900">{r.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(r)} className="text-gray-400 hover:text-blue-600 p-1">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteResource(r.id)} className="text-gray-400 hover:text-red-500 p-1">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {r.type && <p className="text-xs text-gray-500 uppercase tracking-wide">{r.type}</p>}
                  {r.description && <p className="text-sm text-gray-600 mt-1">{r.description}</p>}
                  {r.capacity && <p className="text-xs text-gray-400 mt-1">Capacity: {r.capacity}</p>}
                  <button onClick={() => setShowBook(r.id)} className="mt-3 w-full flex items-center justify-center gap-1.5 rounded-lg border py-1.5 text-sm text-blue-600 hover:bg-blue-50">
                    <Calendar className="h-3.5 w-3.5" />
                    Book
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Add Resource</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Conference Room A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="room, equipment..." value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Capacity</label>
                <input type="number" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="10" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-16 rounded border cursor-pointer" value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                <span className="text-sm text-gray-600 font-mono">{form.color}</span>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={create} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add Resource</button>
            </div>
          </div>
        </div>
      )}

      {/* Book Modal */}
      {showBook !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Book Resource</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Resource</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={showBook} onChange={e => setShowBook(e.target.value)}>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Team meeting" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Start</label>
                <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bookForm.startTime} onChange={e => setBookForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">End</label>
                <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bookForm.endTime} onChange={e => setBookForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={bookForm.notes} onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowBook(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={book} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Book</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
