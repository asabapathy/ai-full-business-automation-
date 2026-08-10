'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
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

const STATUS_META: Record<string, { text: string; bg: string }> = {
  not_started: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  in_progress: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  completed:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    } catch (e: any) {
      toast(e.message || 'Failed to create checklist', 'error')
    } finally { setSaving(false) }
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
    } catch (e: any) {
      toast(e.message || 'Failed to add item', 'error')
    } finally { setSaving(false) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setChecklists(prev => prev.filter(c => c.id !== id))
    try {
      await apiClient.delete(`/onboarding/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete checklist', 'error')
      load()
    } finally { setDeletingId(null) }
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
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Client Onboarding</h1>
          <p className="text-muted-foreground text-sm mt-1">Track client onboarding checklists</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Checklist
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'hsl(var(--foreground))' },
            { label: 'In Progress', value: stats.inProgress, color: '#60a5fa' },
            { label: 'Completed', value: stats.completed, color: '#34d399' },
            { label: 'Avg Completion', value: `${stats.avgCompletion.toFixed(0)}%`, color: '#a78bfa' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim space-y-3">
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
          const sm = STATUS_META[c.status] ?? STATUS_META.not_started
          return (
            <div key={c.id} className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="flex items-center gap-3 p-4">
                <button onClick={() => toggleExpand(c.id)} className="text-muted-foreground hover:text-foreground transition-colors">
                  {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-foreground">{c.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: sm.text, background: sm.bg }}>
                      {c.status.replace('_', ' ')}
                    </span>
                  </div>
                  {c.contact && <p className="text-xs text-muted-foreground mt-0.5">{c.contact.firstName} {c.contact.lastName}</p>}
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 max-w-48 rounded-full h-1.5" style={{ background: 'hsl(var(--background))' }}>
                      <div className="h-1.5 rounded-full transition-all"
                        style={{ width: `${pct}%`, background: pct === 100 ? '#34d399' : 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }} />
                    </div>
                    <span className="text-xs text-muted-foreground">{pct}%</span>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => { setAddItemTarget(c.id); setItemForm({ title: '', description: '' }) }}
                    className="px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                    style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
                    + Item
                  </button>
                  <button onClick={() => remove(c.id)} disabled={deletingId === c.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
              {isExpanded && c.items && (
                <div style={{ borderTop: '1px solid hsl(var(--border))' }}>
                  {c.items.length === 0 ? (
                    <p className="px-6 py-3 text-xs text-muted-foreground">No items</p>
                  ) : c.items.sort((a, b) => a.order - b.order).map((item, idx) => (
                    <div key={item.id} className="flex items-start gap-3 px-6 py-3"
                      style={{ borderBottom: idx < (c.items?.length ?? 0) - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                      <button onClick={() => toggleItem(c.id, item.id)} className="mt-0.5 shrink-0">
                        {item.isCompleted
                          ? <CheckSquare className="h-4 w-4" style={{ color: '#34d399' }} />
                          : <Square className="h-4 w-4 text-muted-foreground" />
                        }
                      </button>
                      <div className="flex-1">
                        <p className={`text-sm ${item.isCompleted ? 'line-through text-muted-foreground' : 'text-foreground'}`}>{item.title}</p>
                        {item.description && <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>}
                        {item.completedAt && <p className="text-xs mt-0.5" style={{ color: '#34d399' }}>Completed {new Date(item.completedAt).toLocaleDateString()}</p>}
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">New Onboarding Checklist</h2>
            <p className="text-sm text-muted-foreground">A default set of onboarding items will be created automatically.</p>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="Acme Corp Onboarding" className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Creating…' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {addItemTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Add Item</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title *</label>
              <input value={itemForm.title} onChange={e => setItemForm({ ...itemForm, title: e.target.value })}
                placeholder="Item title" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description (optional)</label>
              <textarea value={itemForm.description} onChange={e => setItemForm({ ...itemForm, description: e.target.value })}
                rows={2} placeholder="Additional details"
                className={`${inputCls} resize-none`} style={inputStyle} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setAddItemTarget(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={() => addItem(addItemTarget)} disabled={saving || !itemForm.title}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Adding…' : 'Add Item'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
