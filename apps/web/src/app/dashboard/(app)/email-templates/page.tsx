'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function duplicate(id: string) {
    await apiClient.post(`/email-templates/${id}/duplicate`, {})
    load()
  }

  async function remove(id: string) {
    if (!confirm('Archive this template?')) return
    await apiClient.delete(`/email-templates/${id}`)
    load()
  }

  function edit(t: EmailTemplate) {
    setEditTarget(t)
    setForm({
      name: t.name,
      subject: t.subject,
      category: t.category ?? '',
      htmlContent: t.htmlContent,
      variables: t.variables.join(', '),
    })
    setShowCreate(true)
  }

  const TEMPLATE_CATEGORIES = ['Welcome', 'Follow-up', 'Newsletter', 'Promotion', 'Transactional', 'Notification', 'Other']

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Templates</h1>
          <p className="text-muted-foreground text-sm mt-1">Reusable email templates for campaigns</p>
        </div>
        <button onClick={() => { setEditTarget(null); setForm({ name: '', subject: '', category: '', htmlContent: '', variables: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Template
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Active</p>
            <p className="text-2xl font-bold text-green-500">{stats.active}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Categories</p>
            <p className="text-2xl font-bold">{Object.keys(stats.byCategory).length}</p>
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search templates…"
            className="w-full pl-9 pr-4 py-2.5 border rounded-xl text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
        </div>
      </div>

      <div className="flex gap-2 flex-wrap">
        <button onClick={() => setFilterCat('')}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium ${!filterCat ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
          All
        </button>
        {categories.map(c => (
          <button key={c} onClick={() => setFilterCat(c)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium ${filterCat === c ? 'bg-primary text-primary-foreground' : 'bg-muted hover:bg-muted/80'}`}>
            {c}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 py-8 text-center text-muted-foreground">Loading…</div>
        ) : templates.length === 0 ? (
          <div className="col-span-3 py-12 text-center">
            <LayoutTemplate className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No templates yet</p>
          </div>
        ) : templates.map(t => (
          <div key={t.id} className="bg-card border rounded-xl p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <p className="font-semibold">{t.name}</p>
                {t.category && <span className="text-xs bg-muted px-2 py-0.5 rounded mt-1 inline-block">{t.category}</span>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setPreview(t)} className="p-1.5 rounded hover:bg-muted" title="Preview">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => edit(t)} className="p-1.5 rounded hover:bg-muted">
                  <Edit2 className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
                <button onClick={() => duplicate(t.id)} className="p-1.5 rounded hover:bg-muted" title="Duplicate">
                  <Copy className="h-3.5 w-3.5 text-blue-400" />
                </button>
                <button onClick={() => remove(t.id)} className="p-1.5 rounded hover:bg-muted">
                  <Trash2 className="h-3.5 w-3.5 text-red-400" />
                </button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground truncate">Subject: {t.subject}</p>
            {t.variables.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {t.variables.map(v => (
                  <span key={v} className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">{`{{${v}}}`}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">{editTarget ? 'Edit Template' : 'New Template'}</h2>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Name *</label>
                <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                  placeholder="Welcome email template"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">Subject Line *</label>
                <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                  placeholder="Welcome to {{company_name}}!"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Category</label>
                <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary">
                  <option value="">Select…</option>
                  {TEMPLATE_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Variables (comma-separated)</label>
                <input value={form.variables} onChange={e => setForm({ ...form, variables: e.target.value })}
                  placeholder="first_name, company_name, link"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div className="col-span-2">
                <label className="text-sm font-medium block mb-1">HTML Content *</label>
                <textarea value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                  rows={10} placeholder="<h1>Hello {{first_name}}</h1><p>…</p>"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.name || !form.subject || !form.htmlContent}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : editTarget ? 'Update' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div>
              <h2 className="text-lg font-bold">{preview.name}</h2>
              <p className="text-sm text-muted-foreground">Subject: {preview.subject}</p>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <div className="bg-muted/30 px-3 py-2 text-xs text-muted-foreground border-b">HTML Preview</div>
              <div className="p-4 prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: preview.htmlContent }} />
            </div>
            <button onClick={() => setPreview(null)} className="w-full border rounded-lg py-2 text-sm hover:bg-muted">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
