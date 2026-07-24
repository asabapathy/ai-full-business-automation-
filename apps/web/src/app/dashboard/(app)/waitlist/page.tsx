'use client'

import { useState, useEffect } from 'react'
import { Clock3, Plus, Bell, Trash2, CheckCircle, Users, TrendingUp } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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
      alert(`Notified ${res.notified} contacts`)
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
    try {
      await apiClient.delete(`/waitlist/${id}`)
      load()
    } catch {}
  }

  const statusColor: Record<string, string> = {
    waiting: 'bg-yellow-100 text-yellow-700',
    notified: 'bg-blue-100 text-blue-700',
    booked: 'bg-green-100 text-green-700',
    expired: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Waitlist</h1>
          <p className="text-sm text-gray-500 mt-1">Manage appointment waiting list and auto-notify contacts</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNotify(true)} className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-100">
            <Bell className="h-4 w-4" />
            Notify Waitlist
          </button>
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            Add to Waitlist
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, icon: Users, color: 'text-gray-600' },
          { label: 'Waiting', value: stats.waiting, icon: Clock3, color: 'text-yellow-600' },
          { label: 'Notified', value: stats.notified, icon: Bell, color: 'text-blue-600' },
          { label: 'Booked', value: stats.booked, icon: CheckCircle, color: 'text-green-600' },
        ].map(s => (
          <div key={s.label} className="rounded-xl border bg-white p-4 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500">{s.label}</p>
              <s.icon className={`h-4 w-4 ${s.color}`} />
            </div>
            <p className="text-2xl font-bold text-gray-900 mt-1">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {['waiting', 'notified', 'booked', 'expired'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-sm font-medium capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s}
          </button>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : entries.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No entries</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Preferred Date</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {entries.map(e => (
                <tr key={e.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{e.contact ? `${e.contact.firstName} ${e.contact.lastName}` : e.contactId.slice(0, 8)}</p>
                    <p className="text-xs text-gray-500">{e.contact?.email}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.preferredDate ? new Date(e.preferredDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[e.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {e.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{new Date(e.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {e.status === 'waiting' && (
                        <button onClick={() => updateStatus(e.id, 'booked')} className="text-xs text-green-600 hover:underline">Mark Booked</button>
                      )}
                      <button onClick={() => remove(e.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Add to Waitlist</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={form.contactId} onChange={e => setForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Preferred Date</label>
              <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.preferredDate} onChange={e => setForm(f => ({ ...f, preferredDate: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Notes</label>
              <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none" value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={add} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Add</button>
            </div>
          </div>
        </div>
      )}

      {/* Notify Modal */}
      {showNotify && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Notify Waiting Contacts</h2>
            <p className="text-sm text-gray-500">Send SMS to up to 5 waiting contacts about an available slot.</p>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Slot Date & Time</label>
              <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={notifyForm.slotDate} onChange={e => setNotifyForm(f => ({ ...f, slotDate: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowNotify(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={notify} disabled={notifying} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
                {notifying ? 'Sending...' : 'Send Notifications'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
