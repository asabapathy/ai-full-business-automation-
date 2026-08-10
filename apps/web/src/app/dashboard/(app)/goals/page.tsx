'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Target, Plus, Trash2, Edit2, TrendingUp, Award, Circle } from 'lucide-react'

interface Goal {
  id: string
  title: string
  description?: string
  category?: string
  targetValue: string
  currentValue: string
  unit?: string
  status: string
  dueDate?: string
  progress: number
}

interface Stats { total: number; achieved: number; active: number; avgProgress: number }

const STATUS_META: Record<string, { text: string; bg: string }> = {
  active:    { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  achieved:  { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  paused:    { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  cancelled: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const PROGRESS_COLOR: Record<string, string> = {
  achieved: '#34d399',
  active:   '#06b6d4',
  paused:   '#fbbf24',
  cancelled: '#f87171',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const CATEGORIES = ['Revenue', 'Sales', 'Marketing', 'Customer', 'Team', 'Product', 'Financial', 'Other']

export default function GoalsPage() {
  const [goals, setGoals] = useState<Goal[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Goal | null>(null)
  const [progressTarget, setProgressTarget] = useState<Goal | null>(null)
  const [progressValue, setProgressValue] = useState('')
  const [form, setForm] = useState({ title: '', description: '', category: '', targetValue: '', unit: '', status: 'active', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [gRes, sRes] = await Promise.all([
        apiClient.get<{ goals: Goal[] }>('/goals'),
        apiClient.get<Stats>('/goals/stats'),
      ])
      setGoals(gRes.goals)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.title || !form.targetValue) return
    setSaving(true)
    try {
      const payload = {
        title: form.title,
        description: form.description || undefined,
        category: form.category || undefined,
        targetValue: parseFloat(form.targetValue),
        unit: form.unit || undefined,
        status: form.status,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
      }
      if (editTarget) {
        await apiClient.put(`/goals/${editTarget.id}`, payload)
      } else {
        await apiClient.post('/goals', payload)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ title: '', description: '', category: '', targetValue: '', unit: '', status: 'active', dueDate: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save goal', 'error')
    } finally { setSaving(false) }
  }

  async function updateProgress() {
    if (!progressTarget || !progressValue) return
    setSaving(true)
    try {
      await apiClient.patch(`/goals/${progressTarget.id}/progress`, { currentValue: parseFloat(progressValue) })
      setProgressTarget(null)
      setProgressValue('')
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to update progress', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setGoals(prev => prev.filter(g => g.id !== id))
    try {
      await apiClient.delete(`/goals/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete goal', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function edit(g: Goal) {
    setEditTarget(g)
    setForm({
      title: g.title,
      description: g.description ?? '',
      category: g.category ?? '',
      targetValue: String(g.targetValue),
      unit: g.unit ?? '',
      status: g.status,
      dueDate: g.dueDate ? g.dueDate.split('T')[0] : '',
    })
    setShowCreate(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Set and track business goals</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ title: '', description: '', category: '', targetValue: '', unit: '', status: 'active', dueDate: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Goals', value: stats.total, icon: Target, color: '#a78bfa' },
            { label: 'Active', value: stats.active, icon: TrendingUp, color: '#60a5fa' },
            { label: 'Achieved', value: stats.achieved, icon: Award, color: '#34d399' },
            { label: 'Avg Progress', value: `${stats.avgProgress.toFixed(0)}%`, icon: Circle, color: '#fb923c' },
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

      <div {...anim(2)} className="kv-anim grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-muted-foreground">Loading…</div>
        ) : goals.length === 0 ? (
          <div className="col-span-2 py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No goals yet</p>
          </div>
        ) : goals.map(g => {
          const sm = STATUS_META[g.status] ?? STATUS_META.active
          return (
            <div key={g.id} className="rounded-xl p-4 space-y-3" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{g.title}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ color: sm.text, background: sm.bg }}>{g.status}</span>
                  </div>
                  {g.category && (
                    <span className="text-xs text-muted-foreground px-2 py-0.5 rounded mt-1 inline-block" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>{g.category}</span>
                  )}
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setProgressTarget(g); setProgressValue(String(g.currentValue)) }}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
                    Update
                  </button>
                  <button onClick={() => edit(g)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => remove(g.id)} disabled={deletingId === g.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-muted-foreground">{Number(g.currentValue).toLocaleString()} / {Number(g.targetValue).toLocaleString()} {g.unit}</span>
                  <span className="font-semibold text-foreground">{g.progress.toFixed(0)}%</span>
                </div>
                <div className="rounded-full h-2" style={{ background: 'hsl(var(--background))' }}>
                  <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(g.progress, 100)}%`, background: PROGRESS_COLOR[g.status] ?? '#06b6d4' }} />
                </div>
              </div>
              {g.dueDate && (
                <p className="text-xs text-muted-foreground">Due: {new Date(g.dueDate).toLocaleDateString()}</p>
              )}
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Goal' : 'New Goal'}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Reach $100k MRR" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Goal description"
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  {['active', 'paused', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Target Value *</label>
                <input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })}
                  type="number" min="0" step="any" placeholder="100000"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Unit</label>
                <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="$, %, users…" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Due Date</label>
              <input value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                type="date" className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.targetValue}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {progressTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Update Progress</h2>
            <p className="text-sm text-muted-foreground">{progressTarget.title}</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Current Value</label>
              <input value={progressValue} onChange={e => setProgressValue(e.target.value)}
                type="number" min="0" step="any"
                placeholder={`Target: ${Number(progressTarget.targetValue).toLocaleString()} ${progressTarget.unit ?? ''}`}
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProgressTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={updateProgress} disabled={saving || !progressValue}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
