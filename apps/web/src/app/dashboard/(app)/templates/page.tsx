'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, Pencil, Trash2, X, Search, Copy, Eye, Code } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface EmailTemplate {
  id: string
  name: string
  category: 'sales' | 'billing' | 'scheduling' | 'retention'
  subject: string
  body: string
  usedCount: number
  updatedAt: string
}

const CATEGORIES: { key: EmailTemplate['category']; label: string; color: string }[] = [
  { key: 'sales', label: 'Sales', color: '#06b6d4' },
  { key: 'billing', label: 'Billing', color: '#34d399' },
  { key: 'scheduling', label: 'Scheduling', color: '#a78bfa' },
  { key: 'retention', label: 'Retention', color: '#fbbf24' },
]

const CATEGORY_COLOR: Record<EmailTemplate['category'], string> = {
  sales: '#06b6d4',
  billing: '#34d399',
  scheduling: '#a78bfa',
  retention: '#fbbf24',
}

const PLACEHOLDERS = ['{{name}}', '{{amount}}', '{{date}}', '{{business}}']

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (isNaN(then)) return ''
  const diff = Date.now() - then
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}d ago`
  const months = Math.floor(days / 30)
  return `${months}mo ago`
}

const daysAgo = (n: number) => new Date(Date.now() - n * 86400000).toISOString()

const DEMO_TEMPLATES: EmailTemplate[] = [
  {
    id: 't1',
    name: 'Welcome new client',
    category: 'sales',
    subject: 'Welcome aboard, {{name}}!',
    body: 'Hi {{name}},\n\nWelcome to {{business}} — we\'re thrilled to have you. Your account is all set up and ready to go.\n\nIf you have any questions, just reply to this email and we\'ll get right back to you.\n\nThe {{business}} Team',
    usedCount: 142,
    updatedAt: daysAgo(2),
  },
  {
    id: 't2',
    name: 'Quote follow-up',
    category: 'sales',
    subject: 'Your quote from {{business}} — any questions?',
    body: 'Hi {{name}},\n\nJust checking in on the quote we sent over for {{amount}}. Happy to walk through any line items or adjust the scope.\n\nWe can lock in this pricing until {{date}} — after that, materials costs may shift.\n\nBest,\n{{business}}',
    usedCount: 87,
    updatedAt: daysAgo(5),
  },
  {
    id: 't3',
    name: 'Invoice reminder',
    category: 'billing',
    subject: 'Friendly reminder: invoice for {{amount}} due {{date}}',
    body: 'Hi {{name}},\n\nThis is a quick reminder that your invoice for {{amount}} is due on {{date}}.\n\nYou can pay online using the secure link in your invoice email.\n\nThanks,\n{{business}}',
    usedCount: 203,
    updatedAt: daysAgo(1),
  },
  {
    id: 't4',
    name: 'Payment received thank-you',
    category: 'billing',
    subject: 'Payment received — thank you!',
    body: 'Hi {{name}},\n\nWe\'ve received your payment of {{amount}} — thank you!\n\nYour receipt is attached, and your account is fully up to date.\n\nWe appreciate your business,\n{{business}}',
    usedCount: 178,
    updatedAt: daysAgo(3),
  },
  {
    id: 't5',
    name: 'Appointment confirmation',
    category: 'scheduling',
    subject: 'Confirmed: your appointment on {{date}}',
    body: 'Hi {{name}},\n\nYour appointment with {{business}} is confirmed for {{date}}.\n\nPlease make sure someone is available at the property. Need to make a change? Just reply to this email.\n\nSee you soon,\n{{business}}',
    usedCount: 251,
    updatedAt: daysAgo(4),
  },
  {
    id: 't6',
    name: 'Reschedule notice',
    category: 'scheduling',
    subject: 'We need to reschedule your appointment',
    body: 'Hi {{name}},\n\nWe\'re sorry — we need to reschedule your upcoming appointment. The next available slot is {{date}}.\n\nDoes that work for you? Reply and we\'ll get it locked in, or suggest another time that suits you better.\n\nApologies for the inconvenience,\n{{business}}',
    usedCount: 34,
    updatedAt: daysAgo(11),
  },
  {
    id: 't7',
    name: 'Win-back "we miss you"',
    category: 'retention',
    subject: 'We miss you, {{name}} — here\'s 15% off',
    body: 'Hi {{name}},\n\nIt\'s been a while since your last visit, and we\'d love to see you again.\n\nBook before {{date}} and we\'ll take 15% off your next service — no strings attached.\n\nHope to hear from you,\n{{business}}',
    usedCount: 56,
    updatedAt: daysAgo(8),
  },
  {
    id: 't8',
    name: 'Review request',
    category: 'retention',
    subject: 'How did we do, {{name}}?',
    body: 'Hi {{name}},\n\nThanks for choosing {{business}}! We hope everything went smoothly.\n\nIf you have 30 seconds, a quick review would mean the world to us — it helps other folks find us too.\n\nThanks so much,\n{{business}}',
    usedCount: 119,
    updatedAt: daysAgo(6),
  },
]

const SAMPLE_VALUES: Record<string, string> = {
  '{{name}}': 'Alex',
  '{{amount}}': '$1,250',
  '{{date}}': new Date(Date.now() + 86400000).toLocaleDateString('en-US', { month: 'long', day: 'numeric' }),
  '{{business}}': 'Your Business',
}

function renderPreview(text: string) {
  const parts = text.split(/(\{\{name\}\}|\{\{amount\}\}|\{\{date\}\}|\{\{business\}\})/g)
  return parts.map((part, i) =>
    SAMPLE_VALUES[part] !== undefined
      ? <span key={i} style={{ color: '#06b6d4' }}>{SAMPLE_VALUES[part]}</span>
      : <span key={i}>{part}</span>
  )
}

const emptyForm = { name: '', category: 'sales' as EmailTemplate['category'], subject: '', body: '' }

export default function TemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>(DEMO_TEMPLATES)
  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<EmailTemplate['category'] | 'all'>('all')
  const [showModal, setShowModal] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState(emptyForm)
  const [previewMode, setPreviewMode] = useState(false)

  useEffect(() => {
    apiClient.get('/email-templates')
      .then((res: any) => { const list = res?.templates ?? res; if (Array.isArray(list) && list.length) setTemplates(list) })
      .catch(() => {})
  }, [])

  const filtered = templates.filter(t => {
    if (categoryFilter !== 'all' && t.category !== categoryFilter) return false
    const q = search.toLowerCase()
    return t.name.toLowerCase().includes(q) || t.subject.toLowerCase().includes(q)
  })

  const openAdd = () => {
    setEditingId(null)
    setForm(emptyForm)
    setPreviewMode(false)
    setShowModal(true)
  }

  const openEdit = (t: EmailTemplate) => {
    setEditingId(t.id)
    setForm({ name: t.name, category: t.category, subject: t.subject, body: t.body })
    setPreviewMode(false)
    setShowModal(true)
  }

  const handleCopy = async (t: EmailTemplate) => {
    try {
      await navigator.clipboard.writeText(t.body)
    } catch {
      // Clipboard unavailable: ignore
    }
    toast('Template copied', 'success')
  }

  const handleSave = async () => {
    if (!form.name.trim() || !form.subject.trim() || !form.body.trim()) {
      toast('Enter a name, subject and body', 'error')
      return
    }
    const now = new Date().toISOString()
    if (editingId) {
      setTemplates(prev => prev.map(t => t.id === editingId
        ? { ...t, name: form.name.trim(), category: form.category, subject: form.subject.trim(), body: form.body, updatedAt: now }
        : t
      ))
      try {
        await apiClient.put(`/email-templates/${editingId}`, { name: form.name.trim(), category: form.category, subject: form.subject.trim(), body: form.body })
      } catch {
        // Demo mode: keep local state
      }
      toast('Template updated', 'success')
    } else {
      const template: EmailTemplate = {
        id: `t${Date.now()}`,
        name: form.name.trim(),
        category: form.category,
        subject: form.subject.trim(),
        body: form.body,
        usedCount: 0,
        updatedAt: now,
      }
      setTemplates(prev => [template, ...prev])
      try {
        await apiClient.post('/email-templates', template)
      } catch {
        // Demo mode: keep local state
      }
      toast('Template created', 'success')
    }
    setShowModal(false)
    setEditingId(null)
    setForm(emptyForm)
  }

  const handleDelete = async (t: EmailTemplate) => {
    setTemplates(prev => prev.filter(x => x.id !== t.id))
    try {
      await apiClient.delete(`/email-templates/${t.id}`)
    } catch {
      // Demo mode: keep local state
    }
    toast('Template deleted', 'success')
  }

  const insertPlaceholder = (ph: string) => {
    setForm(f => ({ ...f, body: f.body ? `${f.body}${f.body.endsWith(' ') || f.body.endsWith('\n') ? '' : ' '}${ph}` : ph }))
  }

  const catMeta = (key: EmailTemplate['category']) => CATEGORIES.find(c => c.key === key)!

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Reusable emails with smart placeholders</p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Template
        </button>
      </div>

      {/* Filters */}
      <div {...anim(1)} className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
            style={categoryFilter === 'all'
              ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.4)' }
              : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
            }
          >
            All
          </button>
          {CATEGORIES.map(c => {
            const active = categoryFilter === c.key
            return (
              <button
                key={c.key}
                onClick={() => setCategoryFilter(active ? 'all' : c.key)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                style={active
                  ? { background: `${c.color}1f`, color: c.color, border: `1px solid ${c.color}66` }
                  : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                }
              >
                {c.label}
              </button>
            )
          })}
        </div>
        <div className="relative max-w-sm flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={inputCls + ' pl-9'}
            style={inputStyle}
            placeholder="Search templates…"
          />
        </div>
      </div>

      {/* Template grid */}
      {filtered.length === 0 ? (
        <div {...anim(2)} className="rounded-xl px-5 py-12 text-center" style={cardStyle}>
          <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-40" />
          <p className="text-sm text-muted-foreground">No templates match your search</p>
        </div>
      ) : (
        <div {...anim(2)} className="grid sm:grid-cols-2 gap-4">
          {filtered.map(t => {
            const color = CATEGORY_COLOR[t.category]
            return (
              <div key={t.id} className="group rounded-xl p-5 flex flex-col" style={cardStyle}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide"
                    style={{ background: `${color}1f`, color }}
                  >
                    {catMeta(t.category).label}
                  </span>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <button
                      onClick={() => handleCopy(t)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                      title="Copy body"
                    >
                      <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => openEdit(t)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                      title="Edit template"
                    >
                      <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                    </button>
                    <button
                      onClick={() => handleDelete(t)}
                      className="p-1.5 rounded-lg transition-colors hover:bg-accent"
                      title="Delete template"
                    >
                      <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                    </button>
                  </div>
                </div>
                <p className="font-semibold text-foreground text-sm">{t.name}</p>
                <p className="text-xs text-muted-foreground italic mt-0.5 truncate">Subj: {t.subject}</p>
                <p className="text-xs text-muted-foreground line-clamp-3 mt-2 whitespace-pre-line">{t.body}</p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-3 text-xs text-muted-foreground">
                  <span>Used {t.usedCount}&times;</span>
                  <span>Updated {relativeTime(t.updatedAt)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Editor modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{editingId ? 'Edit Template' : 'New Template'}</h2>
              <button onClick={() => setShowModal(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Name *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. Invoice reminder"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Category</label>
              <div className="flex items-center gap-2 flex-wrap">
                {CATEGORIES.map(c => {
                  const active = form.category === c.key
                  return (
                    <button
                      key={c.key}
                      onClick={() => setForm(f => ({ ...f, category: c.key }))}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-colors"
                      style={active
                        ? { background: `${c.color}1f`, color: c.color, border: `1px solid ${c.color}66` }
                        : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                      }
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Subject *</label>
              <input
                value={form.subject}
                onChange={e => setForm(f => ({ ...f, subject: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="e.g. Your invoice for {{amount}} is due {{date}}"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Body *</label>
                <div className="flex items-center gap-1 rounded-lg p-0.5" style={{ background: 'hsl(var(--muted))' }}>
                  <button
                    onClick={() => setPreviewMode(false)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={!previewMode
                      ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }
                      : { color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    <Code className="h-3 w-3" /> Edit
                  </button>
                  <button
                    onClick={() => setPreviewMode(true)}
                    className="flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-medium transition-colors"
                    style={previewMode
                      ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }
                      : { color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    <Eye className="h-3 w-3" /> Preview
                  </button>
                </div>
              </div>
              {previewMode ? (
                <div className={inputCls + ' whitespace-pre-line min-h-[176px]'} style={inputStyle}>
                  {form.body.trim() ? renderPreview(form.body) : <span className="text-muted-foreground">Nothing to preview yet</span>}
                </div>
              ) : (
                <textarea
                  value={form.body}
                  onChange={e => setForm(f => ({ ...f, body: e.target.value }))}
                  className={inputCls + ' resize-none font-mono text-[13px] leading-relaxed'}
                  style={inputStyle}
                  rows={8}
                  placeholder={'Hi {{name}},\n\nWrite your email here…'}
                />
              )}
              {!previewMode && (
                <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                  {PLACEHOLDERS.map(ph => (
                    <button
                      key={ph}
                      onClick={() => insertPlaceholder(ph)}
                      className="px-2 py-1 rounded-md text-[11px] font-mono transition-colors hover:bg-accent"
                      style={{ background: 'rgba(6,182,212,0.08)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.25)' }}
                    >
                      {ph}
                    </button>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground mt-2">Placeholders fill automatically when sending</p>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
              >
                {editingId ? 'Save Changes' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
