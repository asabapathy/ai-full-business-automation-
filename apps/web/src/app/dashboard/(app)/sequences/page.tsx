'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Plus, Trash2, ToggleLeft, ToggleRight, Mail, MessageSquare, UserPlus, Loader2 } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface FollowUpStep {
  stepOrder: number
  channel: 'email' | 'sms'
  delayHours: number
  subject?: string
  body: string
}

interface Sequence {
  id: string
  name: string
  trigger: string
  isActive: boolean
  steps: FollowUpStep[]
  _count?: { enrollments: number }
}

const DEMO_SEQUENCES: Sequence[] = [
  {
    id: '1', name: 'New Lead Nurture', trigger: 'NEW_CONTACT', isActive: true,
    steps: [
      { stepOrder: 1, channel: 'email', delayHours: 0, subject: 'Welcome!', body: 'Thanks for reaching out...' },
      { stepOrder: 2, channel: 'sms', delayHours: 24, body: 'Just following up...' },
      { stepOrder: 3, channel: 'email', delayHours: 72, subject: 'Have you had a chance?', body: '...' },
    ],
    _count: { enrollments: 24 },
  },
  {
    id: '2', name: 'Post-Appointment Follow-Up', trigger: 'APPOINTMENT_COMPLETED', isActive: false,
    steps: [
      { stepOrder: 1, channel: 'email', delayHours: 2, subject: 'How was your experience?', body: 'We hope everything went well...' },
      { stepOrder: 2, channel: 'sms', delayHours: 48, body: 'Would you mind leaving us a review?' },
    ],
    _count: { enrollments: 8 },
  },
]

