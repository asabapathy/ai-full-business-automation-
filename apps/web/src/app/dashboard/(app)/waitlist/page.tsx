'use client'

import { useState, useEffect } from 'react'
import { Clock3, Plus, Bell, Trash2, CheckCircle, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface WaitlistEntry {
  id: string
  contactId: string
  contact?: { firstName: string; lastName: string; email: string; phone?: string }
  serviceId?: string
  preferredDate?: string
  notes?: string
  status: string
  notifiedAt?: string
  bookedAt?: string
  createdAt: string
}

interface Stats {
  total: number
  waiting: number
  notified: number
  booked: number
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  waiting:  { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  notified: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  booked:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  expired:  { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function WaitlistPage() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, waiting: 0, notified: 0, booked: 0 })
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const [statusFilter, setStatusFilter] = useState('waiting')
  const [form, setForm] = useState({ contactId: '', serviceId: '', preferredDate: '', notes: '' })
  const [notifyForm, setNotifyForm] = useState({ slotDate: '', serviceId: '' })
  const [showNotify, setShowNotify] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [entRes, statRes] = await Promise.all([
        apiClient.get(`/waitlist?status=${statusFilter}`) as any,
        apiClient.get('/waitlist/stats') as any,
      ])
      setEntries(entRes?.entries ?? [])
      setStats(statRes ?? stats)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [statusFilter])

  const add = async () => {
    if (!form.contactId) return
    try {
      await apiClient.post('/waitlist', form)
      setShowAdd(false)
      setForm({ contactId: '', serviceId: '', preferredDate: '', notes: '' })
      load()
    } catch {}
  }

  const notify = async () => {
    if (!notifyForm.slotDate) return
    setNotifying(true)
    try {
      const res = await apiClient.post('/waitlist/notify', notifyForm) as any
      toast(`Notified ${res.notified} contacts`, 'success')
      setShowNotify(false)
      load()
    } catch {}
    setNotifying(false)
  }

  const updateStatus = async (id: string, status: string) => {
    try {
      await apiClient.patch(`/waitlist/${id}/status`, { status })
      load()
    } catch {}
  }

  const remove = async (id: string) => {
    setDeletingId(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await apiClient.delete(`/waitlist/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to remove entry', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Smart Waitlist</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage appointment waiting list and auto-notify contacts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNotify(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ border: '1px solid hsl(var(--border))' }}>
            <Bell className="h-4 w-4" />Notify Waitlist
          </button>
          <button onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Plus className="h-4 w-4" />Add to Waitlist
          </button>
        </div>
      </div>

      <div {...anim(1)} className="kv-anim grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: '#94a3b8' },
          { label: 'Waiting', value: stats.waiting, icon: Clock3, color: '#fbbf24' },
          { label: 'Notified', value: stats.notified, icon: Bell, color: '#60a5fa' },
          { label: 'Booked', value: stats.booked, icon: CheckCircle, color: '#34d399' },
        ].map(s => (
          <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{s.label}</p>
              <s.icon className="h-4 w-4" style={{ color: s.color }} />
            </div>
            <p className="text-2xl font-bold text-foreground mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      <div {...anim(2)} className="kv-anim flex gap-2 flex-wrap">
        {['waiting', 'notified', 'booked', 'expired'].map(s => {
          const active = statusFilter === s
          const sm = STATUS_META[s]
          return (
            <button key={s} onClick={() => setStatusFilter(s)}
              className="px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-all"
              style={active
                ? { color: sm.text, background: sm.bg, border: `1px solid ${sm.text}40` }
                : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
              {s}
            </button>
          )
        })}
      </div>

      <div {...anim(3)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No entries</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Contact', 'Preferred Date', 'Status', 'Added', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => {
                  const sm = STATUS_META[e.status] ?? STATUS_META.expired
                  return (
                    <tr key={e.id} style={{ borderBottom: i < entries.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{e.contact ? `${e.contact.firstName} ${e.contact.lastName}` : e.contactId.slice(0, 8)}</p>
                        <p className="text-xs text-muted-foreground">{e.contact?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{e.preferredDate ? new Date(e.preferredDate).toLocaleDateString() : '—'}</td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: sm.text, background: sm.bg }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          {e.status === 'waiting' && (
                            <button onClick={() => updateStatus(e.id, 'booked')} className="text-xs transition-colors" style={{ color: '#34d399' }}>
                              Mark Booked
                            </button>
                          )}
                          <button onClick={() => remove(e.id)} disabled={deletingId === e.id} className="transition-colors" style={{ color: '#f87171' }}>
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Add to Waitlist</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact ID</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Preferred Date</label>
              <input type="date" className={inputCls} style={inputStyle} value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Notes</label>
              <textarea rows={2} className={`${inputCls} resize-none`} style={inputStyle} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowAdd(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={add} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Add</button>
            </div>
          </div>
        </div>
      )}

      {showNotify && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Notify Waiting Contacts</h2>
            <p className="text-sm text-muted-foreground">Send SMS to up to 5 waiting contacts about an available slot.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Slot Date & Time</label>
              <input type="datetime-local" className={inputCls} style={inputStyle} value={notifyForm.slotDate} onChange={e => setNotifyForm(f => ({ ...f, slotDate: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowNotify(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={notify} disabled={notifying} className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {notifying ? 'Sending…' : 'Send Notifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
