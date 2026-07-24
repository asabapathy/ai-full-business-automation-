'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { UserCheck, Plus, Trash2, CheckSquare, Square, ChevronDown, ChevronRight } from 'lucide-react'

interface OnboardingItem {
  id: string
  title: string
  description?: string
  isCompleted: boolean
  completedAt?: string
  order: number
}

interface Checklist {
  id: string
  name: string
  status: string
  contact?: { id: string; firstName: string; lastName: string; email?: string }
  items?: OnboardingItem[]
  createdAt: string
}

interface Stats { total: number; completed: number; inProgress: number; avgCompletion: number }

const STATUS_COLORS: Record<string, string> = {
  not_started: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  in_progress: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  completed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
}

export default function ClientOnboardingPage() {
  const [checklists, setChecklists] = useState<Checklist[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [showCreate, setShowCreate] = useState(false)
  const [addItemTarget, setAddItemTarget] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '' })
  const [itemForm, setItemForm] = useState({ title: '', description: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        apiClient.get<{ checklists: Checklist[] }>('/onboarding'),
        apiClient.get<Stats>('/onboarding/stats'),
      ])
      setChecklists(cRes.checklists)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name) return
    setSaving(true)
    try {
      await apiClient.post('/onboarding', { name: form.name })
      setShowCreate(false)
      setForm({ name: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function toggleItem(checklistId: string, itemId: string) {
    await apiClient.post(`/onboarding/${checklistId}/items/${itemId}/toggle`, {})
    load()
  }

  async function addItem(checklistId: string) {
    if (!itemForm.title) return
    setSaving(true)
    try {
      await apiClient.post(`/onboarding/${checklistId}/items`, {
        title: itemForm.title,
        description: itemForm.description || undefined,
      })
      setAddItemTarget(null)
      setItemForm({ title: '', description: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this checklist?')) return
    await apiClient.delete(`/onboarding/${id}`)
    load()
  }

  function toggleExpand(id: string) {
    setExpanded(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function completionPct(items?: OnboardingItem[]) {
    if (!items || items.length === 0) return 0
    return Math.round((items.filter(i => i.isCompleted).length / items.length) * 100)
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Client Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">Track client onboarding checklists</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Checklist
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'text-foreground' },
            { label: 'In Progress', value: stats.inProgress, color: 'text-blue-500' },
            { label: 'Completed', value: stats.completed, color: 'text-green-500' },
            { label: 'Avg Completion', value: `${stats.avgCompletion.toFixed(0)}%`, color: 'text-purple-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : checklists.length === 0 ? (
          <div className="py-12 text-center">
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No checklists yet</p>
          </div>
        ) : checklists.map(c => {
          const pct = completionPct(c.items)
          const isExpanded = expanded.has(c.id)
          return (
            <div key={c.id} className="bg-card border rounded-xl overflow-hidden">
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleExpand(c.id)} className="text-muted-foreground hover:text-foreground">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold">{c.name}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? ''}`}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  {c.contact && <p className="text-xs text-muted-foreground mt-0.5">{c.contact.firstName} {c.contact.lastName}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-48 bg-muted rounded-full h-1.5">
                      <div className={`h-1.5 rounded-full transition-all ${pct === 100 ? 'bg-green-500' : 'bg-primary'}`}
                        style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setAddItemTarget(c.id); setItemForm({ title: '', description: '' }) }}
                    className="px-2 py-1 rounded text-xs bg-primary/10 text-primary hover:bg-primary/20">+ Item</button>
                  <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-muted">
                    <Trash2 className="h-3.5 w-3.5 text-red-400" />
                  </button>
                </div>
              </div>
              {isExpanded && c.items && (
                <div className="border-t">
                  {c.items.length === 0 ? (
                    <p className="px-6 py-3 text-xs text-muted-foreground">No items</p>
                  ) : c.items.sort((a, b) => a.order - b.order).map(item => (
                    <div key={item.id} className="flex items-start gap-3 px-6 py-3 border-b last:border-0 hover:bg-muted/20">
                      <button onClick={() => toggleItem(c.id, item.id)} className="mt-0.5 shrink-0">
                        {item.isCompleted
                          ? <CheckSquare className="h-4 w-4 text-green-500" />
                          : <Square className="h-4 w-4 text-muted-foreground" />
                        }
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : ''}`}>{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        {item.completedAt && <p className="text-xs text-green-500 mt-0.5">Completed {new Date(item.completedAt).toLocaleDateString()}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">New Onboarding Checklist</h2>
            <p className="text-sm text-muted-foreground">A default set of onboarding items will be created automatically.</p>
            <div>
              <label className="text-sm font-medium block mb-1">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp Onboarding"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addItemTarget && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-sm space-y-4">
            <h2 className="text-lg font-bold">Add Item</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="Item title"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Description (optional)</label>
              <textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                rows={2} placeholder="Additional details"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddItemTarget(null)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={() => addItem(addItemTarget)} disabled={saving || !itemForm.title}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
