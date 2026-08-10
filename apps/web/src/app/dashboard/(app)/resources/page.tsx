'use client'

import { useState, useEffect } from 'react'
import { Box, Plus, Calendar, Trash2, Edit2, Check, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ResourcesPage() {
  const [resources, setResources] = useState<Resource[]>([])
  const [bookings, setBookings] = useState<ResourceBooking[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'resources' | 'schedule'>('schedule')
  const [showCreate, setShowCreate] = useState(false)
  const [showBook, setShowBook] = useState<string | null>(null)
  const [editing, setEditing] = useState<Resource | null>(null)
  const [form, setForm] = useState({ name: '', type: '', description: '', capacity: '', color: '#06b6d4' })
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
      setForm({ name: '', type: '', description: '', capacity: '', color: '#06b6d4' })
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
    setResources(prev => prev.filter(r => r.id !== id))
    try {
      await apiClient.delete(`/resources/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete resource', 'error')
      load()
    }
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
      toast(e.message ?? 'Resource not available for selected time', 'error')
    }
  }

  const cancelBooking = async (id: string) => {
    try {
      await apiClient.delete(`/resources/bookings/${id}`)
      load()
    } catch {}
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Resource Booking</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage rooms, equipment, and other bookable resources</p>
        </div>
        <div className="flex gap-2">
          {tab === 'schedule' && showBook === null && (
            <button onClick={() => setShowBook(resources[0]?.id ?? '')}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}>
              <Calendar className="h-4 w-4" />Book
            </button>
          )}
          {tab === 'resources' && (
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Plus className="h-4 w-4" />Add Resource
            </button>
          )}
        </div>
      </div>

      <div {...anim(1)} className="kv-anim flex gap-1" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
        {(['schedule', 'resources'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="px-4 py-2 text-sm font-medium transition-colors capitalize"
            style={tab === t
              ? { borderBottom: '2px solid #06b6d4', color: '#06b6d4', marginBottom: '-1px' }
              : { borderBottom: '2px solid transparent', color: 'hsl(var(--muted-foreground))' }}>
            {t === 'schedule' ? 'Schedule' : 'Resources'}
          </button>
        ))}
      </div>

      {tab === 'schedule' && (
        <div {...anim(2)} className="kv-anim space-y-4">
          <div className="flex items-center gap-3">
            <input type="date" className={inputCls} style={{ ...inputStyle, width: 'auto' }} value={dateRange.from} onChange={e => setDateRange(d => ({ ...d, from: e.target.value }))} />
            <span className="text-muted-foreground">to</span>
            <input type="date" className={inputCls} style={{ ...inputStyle, width: 'auto' }} value={dateRange.to} onChange={e => setDateRange(d => ({ ...d, to: e.target.value }))} />
          </div>

          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : bookings.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground">No bookings in this period</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                      {['Resource', 'Title', 'Start', 'End', ''].map(h => (
                        <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((b, i) => (
                      <tr key={b.id} style={{ borderBottom: i < bookings.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: b.resource?.color ?? '#06b6d4' }} />
                            <span className="font-medium text-foreground">{b.resource?.name ?? 'Resource'}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{b.title ?? '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(b.startTime).toLocaleString()}</td>
                        <td className="px-4 py-3 text-muted-foreground">{new Date(b.endTime).toLocaleString()}</td>
                        <td className="px-4 py-3">
                          <button onClick={() => cancelBooking(b.id)} className="transition-colors hover:opacity-80" style={{ color: '#f87171' }}>
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'resources' && (
        <div {...anim(2)} className="kv-anim grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-3 p-8 text-center text-muted-foreground">Loading…</div>
          ) : resources.length === 0 ? (
            <div className="col-span-3 rounded-xl p-8 text-center text-muted-foreground" style={cardStyle}>No resources yet</div>
          ) : resources.map(r => (
            <div key={r.id} className="rounded-xl p-5" style={cardStyle}>
              {editing?.id === r.id ? (
                <div className="space-y-3">
                  <input className={inputCls} style={inputStyle} value={editing.name} onChange={e => setEditing(ed => ed ? { ...ed, name: e.target.value } : ed)} />
                  <input className={inputCls} style={inputStyle} placeholder="Type" value={editing.type ?? ''} onChange={e => setEditing(ed => ed ? { ...ed, type: e.target.value } : ed)} />
                  <div className="flex gap-2">
                    <input type="color" className="h-9 w-16 rounded cursor-pointer" style={{ border: '1px solid hsl(var(--border))' }} value={editing.color ?? '#06b6d4'} onChange={e => setEditing(ed => ed ? { ...ed, color: e.target.value } : ed)} />
                    <button onClick={update} className="flex-1 flex items-center justify-center gap-1 rounded-lg py-2 text-sm text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                      <Check className="h-3.5 w-3.5" /> Save
                    </button>
                    <button onClick={() => setEditing(null)} className="flex-1 rounded-lg py-2 text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="h-4 w-4 rounded-full" style={{ backgroundColor: r.color ?? '#06b6d4' }} />
                      <p className="font-semibold text-foreground">{r.name}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => setEditing(r)} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                        <Edit2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => deleteResource(r.id)} className="p-1 transition-colors" style={{ color: '#f87171' }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  {r.type && <p className="text-xs text-muted-foreground uppercase tracking-wide">{r.type}</p>}
                  {r.description && <p className="text-sm text-muted-foreground mt-1">{r.description}</p>}
                  {r.capacity && <p className="text-xs text-muted-foreground mt-1">Capacity: {r.capacity}</p>}
                  <button onClick={() => setShowBook(r.id)}
                    className="mt-3 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-sm transition-colors"
                    style={{ color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)', background: 'rgba(6,182,212,0.06)' }}>
                    <Calendar className="h-3.5 w-3.5" />Book
                  </button>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Add Resource</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name</label>
              <input className={inputCls} style={inputStyle} placeholder="Conference Room A" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Type</label>
                <input className={inputCls} style={inputStyle} placeholder="room, equipment…" value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Capacity</label>
                <input type="number" className={inputCls} style={inputStyle} placeholder="10" value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
              <input className={inputCls} style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Color</label>
              <div className="flex items-center gap-2">
                <input type="color" className="h-9 w-16 rounded cursor-pointer" style={{ border: '1px solid hsl(var(--border))' }} value={form.color} onChange={e => setForm(f => ({ ...f, color: e.target.value }))} />
                <span className="text-sm text-muted-foreground font-mono">{form.color}</span>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={create}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Add Resource
              </button>
            </div>
          </div>
        </div>
      )}

      {showBook !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Book Resource</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Resource</label>
              <select className={inputCls} style={inputStyle} value={showBook} onChange={e => setShowBook(e.target.value)}>
                {resources.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title</label>
              <input className={inputCls} style={inputStyle} placeholder="Team meeting" value={bookForm.title} onChange={e => setBookForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Start</label>
                <input type="datetime-local" className={inputCls} style={inputStyle} value={bookForm.startTime} onChange={e => setBookForm(f => ({ ...f, startTime: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">End</label>
                <input type="datetime-local" className={inputCls} style={inputStyle} value={bookForm.endTime} onChange={e => setBookForm(f => ({ ...f, endTime: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
              <input className={inputCls} style={inputStyle} value={bookForm.notes} onChange={e => setBookForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowBook(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={book}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Book
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
