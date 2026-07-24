'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Send, Trash2, Eye, ChevronRight } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface IntakeField {
  name: string
  label: string
  type: string
  required?: boolean
  options?: string[]
}

interface IntakeForm {
  id: string
  name: string
  description?: string
  fields: IntakeField[]
  isActive: boolean
  createdAt: string
}

interface IntakeSubmission {
  id: string
  contactId?: string
  contact?: { firstName: string; lastName: string; email: string }
  appointmentId?: string
  data: Record<string, any>
  completedAt?: string
  createdAt: string
}

export default function IntakePage() {
  const [forms, setForms] = useState<IntakeForm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<IntakeForm | null>(null)
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
  const [tab, setTab] = useState<'forms' | 'submissions'>('forms')
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState<string | null>(null)
  const [preview, setPreview] = useState<IntakeForm | null>(null)
  const [form, setForm] = useState({ name: '', description: '', fields: '[]' })
  const [sendForm, setSendForm] = useState({ contactId: '', appointmentId: '' })

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/intake') as any
      setForms(res?.forms ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadSubmissions = async (id: string) => {
    try {
      const res = await apiClient.get(`/intake/${id}/submissions`) as any
      setSubmissions(res?.submissions ?? [])
    } catch {}
  }

  const selectForm = (f: IntakeForm) => {
    setSelected(f)
    loadSubmissions(f.id)
    setTab('submissions')
  }

  const create = async () => {
    if (!form.name) return
    try {
      let fields: IntakeField[] = []
      try { fields = JSON.parse(form.fields) } catch {}
      await apiClient.post('/intake', { ...form, fields })
      setShowCreate(false)
      setForm({ name: '', description: '', fields: '[]' })
      load()
    } catch {}
  }

  const send = async () => {
    if (!showSend || !sendForm.contactId) return
    try {
      await apiClient.post(`/intake/${showSend}/send`, sendForm)
      alert('Intake form sent!')
      setShowSend(null)
      setSendForm({ contactId: '', appointmentId: '' })
    } catch {}
  }

  const deleteForm = async (id: string) => {
    if (!confirm('Delete this intake form?')) return
    try {
      await apiClient.delete(`/intake/${id}`)
      if (selected?.id === id) setSelected(null)
      load()
    } catch {}
  }

  const defaultFields: IntakeField[] = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'allergies', label: 'Known Allergies', type: 'textarea' },
    { name: 'medications', label: 'Current Medications', type: 'textarea' },
    { name: 'reasonForVisit', label: 'Reason for Visit', type: 'textarea', required: true },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Intake Forms</h1>
          <p className="text-sm text-gray-500 mt-1">Collect pre-appointment information from clients</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Form
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form list */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-700">Forms</h2>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : forms.length === 0 ? (
            <div className="rounded-xl border bg-white p-6 text-center text-gray-400 text-sm">No forms yet</div>
          ) : forms.map(f => (
            <div key={f.id} onClick={() => selectForm(f)} className={`rounded-xl border bg-white p-4 shadow-sm cursor-pointer transition-all hover:border-blue-200 ${selected?.id === f.id ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{f.name}</p>
                  {f.description && <p className="text-xs text-gray-500 truncate mt-0.5">{f.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">{f.fields.length} fields</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); setPreview(f) }} className="text-gray-400 hover:text-blue-600 p-1">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setShowSend(f.id) }} className="text-gray-400 hover:text-green-600 p-1">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteForm(f.id) }} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
              <div className="mt-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${f.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {f.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Submissions */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-400 h-full flex items-center justify-center">
              Select a form to view submissions
            </div>
          ) : (
            <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
              <div className="p-4 border-b flex items-center justify-between">
                <h2 className="font-semibold text-gray-900">Submissions — {selected.name}</h2>
                <button onClick={() => setShowSend(selected.id)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
                  <Send className="h-3.5 w-3.5" />
                  Send Form
                </button>
              </div>
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-gray-400">No submissions yet</div>
              ) : (
                <div className="divide-y">
                  {submissions.map(s => (
                    <div key={s.id} className="p-4 hover:bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          {s.contact ? (
                            <><p className="font-medium text-gray-900">{s.contact.firstName} {s.contact.lastName}</p><p className="text-xs text-gray-500">{s.contact.email}</p></>
                          ) : <p className="text-sm text-gray-500">Anonymous</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-gray-400">{new Date(s.createdAt).toLocaleDateString()}</p>
                          {s.completedAt && <p className="text-xs text-green-600">Completed</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(s.data).map(([key, val]) => (
                          <div key={key} className="rounded-lg bg-gray-50 p-2">
                            <p className="text-xs font-medium text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm text-gray-800 truncate">{String(val)}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900">New Intake Form</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Form Name</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="New Patient Intake" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-medium text-gray-700">Fields (JSON)</label>
                <button onClick={() => setForm(f => ({ ...f, fields: JSON.stringify(defaultFields, null, 2) }))} className="text-xs text-blue-600 hover:underline">
                  Use default medical intake
                </button>
              </div>
              <textarea rows={10} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono resize-none" placeholder='[{"name":"fullName","label":"Full Name","type":"text","required":true}]' value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={create} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Form</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Send Intake Form</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={sendForm.contactId} onChange={e => setSendForm(f => ({ ...f, contactId: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Appointment ID (optional)</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Appointment UUID" value={sendForm.appointmentId} onChange={e => setSendForm(f => ({ ...f, appointmentId: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSend(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={send} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            {preview.description && <p className="text-sm text-gray-500">{preview.description}</p>}
            <div className="space-y-3">
              {preview.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {field.label} {field.required && <span className="text-red-500">*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea rows={2} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none bg-gray-50" disabled placeholder="Patient enters response..." />
                  ) : field.type === 'select' ? (
                    <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50" disabled>
                      {(field.options ?? []).map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm bg-gray-50" disabled />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
