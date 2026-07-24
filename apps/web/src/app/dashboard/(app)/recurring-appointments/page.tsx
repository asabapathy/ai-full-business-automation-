'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2, ChevronRight } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface RecurringAppt {
  id: string
  title: string
  startTime: string
  endTime: string
  recurrenceRule: string
  status: string
  _count?: { recurrenceChildren: number }
}

export default function RecurringAppointmentsPage() {
  const [series, setSeries] = useState<RecurringAppt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '',
    startTime: '',
    endTime: '',
    frequency: 'weekly',
    count: 8,
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/recurring-appointments') as any
      setSeries(res.appointments ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    setSaving(true)
    try {
      await apiClient.post('/recurring-appointments', {
        title: form.title,
        startTime: form.startTime,
        endTime: form.endTime,
        recurrence: { frequency: form.frequency, count: form.count },
      })
      setShowForm(false)
      setForm({ title: '', startTime: '', endTime: '', frequency: 'weekly', count: 8 })
      load()
    } catch {}
    setSaving(false)
  }

  const cancelSeries = async (id: string) => {
    if (!confirm('Cancel all future occurrences in this series?')) return
    try {
      await apiClient.delete(`/recurring-appointments/${id}`)
      load()
    } catch {}
  }

  const freqLabel: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recurring Appointments</h1>
          <p className="text-sm text-gray-500 mt-1">Manage appointment series with automatic scheduling</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          <Plus className="h-4 w-4" />
          New Series
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Create Recurring Series</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Title</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Frequency</label>
              <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {Object.entries(freqLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Start Time</label>
              <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">End Time</label>
              <input type="datetime-local" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Number of Occurrences</label>
              <input type="number" min={1} max={52} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.count} onChange={e => setForm(f => ({ ...f, count: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Series'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : series.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No recurring series found. Create one to get started.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Title</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Frequency</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Next</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Occurrences</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y">
              {series.map(s => (
                <tr key={s.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">{s.title}</td>
                  <td className="px-4 py-3 text-gray-600">
                    <span className="flex items-center gap-1">
                      <RefreshCw className="h-3 w-3" />
                      {freqLabel[s.recurrenceRule] ?? s.recurrenceRule}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{new Date(s.startTime).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-gray-600">{s._count?.recurrenceChildren ?? '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${s.status === 'SCHEDULED' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button onClick={() => cancelSeries(s.id)} className="text-red-500 hover:text-red-700">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
