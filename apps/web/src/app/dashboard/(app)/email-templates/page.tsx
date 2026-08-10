'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { LayoutTemplate, Plus, Trash2, Edit2, Copy, Search, Eye } from 'lucide-react'

interface EmailTemplate {
  id: string
  name: string
  subject: string
  category?: string
  htmlContent: string
  variables: string[]
  isActive: boolean
  createdAt: string
}

interface Stats { total: number; active: number; byCategory: Record<string, number> }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const TEMPLATE_CATEGORIES = ['Welcome', 'Follow-up', 'Newsletter', 'Promotion', 'Transactional', 'Notification', 'Other']

export default function EmailTemplatesPage() {
  const [templates, setTemplates] = useState<EmailTemplate[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [categories, setCategories] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCat, setFilterCat] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [editTarget, setEditTarget] = useState<EmailTemplate | null>(null)
  const [preview, setPreview] = useState<EmailTemplate | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', category: '', htmlContent: '', variables: '' })
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [search, filterCat])

  async function load() {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (search) params.set('search', search)
      if (filterCat) params.set('category', filterCat)
      const [tRes, sRes, cRes] = await Promise.all([
        apiClient.get<{ templates: EmailTemplate[] }>(`/email-templates${params.size ? '?' + params : ''}`),
        apiClient.get<Stats>('/email-templates/stats'),
        apiClient.get<{ categories: string[] }>('/email-templates/categories'),
      ])
      setTemplates(tRes.templates)
      setStats(sRes)
      setCategories(cRes.categories)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.name || !form.subject || !form.htmlContent) return
    setSaving(true)
    try {
      const payload = {
        name: form.name,
        subject: form.subject,
        category: form.category || undefined,
        htmlContent: form.htmlContent,
        variables: form.variables ? form.variables.split(',').map(v => v.trim()).filter(Boolean) : [],
      }
      if (editTarget) {
        await apiClient.put(`/email-templates/${editTarget.id}`, payload)
      } else {
        await apiClient.post('/email-templates', payload)
      }
      setShowCreate(false)
      setEditTarget(null)
      setForm({ name: '', subject: '', category: '', htmlContent: '', variables: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save template', 'error')
    } finally { setSaving(false) }
  }

  async function duplicate(id: string) {
    try {
      await apiClient.post(`/email-templates/${id}/duplicate`, {})
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to duplicate', 'error')
    }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    try {
      await apiClient.delete(`/email-templates/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to archive template', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function edit(t: EmailTemplate) {
    setEditTarget(t)
    setForm({ name: t.name, subject: t.subject, category: t.category ?? '', htmlContent: t.htmlContent, variables: t.variables.join(', ') })
    setShowCreate(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable email templates for campaigns</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', subject: '', category: '', htmlContent: '', variables: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-3 gap-4">
          {[
            { label: 'Total', value: stats.total, color: 'hsl(var(--foreground))' },
            { label: 'Active', value: stats.active, color: '#34d399' },
            { label: 'Categories', value: Object.keys(stats.byCategory).length, color: 'hsl(var(--foreground))' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={inputStyle} />
        </div>
      </div>

      <div {...anim(3)} className="kv-anim flex gap-2 flex-wrap">
        {(['', ...categories]).map(c => {
          const active = filterCat === c
          return (
            <button key={c || 'all'} onClick={() => setFilterCat(c)}
              className="px-3 py-1.5 rounded-full text-sm font-medium transition-all"
              style={active
                ? { color: '#06b6d4', background: 'rgba(6,182,212,0.12)', border: '1px solid rgba(6,182,212,0.4)' }
                : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
              {c || 'All'}
            </button>
          )
        })}
      </div>

      <div {...anim(4)} className="kv-anim grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted-foreground">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No templates yet</p>
          </div>
        ) : templates.map(t => (
          <div key={t.id} className="rounded-xl p-4 space-y-3" style={cardStyle}>
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold text-foreground">{t.name}</p>
                {t.category && (
                  <span className="text-xs px-2 py-0.5 rounded mt-1 inline-block text-muted-foreground"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                    {t.category}
                  </span>
                )}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPreview(t)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Preview">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => edit(t)} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => duplicate(t.id)} className="p-1.5 rounded hover:bg-muted transition-colors" title="Duplicate">
                  <Copy className="h-3.5 w-3.5" style={{ color: '#60a5fa' }} />
                </button>
                <button onClick={() => remove(t.id)} disabled={deletingId === t.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                  <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">Subject: {t.subject}</p>
            {t.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.variables.map(v => (
                  <span key={v} className="text-xs px-1.5 py-0.5 rounded font-mono"
                    style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)' }}>
                    {`{{${v}}}`}
                  </span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{editTarget ? 'Edit Template' : 'New Template'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Welcome email template" className={inputCls} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subject Line *</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Welcome to {{company_name}}!" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className={inputCls} style={inputStyle}>
                  <option value="">Select…</option>
                  {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">Variables (comma-separated)</label>
                <input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })}
                  placeholder="first_name, company_name, link" className={inputCls} style={inputStyle} />
              </div>
              <div className="col-span-2">
                <label className="text-xs font-medium text-muted-foreground block mb-1.5">HTML Content *</label>
                <textarea value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                  rows={10} placeholder="<h1>Hello {{first_name}}</h1><p>…</p>"
                  className={`${inputCls} resize-none font-mono`} style={inputStyle} />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.subject || !form.htmlContent}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <div>
              <h2 className="text-lg font-bold text-foreground">{preview.name}</h2>
              <p className="text-sm text-muted-foreground">Subject: {preview.subject}</p>
            </div>
            <div className="rounded-xl overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
              <div className="px-3 py-2 text-xs text-muted-foreground" style={{ background: 'hsl(var(--muted))', borderBottom: '1px solid hsl(var(--border))' }}>HTML Preview</div>
              <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.htmlContent }} />
            </div>
            <button onClick={() => setPreview(null)} className="w-full py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
