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
          <h1 className="text-2xl font-bold text-gray-900">Form Builder</h1>
          <p className="text-sm text-gray-500 mt-1">Create embeddable lead capture forms</p>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Form
        </button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-white p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-900">Create Lead Form</h2>
          <p className="text-sm text-gray-500">A default contact form (name, email, phone) will be created. You can customize it later.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Form Name</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact Us Form" value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description (optional)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Get in touch with our team" value={formData.description} onChange={e => setFormData(f => ({ ...f, description: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={create} disabled={saving || !formData.name} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Form'}
            </button>
            <button onClick={() => setShowForm(false)} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-3 text-center py-12 text-gray-400">Loading...</div>
        ) : forms.length === 0 ? (
          <div className="col-span-3 text-center py-12 text-gray-400">No forms yet. Create your first lead capture form.</div>
        ) : forms.map(form => (
          <div key={form.id} className="rounded-xl border bg-white p-5 shadow-sm flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <FormInput className="h-4 w-4 text-blue-600" />
                <h3 className="font-semibold text-gray-900">{form.name}</h3>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${form.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                {form.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {form.description && <p className="text-sm text-gray-500">{form.description}</p>}
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span>{form.submissionCount} submissions</span>
              <span className="text-gray-300">·</span>
              <span>{new Date(form.createdAt).toLocaleDateString()}</span>
            </div>
            {form.embedCode && (
              <div className="rounded-lg bg-gray-50 p-3">
                <p className="text-xs text-gray-500 mb-1 font-medium">Embed Code</p>
                <code className="text-xs text-gray-700 break-all line-clamp-2">{form.embedCode}</code>
              </div>
            )}
            <div className="flex gap-2 pt-1">
              <a
                href={`/forms/${form.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
              >
                <Eye className="h-3.5 w-3.5" />
                Preview
              </a>
              <button
                onClick={() => copyEmbed(form)}
                className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-blue-700 border-blue-200 hover:bg-blue-50"
              >
                {copiedId === form.id ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                {copiedId === form.id ? 'Copied' : 'Copy Embed'}
              </button>
              <button onClick={() => deleteForm(form.id)} className="ml-auto text-gray-300 hover:text-red-500">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
