'use client'

import { useState, useEffect } from 'react'
import { GitBranch, Plus, Trash2, ToggleLeft, ToggleRight, Mail, MessageSquare, UserPlus } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

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

export default function SequencesPage() {
  const [sequences, setSequences] = useState<Sequence[]>([])
  const [triggers, setTriggers] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({ name: '', trigger: '', steps: [] as FollowUpStep[] })
  const [newStep, setNewStep] = useState<FollowUpStep>({ stepOrder: 1, channel: 'email', delayHours: 24, subject: '', body: '' })
  const [enrollForm, setEnrollForm] = useState<{ seqId: string; contactId: string } | null>(null)

  useEffect(() => { fetchAll() }, [])

  async function fetchAll() {
    try {
      const [seqData, trigData] = await Promise.all([
        apiClient.get('/sequences'),
        apiClient.get('/sequences/triggers'),
      ])
      setSequences(seqData.sequences ?? [])
      setTriggers(trigData.triggers ?? [])
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
    if (form.steps.length === 0) { alert('Add at least one step.'); return }
    await apiClient.post('/sequences', form)
    setShowForm(false)
    setForm({ name: '', trigger: '', steps: [] })
    fetchAll()
  }

  async function handleToggle(id: string, isActive: boolean) {
    await apiClient.patch(`/sequences/${id}/toggle`, { isActive: !isActive })
    fetchAll()
  }

  async function handleDelete(id: string) {
    if (!confirm('Delete this sequence?')) return
    await apiClient.delete(`/sequences/${id}`)
    fetchAll()
  }

  async function handleEnroll(e: React.FormEvent) {
    e.preventDefault()
    if (!enrollForm) return
    await apiClient.post(`/sequences/${enrollForm.seqId}/enroll`, { contactId: enrollForm.contactId })
    setEnrollForm(null)
  }

  const triggerLabel = (t: string) => t.replace(/_/g, ' ')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <GitBranch className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold">Follow-Up Sequences</h1>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Sequence
        </Button>
      </div>

      {showForm && (
        <div className="rounded-xl border bg-card p-6 space-y-6">
          <h2 className="font-semibold text-lg">Create Sequence</h2>
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} required />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Trigger</label>
                <select className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.trigger} onChange={e => setForm(f => ({ ...f, trigger: e.target.value }))} required>
                  <option value="">Select trigger</option>
                  {triggers.map(t => <option key={t} value={t}>{triggerLabel(t)}</option>)}
                </select>
              </div>
            </div>

            {/* Steps so far */}
            {form.steps.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Steps ({form.steps.length})</p>
                {form.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2 text-sm">
                    <span className="text-muted-foreground">#{step.stepOrder}</span>
                    {step.channel === 'email' ? <Mail className="h-3.5 w-3.5" /> : <MessageSquare className="h-3.5 w-3.5" />}
                    <span className="capitalize">{step.channel}</span>
                    <span className="text-muted-foreground">+{step.delayHours}h</span>
                    {step.subject && <span className="font-medium truncate">{step.subject}</span>}
                    <button type="button" className="ml-auto text-destructive text-xs"
                      onClick={() => setForm(f => ({ ...f, steps: f.steps.filter((_, j) => j !== i) }))}>
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Add step */}
            <div className="rounded-lg border bg-muted/20 p-4 space-y-3">
              <p className="text-sm font-medium">Add Step</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium mb-1">Channel</label>
                  <select className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
                    value={newStep.channel} onChange={e => setNewStep(s => ({ ...s, channel: e.target.value as any }))}>
                    <option value="email">Email</option>
                    <option value="sms">SMS</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1">Delay (hours)</label>
                  <input type="number" min="0" className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
                    value={newStep.delayHours} onChange={e => setNewStep(s => ({ ...s, delayHours: parseInt(e.target.value) }))} />
                </div>
                {newStep.channel === 'email' && (
                  <div className="col-span-2">
                    <label className="block text-xs font-medium mb-1">Subject</label>
                    <input className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm"
                      value={newStep.subject} onChange={e => setNewStep(s => ({ ...s, subject: e.target.value }))} />
                  </div>
                )}
                <div className="col-span-2">
                  <label className="block text-xs font-medium mb-1">Body</label>
                  <textarea className="w-full rounded-lg border bg-background px-2 py-1.5 text-sm min-h-[60px]"
                    value={newStep.body} onChange={e => setNewStep(s => ({ ...s, body: e.target.value }))} />
                </div>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={addStep}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Step
              </Button>
            </div>

            <div className="flex gap-2">
              <Button type="submit">Create Sequence</Button>
              <Button variant="outline" type="button" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="text-muted-foreground">Loading...</p>
      ) : sequences.length === 0 ? (
        <div className="rounded-xl border bg-card p-12 text-center text-muted-foreground">
          <GitBranch className="h-10 w-10 mx-auto mb-3 opacity-40" />
          <p>No sequences yet. Create automated follow-up sequences to nurture contacts.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sequences.map(seq => (
            <div key={seq.id} className="rounded-xl border bg-card p-5 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{seq.name}</h3>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${seq.isActive ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800'}`}>
                      {seq.isActive ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">Trigger: <span className="capitalize">{triggerLabel(seq.trigger)}</span></p>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => setEnrollForm({ seqId: seq.id, contactId: '' })}>
                    <UserPlus className="h-3.5 w-3.5" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleToggle(seq.id, seq.isActive)}>
                    {seq.isActive
                      ? <ToggleRight className="h-4 w-4 text-primary" />
                      : <ToggleLeft className="h-4 w-4 text-muted-foreground" />}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleDelete(seq.id)}>
                    <Trash2 className="h-3.5 w-3.5 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                {seq.steps.map((step, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-lg bg-muted px-2 py-1 text-xs">
                    {step.channel === 'email' ? <Mail className="h-3 w-3" /> : <MessageSquare className="h-3 w-3" />}
                    <span className="capitalize">{step.channel}</span>
                    <span className="text-muted-foreground">+{step.delayHours}h</span>
                  </div>
                ))}
                {seq.steps.length === 0 && <span className="text-xs text-muted-foreground">No steps</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Enroll modal */}
      {enrollForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-sm rounded-xl bg-card border p-6 space-y-4">
            <h2 className="font-semibold">Enroll Contact</h2>
            <form onSubmit={handleEnroll} className="space-y-3">
              <div>
                <label className="block text-sm font-medium mb-1">Contact ID</label>
                <input className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  placeholder="Contact UUID"
                  value={enrollForm.contactId}
                  onChange={e => setEnrollForm(f => f ? { ...f, contactId: e.target.value } : null)}
                  required />
              </div>
              <div className="flex gap-2">
                <Button type="submit">Enroll</Button>
                <Button variant="outline" type="button" onClick={() => setEnrollForm(null)}>Cancel</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
