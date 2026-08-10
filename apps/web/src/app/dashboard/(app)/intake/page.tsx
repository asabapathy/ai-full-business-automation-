'use client'

import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Send, Trash2, Eye, ChevronRight, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function IntakePage() {
  const [forms, setForms] = useState<IntakeForm[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<IntakeForm | null>(null)
  const [submissions, setSubmissions] = useState<IntakeSubmission[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState<string | null>(null)
  const [preview, setPreview] = useState<IntakeForm | null>(null)
  const [form, setForm] = useState({ name: '', description: '', fields: '[]' })
  const [sendForm, setSendForm] = useState({ contactId: '', appointmentId: '' })
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
  }

  const create = async () => {
    if (!form.name) return
    setCreating(true)
    try {
      let fields: IntakeField[] = []
      try { fields = JSON.parse(form.fields) } catch {}
      await apiClient.post('/intake', { ...form, fields })
      setShowCreate(false)
      setForm({ name: '', description: '', fields: '[]' })
      toast('Form created', 'success')
      load()
    } catch { toast('Failed to create form', 'error') }
    setCreating(false)
  }

  const send = async () => {
    if (!showSend || !sendForm.contactId) return
    setSending(true)
    try {
      await apiClient.post(`/intake/${showSend}/send`, sendForm)
      toast('Intake form sent', 'success')
      setShowSend(null)
      setSendForm({ contactId: '', appointmentId: '' })
    } catch { toast('Failed to send form', 'error') }
    setSending(false)
  }

  const deleteForm = async (id: string) => {
    setDeletingId(id)
    setForms(prev => prev.filter(f => f.id !== id))
    if (selected?.id === id) setSelected(null)
    try { await apiClient.delete(`/intake/${id}`) } catch {}
    setDeletingId(null)
  }

  const defaultFields: IntakeField[] = [
    { name: 'fullName', label: 'Full Name', type: 'text', required: true },
    { name: 'dateOfBirth', label: 'Date of Birth', type: 'date', required: true },
    { name: 'allergies', label: 'Known Allergies', type: 'textarea' },
    { name: 'medications', label: 'Current Medications', type: 'textarea' },
    { name: 'reasonForVisit', label: 'Reason for Visit', type: 'textarea', required: true },
  ]

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intake Forms</h1>
          <p className="text-sm text-muted-foreground mt-1">Collect pre-appointment information from clients</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}>
          <Plus className="h-4 w-4" />
          New Form
        </button>
      </div>

      <div {...anim(1)} className="kv-anim grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form list */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-1">Forms</h2>
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: 'hsl(var(--card))' }} />)
          ) : forms.length === 0 ? (
            <div className="rounded-xl p-6 text-center text-sm text-muted-foreground" style={cardStyle}>No forms yet</div>
          ) : forms.map(f => (
            <div
              key={f.id}
              onClick={() => selectForm(f)}
              className="rounded-xl p-4 cursor-pointer transition-all"
              style={selected?.id === f.id
                ? { background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.3)' }
                : cardStyle
              }
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-foreground truncate">{f.name}</p>
                  {f.description && <p className="text-xs text-muted-foreground truncate mt-0.5">{f.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">{f.fields.length} fields</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); setPreview(f) }}
                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg">
                    <Eye className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); setShowSend(f.id) }}
                    className="p-1.5 text-muted-foreground hover:text-emerald-400 transition-colors rounded-lg">
                    <Send className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteForm(f.id) }}
                    disabled={deletingId === f.id}
                    className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors rounded-lg disabled:opacity-40">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground opacity-40" />
                </div>
              </div>
              <div className="mt-2">
                <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={f.isActive
                    ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                    : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }
                  }>
                  {f.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Submissions */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl h-full flex items-center justify-center p-10 text-center" style={cardStyle}>
              <div>
                <ClipboardCheck className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
                <p className="text-muted-foreground text-sm">Select a form to view submissions</p>
              </div>
            </div>
          ) : (
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <h2 className="font-semibold text-foreground text-sm">Submissions — {selected.name}</h2>
                <button onClick={() => setShowSend(selected.id)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-1.5 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  <Send className="h-3.5 w-3.5" />
                  Send Form
                </button>
              </div>
              {submissions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground text-sm">No submissions yet</div>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {submissions.map(s => (
                    <div key={s.id} className="p-4 hover:bg-muted/30 transition-colors">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          {s.contact
                            ? <><p className="font-medium text-foreground text-sm">{s.contact.firstName} {s.contact.lastName}</p><p className="text-xs text-muted-foreground">{s.contact.email}</p></>
                            : <p className="text-sm text-muted-foreground">Anonymous</p>}
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">{new Date(s.createdAt).toLocaleDateString()}</p>
                          {s.completedAt && <p className="text-xs" style={{ color: '#34d399' }}>Completed</p>}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {Object.entries(s.data).map(([key, val]) => (
                          <div key={key} className="rounded-lg p-2" style={{ background: 'hsl(var(--background))' }}>
                            <p className="text-xs font-medium text-muted-foreground capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
                            <p className="text-sm text-foreground truncate">{String(val)}</p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">New Intake Form</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Form Name *</label>
                <input className={inputCls} style={inputStyle} placeholder="New Patient Intake" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                <input className={inputCls} style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide">Fields (JSON)</label>
                  <button onClick={() => setForm(f => ({ ...f, fields: JSON.stringify(defaultFields, null, 2) }))}
                    className="text-xs text-primary hover:underline">
                    Use default medical intake
                  </button>
                </div>
                <textarea rows={10} className={inputCls + ' resize-none font-mono'} style={inputStyle}
                  placeholder='[{"name":"fullName","label":"Full Name","type":"text","required":true}]'
                  value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={create} disabled={creating || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Form'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">Send Intake Form</h2>
              <button onClick={() => setShowSend(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact ID *</label>
                <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={sendForm.contactId} onChange={e => setSendForm(f => ({ ...f, contactId: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Appointment ID (optional)</label>
                <input className={inputCls} style={inputStyle} placeholder="Appointment UUID" value={sendForm.appointmentId} onChange={e => setSendForm(f => ({ ...f, appointmentId: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSend(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={send} disabled={sending || !sendForm.contactId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            {preview.description && <p className="text-sm text-muted-foreground">{preview.description}</p>}
            <div className="space-y-3">
              {preview.fields.map(field => (
                <div key={field.name}>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    {field.label} {field.required && <span style={{ color: '#f87171' }}>*</span>}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea rows={2} className={inputCls + ' resize-none opacity-50'} style={inputStyle} disabled placeholder="Patient enters response…" />
                  ) : field.type === 'select' ? (
                    <select className={inputCls + ' opacity-50'} style={inputStyle} disabled>
                      {(field.options ?? []).map((o: string) => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input type={field.type} className={inputCls + ' opacity-50'} style={inputStyle} disabled />
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
