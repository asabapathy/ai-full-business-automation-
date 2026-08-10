'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

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
  const [deletingId, setDeletingId] = useState<string | null>(null)
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
    } catch (e: any) {
      toast(e.message || 'Failed to start timer', 'error')
    } finally { setSaving(false) }
  }

  async function stopTimer() {
    if (!activeTimer) return
    setSaving(true)
    try {
      await apiClient.post(`/time-tracking/${activeTimer.id}/stop`, {})
      setActiveTimer(null)
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to stop timer', 'error')
    } finally { setSaving(false) }
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
    } catch (e: any) {
      toast(e.message || 'Failed to save entry', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setEntries(prev => prev.filter(e => e.id !== id))
    try {
      await apiClient.delete(`/time-tracking/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete entry', 'error')
      load()
    } finally { setDeletingId(null) }
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
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Time Tracking</h1>
          <p className="text-muted-foreground text-sm mt-1">Track billable and non-billable hours</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Manual Entry
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Hours', value: `${stats.totalHours.toFixed(1)}h`, icon: Clock, color: '#60a5fa' },
            { label: 'Billable Hours', value: `${stats.billableHours.toFixed(1)}h`, icon: Timer, color: '#a78bfa' },
            { label: 'Billable Revenue', value: `$${stats.billableRevenue.toLocaleString(undefined, { minimumFractionDigits: 0 })}`, icon: DollarSign, color: '#34d399' },
            { label: 'Entries', value: stats.count, icon: Timer, color: '#fb923c' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim rounded-xl p-4" style={cardStyle}>
        {activeTimer ? (
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <p className="font-medium text-foreground">{activeTimer.description}</p>
              <p className="text-xs text-muted-foreground mt-0.5">Running since {new Date(activeTimer.startTime).toLocaleTimeString()}</p>
            </div>
            <div className="text-2xl font-mono font-bold" style={{ color: '#06b6d4' }}>{fmtElapsed(elapsed)}</div>
            <button onClick={stopTimer} disabled={saving}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-50 transition-colors"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.3)' }}>
              <Square className="h-4 w-4" /> Stop
            </button>
          </div>
        ) : (
          <div className="flex gap-3">
            <input value={timerDesc} onChange={e => setTimerDesc(e.target.value)}
              placeholder="What are you working on?"
              className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={inputStyle}
              onKeyDown={e => e.key === 'Enter' && startTimer()} />
            <input value={timerRate} onChange={e => setTimerRate(e.target.value)}
              type="number" min="0" step="0.01" placeholder="$/hr"
              className="w-24 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={inputStyle} />
            <label className="flex items-center gap-1.5 text-sm text-muted-foreground cursor-pointer">
              <input type="checkbox" checked={timerBillable} onChange={e => setTimerBillable(e.target.checked)} className="rounded" />
              Billable
            </label>
            <button onClick={startTimer} disabled={saving || !timerDesc}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Play className="h-4 w-4" /> Start
            </button>
          </div>
        )}
      </div>

      <div {...anim(3)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center">
            <Timer className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Description', 'Start', 'End', 'Duration', 'Rate', 'Billable', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {entries.map((e, i) => (
                  <tr key={e.id}
                    style={{
                      borderBottom: i < entries.length - 1 ? '1px solid hsl(var(--border))' : undefined,
                      background: !e.endTime ? 'rgba(52,211,153,0.04)' : undefined,
                    }}>
                    <td className="px-4 py-3 font-medium text-foreground">
                      <div className="flex items-center gap-2">
                        {!e.endTime && <span className="h-2 w-2 rounded-full animate-pulse" style={{ background: '#34d399' }} />}
                        {e.description}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{new Date(e.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.endTime ? new Date(e.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '—'}</td>
                    <td className="px-4 py-3 font-mono text-foreground">{fmtDuration(e.duration)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{e.hourlyRate ? `$${Number(e.hourlyRate).toFixed(0)}/hr` : '—'}</td>
                    <td className="px-4 py-3">
                      <span className="text-xs px-1.5 py-0.5 rounded" style={e.billable
                        ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                        : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))' }}>
                        {e.billable ? 'Yes' : 'No'}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {e.endTime && (
                        <button onClick={() => remove(e.id)} disabled={deletingId === e.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                          <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Manual Time Entry</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description *</label>
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                placeholder="What did you work on?" className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Start *</label>
                <input value={form.startTime} onChange={e => setForm({ ...form, startTime: e.target.value })}
                  type="datetime-local" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">End</label>
                <input value={form.endTime} onChange={e => setForm({ ...form, endTime: e.target.value })}
                  type="datetime-local" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Hourly Rate ($)</label>
                <input value={form.hourlyRate} onChange={e => setForm({ ...form, hourlyRate: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00" className={inputCls} style={inputStyle} />
              </div>
              <div className="flex items-end pb-2">
                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                  <input type="checkbox" checked={form.billable} onChange={e => setForm({ ...form, billable: e.target.checked })} className="rounded" />
                  Billable
                </label>
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={saveManual} disabled={saving || !form.description || !form.startTime}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : 'Add Entry'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
