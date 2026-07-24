'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
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

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  achieved: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  paused: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function updateProgress() {
    if (!progressTarget || !progressValue) return
    setSaving(true)
    try {
      await apiClient.patch(`/goals/${progressTarget.id}/progress`, { currentValue: parseFloat(progressValue) })
      setProgressTarget(null)
      setProgressValue('')
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this goal?')) return
    await apiClient.delete(`/goals/${id}`)
    load()
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

  const CATEGORIES = ['Revenue', 'Sales', 'Marketing', 'Customer', 'Team', 'Product', 'Financial', 'Other']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-muted-foreground text-sm mt-1">Set and track business goals</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ title: '', description: '', category: '', targetValue: '', unit: '', status: 'active', dueDate: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Goal
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Goals', value: stats.total, icon: Target, color: 'text-purple-500' },
            { label: 'Active', value: stats.active, icon: TrendingUp, color: 'text-blue-500' },
            { label: 'Achieved', value: stats.achieved, icon: Award, color: 'text-green-500' },
            { label: 'Avg Progress', value: `${stats.avgProgress.toFixed(0)}%`, icon: Circle, color: 'text-orange-500' },
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

      <div className="grid md:grid-cols-2 gap-4">
        {loading ? (
          <div className="col-span-2 py-8 text-center text-muted-foreground">Loading…</div>
        ) : goals.length === 0 ? (
          <div className="col-span-2 py-12 text-center">
            <Target className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No goals yet</p>
          </div>
        ) : goals.map(g => (
          <div key={g.id} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{g.title}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[g.status] ?? ''}`}>{g.status}</span>
                </div>
                {g.category && <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{g.category}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setProgressTarget(g); setProgressValue(String(g.currentValue)) }}
                  className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">Update</button>
                <button onClick={() => edit(g)} className="p-1.5 rounded hover:bg-muted">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => remove(g.id)} className="p-1.5 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <div>
              <div className="flex justify-between text-sm mb-1">
                <span className="text-muted-foreground">{Number(g.currentValue).toLocaleString()} / {Number(g.targetValue).toLocaleString()} {g.unit}</span>
                <span className="font-semibold">{g.progress.toFixed(0)}%</span>
              </div>
              <div className="bg-muted rounded-full h-2">
                <div className={`h-2 rounded-full transition-all ${g.status === 'achieved' ? 'bg-green-500' : 'bg-primary'}`}
                  style={{ width: `${Math.min(g.progress, 100)}%` }} />
              </div>
            </div>
            {g.dueDate && (
              <p className="text-xs text-muted-foreground">Due: {new Date(g.dueDate).toLocaleDateString()}</p>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Goal' : 'New Goal'}</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Reach $100k MRR"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Goal description"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['active', 'paused', 'cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Target Value *</label>
                <input value={form.targetValue} onChange={e => setForm({ ...form, targetValue: e.target.value })}
                  type="number" min="0" step="any" placeholder="100000"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Unit</label>
                <input value={form.unit} onChange={e => setForm({ ...form, unit: e.target.value })}
                  placeholder="$, %, users, etc."
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Due Date</label>
              <input value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.targetValue}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Goal'}
              </button>
            </div>
          </div>
        </div>
      )}

      {progressTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Update Progress</h2>
            <p className="text-sm text-muted-foreground">{progressTarget.title}</p>
            <div>
              <label className="text-sm font-medium block mb-1">Current Value</label>
              <input value={progressValue} onChange={e => setProgressValue(e.target.value)}
                type="number" min="0" step="any"
                placeholder={`Target: ${Number(progressTarget.targetValue).toLocaleString()} ${progressTarget.unit ?? ''}`}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setProgressTarget(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={updateProgress} disabled={saving || !progressValue}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Update'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
