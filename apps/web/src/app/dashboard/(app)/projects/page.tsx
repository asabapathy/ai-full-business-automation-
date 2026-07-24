'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
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

const STATUS_COLORS: Record<string, string> = {
  planning: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  active: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  on_hold: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  todo: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  review: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  done: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

const PRIORITY_COLORS: Record<string, string> = {
  low: 'text-gray-400',
  medium: 'text-yellow-500',
  high: 'text-orange-500',
  urgent: 'text-red-500',
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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function updateTaskStatus(projectId: string, taskId: string, status: string) {
    await apiClient.put(`/projects/${projectId}/tasks/${taskId}`, { status })
    load()
  }

  async function removeProject(id: string) {
    if (!confirm('Delete this project?')) return
    await apiClient.delete(`/projects/${id}`)
    load()
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Projects</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage projects and tasks</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', description: '', status: 'planning', priority: 'medium', startDate: '', dueDate: '', budget: '', clientName: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Project
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="bg-card border rounded-xl p-3 text-center">
              <p className="text-lg font-bold">{count}</p>
              <p className="text-xs text-muted-foreground capitalize">{status.replace('_', ' ')}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : projects.length === 0 ? (
          <div className="py-12 text-center">
            <Briefcase className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No projects yet</p>
          </div>
        ) : projects.map(p => (
          <div key={p.id} className="bg-card border rounded-xl overflow-hidden">
            <div className="flex items-center gap-3 p-4">
              <button onClick={() => toggleExpand(p.id)} className="text-muted-foreground hover:text-foreground">
                {expanded.has(p.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
              </button>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold">{p.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[p.status] ?? ''}`}>
                    {p.status.replace('_', ' ')}
                  </span>
                  <Circle className={`h-3 w-3 ${PRIORITY_COLORS[p.priority] ?? ''}`} fill="currentColor" />
                </div>
                <div className="flex items-center gap-4 mt-1">
                  {p.clientName && <p className="text-xs text-muted-foreground">{p.clientName}</p>}
                  {p.dueDate && <p className="text-xs text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" />{new Date(p.dueDate).toLocaleDateString()}</p>}
                  {p.budget && <p className="text-xs text-muted-foreground">${Number(p.budget).toLocaleString()}</p>}
                  <p className="text-xs text-muted-foreground">{p.tasks?.length ?? 0} tasks</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => { setShowTask(p.id); setTaskForm({ title: '', status: 'todo', priority: 'medium', dueDate: '' }) }}
                  className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">+ Task</button>
                <button onClick={() => edit(p)} className="p-1.5 rounded hover:bg-muted">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => removeProject(p.id)} className="p-1.5 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
            {expanded.has(p.id) && p.tasks && (
              <div className="border-t">
                {p.tasks.length === 0 ? (
                  <p className="px-6 py-3 text-xs text-muted-foreground">No tasks yet</p>
                ) : p.tasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 px-6 py-2.5 border-b last:border-0 hover:bg-muted/20">
                    <button onClick={() => updateTaskStatus(p.id, t.id, t.status === 'done' ? 'todo' : 'done')}
                      className={`h-4 w-4 rounded border flex items-center justify-center shrink-0 ${t.status === 'done' ? 'bg-green-500 border-green-500' : 'border-muted-foreground'}`}>
                      {t.status === 'done' && <CheckSquare className="h-3 w-3 text-white" />}
                    </button>
                    <span className={`flex-1 text-sm ${t.status === 'done' ? 'line-through text-muted-foreground' : ''}`}>{t.title}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_COLORS[t.status] ?? ''}`}>{t.status.replace('_', ' ')}</span>
                    {t.dueDate && <span className="text-xs text-muted-foreground">{new Date(t.dueDate).toLocaleDateString()}</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Project' : 'New Project'}</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Project name"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description</label>
              <textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                rows={2} placeholder="Project description"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['planning', 'active', 'on_hold', 'completed', 'cancelled'].map(s => (
                    <option key={s} value={s}>{s.replace('_', ' ')}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Priority</label>
                <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Start Date</label>
                <input value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Due Date</label>
                <input value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Budget ($)</label>
                <input value={form.budget} onChange={e => setForm({ ...form, budget: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Client</label>
                <input value={form.clientName} onChange={e => setForm({ ...form, clientName: e.target.value })}
                  placeholder="Client name"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showTask && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Add Task</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })}
                placeholder="Task title"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Status</label>
                <select value={taskForm.status} onChange={e => setTaskForm({ ...taskForm, status: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['todo', 'in_progress', 'review', 'done'].map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Priority</label>
                <select value={taskForm.priority} onChange={e => setTaskForm({ ...taskForm, priority: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  {['low', 'medium', 'high', 'urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Due Date</label>
              <input value={taskForm.dueDate} onChange={e => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                type="date"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowTask(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => saveTask(showTask)} disabled={saving || !taskForm.title}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
