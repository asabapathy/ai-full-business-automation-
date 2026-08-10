'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Briefcase, Plus, Trash2, Edit2, CheckSquare, ChevronDown, ChevronRight, Circle, Clock } from 'lucide-react'

interface Task {
  id: string
  title: string
  status: string
  priority: string
  dueDate?: string
  assigneeName?: string
}

interface Project {
  id: string
  name: string
  description?: string
  status: string
  priority: string
  startDate?: string
  dueDate?: string
  budget?: string
  clientName?: string
  tasks?: Task[]
}

interface Stats { total: number; byStatus: Record<string, number>; tasksByStatus: Record<string, number> }

const STATUS_META: Record<string, { text: string; bg: string }> = {
  planning:    { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  active:      { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  on_hold:     { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  completed:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  cancelled:   { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  todo:        { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  in_progress: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  review:      { text: '#a78bfa', bg: 'rgba(167,139,250,0.12)' },
  done:        { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

const PRIORITY_COLORS: Record<string, string> = {
  low:    '#94a3b8',
  medium: '#fbbf24',
  high:   '#fb923c',
  urgent: '#f87171',
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ProjectsPage() {
  const [projects, setProjects] = useState<Project[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<Project | null>(null)
  const [showTask, setShowTask] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', dueDate: '', budget: '', clientName: '' })
  const [taskForm, setTaskForm] = useState({ title: '', status: 'todo', priority: 'medium', dueDate: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [pRes, sRes] = await Promise.all([
        apiClient.get<{ projects: Project[] }>('/projects'),
        apiClient.get<Stats>('/projects/stats'),
      ])
      setProjects(pRes.projects)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    try {
      const payload = {
        ...form,
        budget: form.budget ? parseFloat(form.budget) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        dueDate: form.dueDate ? new Date(form.dueDate).toISOString() : undefined,
        description: form.description || undefined,
        clientName: form.clientName || undefined,
      }
      if (editTarget) {
        await apiClient.put(`/projects/${editTarget.id}`, payload)
      } else {
        await apiClient.post('/projects', payload)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', dueDate: '', budget: '', clientName: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save project', 'error')
    } finally { setSaving(false) }
  }

  async function saveTask(projectId: string) {
    if (!taskForm.title) return
    setSaving(true)
    try {
      await apiClient.post(`/projects/${projectId}/tasks`, {
        ...taskForm,
        dueDate: taskForm.dueDate ? new Date(taskForm.dueDate).toISOString() : undefined,
      })
      setShowTask(null)
      setTaskForm({ title: '', status: 'todo', priority: 'medium', dueDate: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to add task', 'error')
    } finally { setSaving(false) }
  }

  async function updateTaskStatus(projectId: string, taskId: string, status: string) {
    await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, { status })
    load()
  }

  async function removeProject(id: string) {
    setDeletingId(id)
    setProjects(prev => prev.filter(p => p.id !== id))
    try {
      await apiClient.delete(`/projects/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete project', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function edit(p: Project) {
    setEditTarget(p)
    setForm({
      name: p.name,
      description: p.description ?? '',
      status: p.status,
      priority: p.priority,
      startDate: p.startDate ? p.startDate.split('T')[0] : '',
      dueDate: p.dueDate ? p.dueDate.split('T')[0] : '',
      budget: p.budget ?? '',
      clientName: p.clientName ?? '',
    })
    setShowCreate(true)
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage projects and tasks</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', dueDate: '', budget: '', clientName: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.byStatus).map(([status, count]) => {
            const sm = STATUS_META[status] ?? STATUS_META.planning
            return (
              <div key={status} className="rounded-xl p-3 text-center" style={cardStyle}>
                <p className="text-lg font-bold text-foreground">{count}</p>
                <p className="text-xs capitalize" style={{ color: sm.text }}>{status.replace('_', ' ')}</p>
              </div>
            )
          })}
        </div>
      )}

      <div {...anim(2)} className="kv-anim space-y-3">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No projects yet</p>
          </div>
        ) : projects.map(p => {
          const sm = STATUS_META[p.status] ?? STATUS_META.planning
          return (
            <div key={p.id} className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleExpand(p.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {expanded.has(p.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{p.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium capitalize" style={{ color: sm.text, background: sm.bg }}>
                      {p.status.replace('_', ' ')}
                    </span>
                    <Circle className="h-3 w-3" fill={PRIORITY_COLORS[p.priority] ?? '#94a3b8'} style={{ color: PRIORITY_COLORS[p.priority] ?? '#94a3b8' }} />
                  </div>
                  <div className="flex items-center gap-4 mt-1 flex-wrap">
                    {p.clientName && <p className="text-xs text-muted-foreground">{p.clientName}</p>}
                    {p.dueDate && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.dueDate).toLocaleDateString()}</p>}
                    {p.budget && <p className="text-xs text-muted-foreground">${Number(p.budget).toLocaleString()}</p>}
                    <p className="text-xs text-muted-foreground">{p.tasks?.length ?? 0} tasks</p>
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setShowTask(p.id); setTaskForm({ title: '', status: 'todo', priority: 'medium', dueDate: '' }) }}
                    className="px-2 py-1 rounded text-xs font-medium transition-colors"
                    style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
                    + Task
                  </button>
                  <button onClick={() => edit(p)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                  <button onClick={() => removeProject(p.id)} disabled={deletingId === p.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
              {expanded.has(p.id) && p.tasks && (
                <div style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  {p.tasks.length === 0 ? (
                    <p className="px-6 py-3 text-xs text-muted-foreground">No tasks yet</p>
                  ) : p.tasks.map(t => {
                    const tsm = STATUS_META[t.status] ?? STATUS_META.todo
                    return (
                      <div key={t.id} className="flex items-center gap-3 px-6 py-2.5 transition-colors hover:bg-muted/20" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                        <button onClick={() => updateTaskStatus(p.id, t.id, t.status === 'done' ? 'todo' : 'done')}
                          className="h-4 w-4 rounded border flex items-center justify-center shrink-0 transition-colors"
                          style={t.status === 'done'
                            ? { background: '#34d399', borderColor: '#34d399' }
                            : { borderColor: 'hsl(var(--muted-foreground))' }}>
                          {t.status === 'done' && <CheckSquare className="h-3 w-3 text-white" />}
                        </button>
                        <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{t.title}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded capitalize" style={{ color: tsm.text, background: tsm.bg }}>{t.status.replace('_', ' ')}</span>
                        {t.dueDate && <span className="text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Project' : 'New Project'}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Project name" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Project description"
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Start Date</label>
                <input value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  type="date" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  type="date" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Budget ($)</label>
                <input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Client</label>
                <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Client name" className={inputCls} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Add Task</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title *</label>
              <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title" className={inputCls} style={inputStyle} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
                <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  {['todo', 'in_progress', 'review', 'done'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Due Date</label>
              <input value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                type="date" className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTask(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={() => saveTask(showTask)} disabled={saving || !taskForm.title}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
