'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Timer, Play, Square, Plus, Trash2, DollarSign, Clock } from 'lucide-react'

interface TimeEntry {
  id: string
  description: string
  projectName?: string
  startTime: string
  endTime?: string
  duration?: number
  billable: boolean
  hourlyRate?: string
}

interface Stats { totalHours: number; billableHours: number; billableRevenue: number; count: number }

export default function TimeTrackingPage() {
  const [entries, setEntries] = useState<TimeEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTimer, setActiveTimer] = useState<TimeEntry | null>(null)
  const [elapsed, setElapsed] = useState(0)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ description: '', startTime: '', endTime: '', billable: true, hourlyRate: '' })
  const [timerDesc, setTimerDesc] = useState('')
  const [timerBillable, setTimerBillable] = useState(true)
  const [timerRate, setTimerRate] = useState('')
  const [saving, setSaving] = useState(false)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => { load() }, [])

  useEffect(() => {
    if (activeTimer) {
      const start = new Date(activeTimer.startTime).getTime()
      intervalRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000)
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current)
      setElapsed(0)
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current) }
  }, [activeTimer])

  async function load() {
    setLoading(true)
    try {
      const [eRes, sRes] = await Promise.all([
        apiClient.get<{ entries: TimeEntry[] }>('/time-tracking'),
        apiClient.get<Stats>('/time-tracking/stats'),
      ])
      setEntries(eRes.entries)
      setStats(sRes)
      const running = eRes.entries.find(e => !e.endTime)
      setActiveTimer(running ?? null)
    } finally { setLoading(false) }
  }

  async function startTimer() {
    if (!timerDesc) return
    setSaving(true)
    try {
      await apiClient.post('/time-tracking/start', {
        description: timerDesc,
        billable: timerBillable,
        hourlyRate: timerRate ? parseFloat(timerRate) : undefined,
      })
      setTimerDesc('')
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function stopTimer() {
    if (!activeTimer) return
    setSaving(true)
    try {
      await apiClient.post(`/time-tracking/${activeTimer.id}/stop`, {})
      setActiveTimer(null)
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function saveManual() {
    if (!form.description || !form.startTime) return
    setSaving(true)
    try {
      await apiClient.post('/time-tracking', {
        description: form.description,
        startTime: new Date(form.startTime).toISOString(),
        endTime: form.endTime ? new Date(form.endTime).toISOString() : undefined,
        billable: form.billable,
        hourlyRate: form.hourlyRate ? parseFloat(form.hourlyRate) : undefined,
      })
      setShowCreate(false)
      setForm({ description: '', startTime: '', endTime: '', billable: true, hourlyRate: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this entry?')) return
    await apiClient.delete(`/time-tracking/${id}`)
    load()
  }

  function fmtElapsed(s: number) {
    const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`
  }

  function fmtDuration(mins?: number) {
    if (!mins) return '—'
    const h = Math.floor(mins / 60), m = mins % 60
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Track billable and non-billable hours</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Manual Entry
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Hours', value: `${stats.totalHours.toFixed(1)}h`, icon: Clock, color: 'text-blue-500' },
            { label: 'Billable Hours', value: `${stats.billableHours.toFixed(1)}h`, icon: Timer, color: 'text-purple-500' },
            { label: 'Billable Revenue', value: `$${stats.billableRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: 'text-green-500' },
            { label: 'Entries', value: stats.count, icon: Timer, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-xl p-4">
        {activeTimer ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium">{activeTimer.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Running since {new Date(activeTimer.startTime).toLocaleTimeString()}</p>
            </div>
            <div className="text-2xl font-mono font-bold text-primary">{fmtElapsed(elapsed)}</div>
            <button onClick={stopTimer} disabled={saving}
              className="flex items-center gap-2 bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-600 disabled:opacity-50">
              <Square className="h-4 w-4" /> Stop
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <input value={timerDesc} onChange={e => setTimerDesc(e.target.value)}
              placeholder="What are you working on?"
              className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              onKeyDown={e => e.key === 'Enter' && startTimer()} />
            <input value={timerRate} onChange={e => setTimerRate(e.target.value)}
              type="number" min="0" step="0.01" placeholder="$/hr"
              className="w-24 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={timerBillable} onChange={e => setTimerBillable(e.target.checked)} className="rounded" />
              Billable
            </label>
            <button onClick={startTimer} disabled={saving || !timerDesc}
              className="flex items-center gap-2 bg-green-500 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-600 disabled:opacity-50">
              <Play className="h-4 w-4" /> Start
            </button>
          </div>
        )}
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No entries yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Description', 'Start', 'End', 'Duration', 'Rate', 'Billable', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(e => (
                <tr key={e.id} className={`border-b last:border-0 hover:bg-muted/20 ${!e.endTime ? 'bg-green-50/40 dark:bg-green-900/10' : ''}`}>
                  <td className="px-4 py-3 font-medium">
                    <div className="flex items-center gap-2">
                      {!e.endTime && <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />}
                      {e.description}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                  <td className="px-4 py-3 font-mono">{fmtDuration(e.duration)}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.hourlyRate ? `$${Number(e.hourlyRate).toFixed(0)}/hr` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-1.5 py-0.5 rounded ${e.billable ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' : 'bg-muted text-muted-foreground'}`}>
                      {e.billable ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {e.endTime && (
                      <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-muted">
                        <Trash2 className="h-3.5 w-3.5 text-red-400" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Manual Time Entry</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Description *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What did you work on?"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Start *</label>
                <input value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">End</label>
                <input value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                  type="datetime-local"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Hourly Rate ($)</label>
                <input value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={form.billable} onChange={e => setForm({ ...form, billable: e.target.checked })} className="rounded" />
                  Billable
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={saveManual} disabled={saving || !form.description || !form.startTime}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