const DEMO_TRIGGERS = ['NEW_CONTACT', 'APPOINTMENT_COMPLETED', 'LEAD_QUALIFIED', 'DEAL_WON', 'DEAL_LOST', 'REVIEW_REQUESTED']

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', trigger: '', steps: [] as FollowUpStep[] })
  const [newStep, setNewStep] = useState<FollowUpStep>({ stepOrder: 1, channel: 'email', delayHours: 24, subject: '', body: '' })
  const [enrollForm, setEnrollForm] = useState<{ seqId: string; contactId: string } | null>(null)
  const [creating, setCreating] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [enrolling, setEnrolling] = useState(false)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    setLoading(true)
    try {
      const [seqData, trigData] = await Promise.all([
        apiClient.get('/sequences'),
        apiClient.get('/sequences/triggers'),
      ])
      setSequences((seqData as any).sequences ?? [])
      setTriggers((trigData as any).triggers ?? [])
    } catch {
      setSequences(DEMO_SEQUENCES)
      setTriggers(DEMO_TRIGGERS)
    } finally {
      setLoading(false)
    }
  }

  function addStep() {
    setForm(f => ({ ...f, steps: [...f.steps, { ...newStep, stepOrder: f.steps.length + 1 }] }))
    setNewStep({ stepOrder: 1, channel: 'email', delayHours: 24, subject: '', body: '' })
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (form.steps.length === 0) {
      toast('Add at least one step before saving.', 'error')
      return
    }
    setCreating(true)
    try {
      await apiClient.post('/sequences', form)
      setShowForm(false)
      setForm({ name: '', trigger: '', steps: [] })
      toast('Sequence created', 'success')
      fetchAll()
    } catch { toast('Failed to create sequence', 'error') }
    setCreating(false)
  }

  async function handleToggle(id: string, isActive: boolean) {
    setTogglingId(id)
    try {
      await apiClient.patch(`/sequences/${id}/toggle`, { isActive: !isActive })
      setSequences(prev => prev.map(s => s.id === id ? { ...s, isActive: !isActive } : s))
      toast(isActive ? 'Sequence paused' : 'Sequence activated', 'success')
    } catch { toast('Failed to update sequence', 'error') }
    setTogglingId(null)
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    try {
      await apiClient.delete(`/sequences/${id}`)
      setSequences(prev => prev.filter(s => s.id !== id))
      toast('Sequence deleted', 'success')
    } catch { toast('Failed to delete sequence', 'error') }
    setDeletingId(null)
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollForm) return
    setEnrolling(true)
    try {
      await apiClient.post(`/sequences/${enrollForm.seqId}/enroll`, { contactId: enrollForm.contactId })
      setEnrollForm(null)
      toast('Contact enrolled', 'success')
    } catch { toast('Failed to enroll contact', 'error') }
    setEnrolling(false)
  }

  const triggerLabel = (t: string) => t.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Follow-Up Sequences</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Sequence
        </button>
      </div>

      {showForm && (
        <div
          className="rounded-xl p-6 space-y-6"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <h2 className="font-semibold text-lg text-foreground">Create Sequence</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Name</label>
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="e.g. New Lead Nurture"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Trigger</label>
                <select
                  className={inputCls} style={inputStyle}
                  value={form.trigger}
                  onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))}
                  required
                >
                  <option value="">Select trigger…</option>
                  {triggers.map(t => <option key={t} value={t}>{triggerLabel(t)}</option>)}
                </select>
              </div>
            </div>

            {form.steps.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Steps ({form.steps.length})</p>
                {form.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  >
                    <span className="text-muted-foreground text-xs">#{step.stepOrder}</span>
                    {step.channel === 'email'
                      ? <Mail className="h-3.5 w-3.5 text-primary" />
                      : <MessageSquare className="h-3.5 w-3.5 text-primary" />}
                    <span className="capitalize text-foreground text-xs">{step.channel}</span>
                    <span className="text-muted-foreground text-xs">+{step.delayHours}h</span>
                    {step.subject && <span className="font-medium text-foreground text-xs truncate">{step.subject}</span>}
                    <button
                      type="button"
                      className="ml-auto text-xs font-medium transition-colors hover:opacity-80"
                      style={{ color: '#f87171' }}
                      onClick={() => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div
              className="rounded-lg p-4 space-y-3"
              style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            >
              <p className="text-xs font-medium text-foreground">Add Step</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Channel</label>
                  <select
                    className={inputCls} style={inputStyle}
                    value={newStep.channel}
                    onChange={e => setNewStep(s => ({ ...s, channel: e.target.value as 'email' | 'sms' }))}
                  >
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-muted-foreground mb-1">Delay (hours)</label>
                  <input
                    type="number" min="0"
                    className={inputCls} style={inputStyle}
                    value={newStep.delayHours}
                    onChange={e => setNewStep(s => ({ ...s, delayHours: parseInt(e.target.value) || 0 }))}
                  />
                </div>
                {newStep.channel === 'email' && (
                  <div className="col-span-2">
                    <label className="block text-xs text-muted-foreground mb-1">Subject</label>
                    <input
                      className={inputCls} style={inputStyle}
                      value={newStep.subject ?? ''}
                      onChange={e => setNewStep(s => ({ ...s, subject: e.target.value }))}
                    />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs text-muted-foreground mb-1">Body</label>
                  <textarea
                    className={`${inputCls} resize-none`}
                    style={{ ...inputStyle, minHeight: 60 }}
                    value={newStep.body}
                    onChange={e => setNewStep(s => ({ ...s, body: e.target.value }))}
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={addStep}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
                style={{ border: '1px solid rgba(6,182,212,0.25)' }}
              >
                <Plus className="h-3.5 w-3.5" />
                Add Step
              </button>
            </div>

            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                {creating ? 'Saving…' : 'Create Sequence'}
              </button>
              <button
                type="button"
                onClick={() => setShowForm(false)}
                className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div className="space-y-3">
          {[0, 1].map(i => (
            <div key={i} className="rounded-xl p-5 space-y-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
              <div className="h-4 w-48 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
              <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
            </div>
          ))}
        </div>
      ) : sequences.length === 0 ? (
        <div
          className="rounded-xl p-12 text-center text-muted-foreground"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          <GitBranch className="h-10 w-10 mx-auto mb-3 text-muted-foreground/30" />
          <p>No sequences yet. Create automated follow-up sequences to nurture contacts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => {
            const sm = seq.isActive
              ? { text: '#34d399', bg: 'rgba(52,211,153,0.12)' }
              : { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
            return (
              <div key={seq.id} className="rounded-xl p-5 space-y-3" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground">{seq.name}</h3>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                        style={{ color: sm.text, background: sm.bg }}
                      >
                        {seq.isActive ? 'Active' : 'Paused'}
                      </span>
                      {seq._count && (
                        <span className="text-xs text-muted-foreground">{seq._count.enrollments} enrolled</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Trigger: <span className="text-foreground">{triggerLabel(seq.trigger)}</span>
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setEnrollForm({ seqId: seq.id, contactId: '' })}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60"
                      title="Enroll contact"
                    >
                      <UserPlus className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleToggle(seq.id, seq.isActive)}
                      disabled={togglingId === seq.id}
                      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent/60 disabled:opacity-50"
                      title={seq.isActive ? 'Pause' : 'Activate'}
                    >
                      {togglingId === seq.id
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : seq.isActive
                          ? <ToggleRight className="h-4 w-4 text-primary" />
                          : <ToggleLeft className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handleDelete(seq.id)}
                      disabled={deletingId === seq.id}
                      className="h-8 w-8 flex items-center justify-center rounded-lg transition-colors hover:bg-accent/60 disabled:opacity-50"
                      style={{ color: '#f87171' }}
                      title="Delete"
                    >
                      {deletingId === seq.id
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        : <Trash2 className="h-3.5 w-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {seq.steps.map((step, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs"
                      style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                    >
                      {step.channel === 'email'
                        ? <Mail className="h-3 w-3 text-primary" />
                        : <MessageSquare className="h-3 w-3 text-primary" />}
                      <span className="capitalize text-foreground">{step.channel}</span>
                      <span className="text-muted-foreground">+{step.delayHours}h</span>
                    </div>
                  ))}
                  {seq.steps.length === 0 && <span className="text-xs text-muted-foreground">No steps</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {enrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-sm rounded-2xl p-6 space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <h2 className="font-semibold text-foreground">Enroll Contact</h2>
            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1.5">Contact ID</label>
                <input
                  className={inputCls} style={inputStyle}
                  placeholder="Contact UUID"
                  value={enrollForm.contactId}
                  onChange={e => setEnrollForm(f => f ? { ...f, contactId: e.target.value } : null)}
                  required
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={enrolling}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  {enrolling && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {enrolling ? 'Enrolling…' : 'Enroll'}
                </button>
                <button
                  type="button"
                  onClick={() => setEnrollForm(null)}
                  className="rounded-xl px-4 py-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
