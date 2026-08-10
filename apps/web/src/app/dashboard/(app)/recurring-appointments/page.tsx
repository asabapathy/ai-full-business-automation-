'use client'

import { useState, useEffect } from 'react'
import { RefreshCw, Plus, Trash2 } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface RecurringAppt {
  id: string
  title: string
  startTime: string
  endTime: string
  recurrenceRule: string
  status: string
  _count?: { recurrenceChildren: number }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const freqLabel: Record<string, string> = { daily: 'Daily', weekly: 'Weekly', biweekly: 'Biweekly', monthly: 'Monthly' }

export default function RecurringAppointmentsPage() {
  const [series, setSeries] = useState<RecurringAppt[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ title: '', startTime: '', endTime: '', frequency: 'weekly', count: 8 })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/recurring-appointments') as any
      setSeries(res.appointments ?? [])
    } catch {}
    setLoading(false)
  }

  const create = async () => {
    if (!form.title || !form.startTime) return
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
    } catch (e: any) {
      toast(e.message || 'Failed to create series', 'error')
    }
    setSaving(false)
  }

  const cancelSeries = async (id: string) => {
    setDeletingId(id)
    setSeries(prev => prev.filter(s => s.id !== id))
    try {
      await apiClient.delete(`/recurring-appointments/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to cancel series', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recurring Appointments</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage appointment series with automatic scheduling</p>
        </div>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Series
        </button>
      </div>

      {showForm && (
        <div {...anim(1)} className="kv-anim rounded-xl p-6 space-y-4" style={cardStyle}>
          <h2 className="font-semibold text-foreground">Create Recurring Series</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title</label>
              <input className={inputCls} style={inputStyle} value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Frequency</label>
              <select className={inputCls} style={inputStyle} value={form.frequency} onChange={e => setForm(f => ({ ...f, frequency: e.target.value }))}>
                {Object.entries(freqLabel).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Start Time</label>
              <input type="datetime-local" className={inputCls} style={inputStyle} value={form.startTime} onChange={e => setForm(f => ({ ...f, startTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">End Time</label>
              <input type="datetime-local" className={inputCls} style={inputStyle} value={form.endTime} onChange={e => setForm(f => ({ ...f, endTime: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Number of Occurrences</label>
              <input type="number" min={1} max={52} className={inputCls} style={inputStyle} value={form.count} onChange={e => setForm(f => ({ ...f, count: parseInt(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving}
              className="px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              {saving ? 'Creating…' : 'Create Series'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
          </div>
        </div>
      )}

      <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : series.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No recurring series found. Create one to get started.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Title', 'Frequency', 'Next', 'Occurrences', 'Status', ''].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {series.map((s, i) => (
                  <tr key={s.id} style={{ borderBottom: i < series.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-4 py-3 font-medium text-foreground">{s.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <RefreshCw className="h-3 w-3" />
                        {freqLabel[s.recurrenceRule] ?? s.recurrenceRule}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(s.startTime).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s._count?.recurrenceChildren ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
                        style={s.status === 'SCHEDULED'
                          ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                          : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => cancelSeries(s.id)} disabled={deletingId === s.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                        <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
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
  )
}
