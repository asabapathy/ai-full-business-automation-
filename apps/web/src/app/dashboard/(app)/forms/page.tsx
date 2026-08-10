'use client'

import { useState, useEffect } from 'react'
import { FormInput, Plus, Copy, Check, Trash2, Eye } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface LeadForm {
  id: string
  name: string
  description?: string
  isActive: boolean
  embedCode?: string
  submissionCount: number
  _count?: { submissions: number }
  createdAt: string
}

export default function FormsPage() {
  const [forms, setForms] = useState<LeadForm[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({ name: '', description: '' })
  const [saving, setSaving] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/forms') as any
      setForms(res.forms ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    setSaving(true)
    try {
      await apiClient.post('/forms', {
        name: formData.name,
        description: formData.description,
        fields: [
          { id: 'firstName', type: 'text', label: 'First Name', required: true, mapTo: 'firstName' },
          { id: 'lastName', type: 'text', label: 'Last Name', mapTo: 'lastName' },
          { id: 'email', type: 'email', label: 'Email', required: true, mapTo: 'email' },
          { id: 'phone', type: 'phone', label: 'Phone', mapTo: 'phone' },
        ],
        settings: { submitLabel: 'Submit', successMessage: 'Thank you! We\'ll be in touch soon.' },
      })
      setShowForm(false)
      setFormData({ name: '', description: '' })
      load()
    } catch {}
    setSaving(false)
  }

  const deleteForm = async (id: string) => {
    try {
      await apiClient.delete(`/forms/${id}`)
      load()
    } catch {}
  }

  const copyEmbed = (form: LeadForm) => {
    if (!form.embedCode) return
    navigator.clipboard.writeText(form.embedCode)
    setCopiedId(form.id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Form Builder</h1>
          <p className="text-sm text-muted-foreground mt-1">Create embeddable lead capture forms</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
        >
          <Plus className="h-4 w-4" />
          New Form
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          <h2 className="font-semibold text-foreground">Create Lead Form</h2>
          <p className="text-sm text-muted-foreground">A default contact form (name, email, phone) will be created. You can customize it later.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Form Name</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Contact Us Form"
                value={formData.name}
                onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Description (optional)</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Get in touch with our team"
                value={formData.description}
                onChange={e => setFormData(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={create}
              disabled={saving || !formData.name}
              className="rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
            >
              {saving ? 'Creating...' : 'Create Form'}
            </button>
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">Loading...</div>
        ) : forms.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-muted-foreground">No forms yet. Create your first lead capture form.</div>
        ) : forms.map(form => (
          <div key={form.id} className="rounded-xl flex flex-col gap-3 p-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FormInput className="h-4 w-4" style={{ color: '#06b6d4' }} />
                <h3 className="font-semibold text-foreground">{form.name}</h3>
              </div>
              <span
                className="rounded-full px-2 py-0.5 text-xs font-medium"
                style={form.isActive
                  ? { background: 'rgba(52,211,153,0.1)', color: '#34d399' }
                  : { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }}
              >
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {form.description && <p className="text-sm text-muted-foreground">{form.description}</p>}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <span>{form.submissionCount} submissions</span>
              <span className="text-muted-foreground/40">·</span>
              <span>{new Date(form.createdAt).toLocaleDateString()}</span>
            </div>
            {form.embedCode && (
              <div className="rounded-lg p-3" style={{ background: 'hsl(var(--muted))' }}>
                <p className="text-xs text-muted-foreground mb-1 font-medium">Embed Code</p>
                <code className="text-xs text-muted-foreground break-all line-clamp-2">{form.embedCode}</code>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <a
                href={`/forms/${form.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-muted-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </a>
              <button
                onClick={() => copyEmbed(form)}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium"
                style={{ border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}
              >
                {copiedId === form.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === form.id ? 'Copied' : 'Copy Embed'}
              </button>
              <button onClick={() => deleteForm(form.id)} className="ml-auto text-muted-foreground/40">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
