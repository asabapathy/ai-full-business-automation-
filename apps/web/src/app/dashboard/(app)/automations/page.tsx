'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Play, Pause, Zap, GripVertical, Trash2, ChevronDown, ChevronUp, Settings, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface WorkflowStep {
  id: string
  type: string
  name: string
  order: number
  config?: Record<string, string>
}

interface Workflow {
  id: string
  name: string
  description?: string
  triggerType: string
  isActive: boolean
  runCount: number
  lastRunAt?: string
  steps: WorkflowStep[]
}

const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'New Lead Welcome Sequence', triggerType: 'CONTACT_CREATED', isActive: true, runCount: 47, lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    description: 'Automatically welcome new leads with email + SMS sequence',
    steps: [
      { id: 's1', type: 'SEND_EMAIL', name: 'Send welcome email', order: 1, config: { subject: 'Welcome!', body: 'Hi {{name}}, thanks for reaching out...' } },
      { id: 's2', type: 'WAIT_DELAY', name: 'Wait 2 hours', order: 2, config: { duration: '2', unit: 'hours' } },
      { id: 's3', type: 'SEND_SMS', name: 'Follow-up SMS', order: 3, config: { message: 'Hi {{name}}, this is a follow-up from...' } },
    ],
  },
  {
    id: '2', name: 'Overdue Invoice Reminder', triggerType: 'INVOICE_OVERDUE', isActive: true, runCount: 12, lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    description: 'Escalating reminders for overdue invoices',
    steps: [
      { id: 's4', type: 'SEND_EMAIL', name: 'Gentle reminder', order: 1 },
      { id: 's5', type: 'WAIT_DELAY', name: 'Wait 3 days', order: 2, config: { duration: '3', unit: 'days' } },
      { id: 's6', type: 'NOTIFY_TEAM', name: 'Alert sales team', order: 3 },
    ],
  },
  {
    id: '3', name: 'Appointment Confirmation', triggerType: 'APPOINTMENT_BOOKED', isActive: false, runCount: 83,
    description: 'Send confirmation + reminder before appointment',
    steps: [
      { id: 's7', type: 'SEND_EMAIL', name: 'Confirmation email', order: 1 },
      { id: 's8', type: 'SEND_SMS', name: 'Confirmation SMS', order: 2 },
    ],
  },
]

const STEP_TYPES = [
  { type: 'SEND_EMAIL',       label: 'Send Email',    icon: '📧', bg: 'rgba(56,189,248,0.12)',  border: 'rgba(56,189,248,0.25)',  text: '#38bdf8' },
  { type: 'SEND_SMS',         label: 'Send SMS',      icon: '💬', bg: 'rgba(52,211,153,0.12)',  border: 'rgba(52,211,153,0.25)',  text: '#34d399' },
  { type: 'WAIT_DELAY',       label: 'Wait / Delay',  icon: '⏱',  bg: 'rgba(251,191,36,0.12)',  border: 'rgba(251,191,36,0.25)',  text: '#fbbf24' },
  { type: 'NOTIFY_TEAM',      label: 'Notify Team',   icon: '🔔', bg: 'rgba(167,139,250,0.12)', border: 'rgba(167,139,250,0.25)', text: '#a78bfa' },
  { type: 'UPDATE_CRM',       label: 'Update CRM',    icon: '📋', bg: 'rgba(251,146,60,0.12)',  border: 'rgba(251,146,60,0.25)',  text: '#fb923c' },
  { type: 'AI_ACTION',        label: 'AI Action',     icon: '🤖', bg: 'rgba(6,182,212,0.12)',   border: 'rgba(6,182,212,0.25)',   text: '#06b6d4' },
  { type: 'MAKE_CALL',        label: 'Make Call',     icon: '📞', bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.25)',  text: '#0ea5e9' },
  { type: 'CONDITION_BRANCH', label: 'Condition',     icon: '⚡', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.25)', text: '#f87171' },
]

const TRIGGER_LABELS: Record<string, string> = {
  CONTACT_CREATED: 'New Contact',
  DEAL_STAGE_CHANGED: 'Deal Stage Change',
  APPOINTMENT_BOOKED: 'Appointment Booked',
  APPOINTMENT_COMPLETED: 'Appointment Completed',
  ESTIMATE_APPROVED: 'Estimate Approved',
  INVOICE_OVERDUE: 'Invoice Overdue',
  REVIEW_RECEIVED: 'Review Received',
  SCHEDULE: 'Scheduled',
  MANUAL: 'Manual',
}

/* ─── Visual Builder building blocks ─── */

const TRIGGERS = [
  { key: 'contact.created', label: 'New contact added', icon: '👤', color: '#06b6d4', sentence: 'a new contact is added', triggerType: 'CONTACT_CREATED' },
  { key: 'invoice.overdue', label: 'Invoice becomes overdue', icon: '⏰', color: '#f87171', sentence: 'an invoice becomes overdue', triggerType: 'INVOICE_OVERDUE' },
  { key: 'appointment.completed', label: 'Appointment completed', icon: '✅', color: '#34d399', sentence: 'an appointment is completed', triggerType: 'APPOINTMENT_COMPLETED' },
  { key: 'estimate.approved', label: 'Estimate approved', icon: '📝', color: '#a78bfa', sentence: 'an estimate is approved', triggerType: 'ESTIMATE_APPROVED' },
  { key: 'review.received', label: 'Review received', icon: '⭐', color: '#fbbf24', sentence: 'a review is received', triggerType: 'REVIEW_RECEIVED' },
]

const CONDITIONS = [
  { key: 'always', label: 'Always run' },
  { key: 'value_gt', label: 'Deal value greater than…', hasInput: true, inputType: 'number', placeholder: '1000' },
  { key: 'status_is', label: 'Status equals…', hasInput: true, inputType: 'text', placeholder: 'qualified' },
  { key: 'first_time', label: 'Only the first time' },
]

const ACTIONS = [
  { key: 'send_email', label: 'Send email', icon: '✉️', hasInput: true, placeholder: 'Email template name', stepType: 'SEND_EMAIL' },
  { key: 'send_sms', label: 'Send SMS', icon: '💬', hasInput: true, placeholder: 'Message text', stepType: 'SEND_SMS' },
  { key: 'create_task', label: 'Create task', icon: '📋', hasInput: true, placeholder: 'Task title', stepType: 'UPDATE_CRM' },
  { key: 'notify_team', label: 'Notify team', icon: '🔔', stepType: 'NOTIFY_TEAM' },
  { key: 'add_tag', label: 'Add tag to contact', icon: '🏷️', hasInput: true, placeholder: 'Tag name', stepType: 'UPDATE_CRM' },
]

interface BuilderDraft {
  name: string
  trigger: string | null
  condition: string
  conditionValue: string
  actions: { key: string; value: string }[]
}

const EMPTY_DRAFT: BuilderDraft = { name: '', trigger: null, condition: 'always', conditionValue: '', actions: [] }

function draftSentence(draft: BuilderDraft): string {
  const trig = TRIGGERS.find(t => t.key === draft.trigger)
  const parts: string[] = [`When ${trig ? trig.sentence : '…'}`]
  if (draft.condition === 'value_gt') parts.push(`if deal value > ${draft.conditionValue || '…'}`)
  else if (draft.condition === 'status_is') parts.push(`if status is "${draft.conditionValue || '…'}"`)
  else if (draft.condition === 'first_time') parts.push('if it is the first time')
  const acts = draft.actions.map(a => {
    const meta = ACTIONS.find(x => x.key === a.key)
    const label = (meta?.label ?? a.key).toLowerCase()
    return a.value.trim() ? `${label} '${a.value.trim()}'` : label
  })
  parts.push(`then: ${acts.length ? acts.join(', ') : '…'}`)
  return parts.join(', ') + '.'
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

function getStepMeta(type: string) {
  return STEP_TYPES.find(s => s.type === type) ?? { type, label: type, icon: '▸', bg: 'rgba(255,255,255,0.05)', border: 'rgba(255,255,255,0.1)', text: 'hsl(var(--muted-foreground))' }
}

const inputBase = {
  background: 'rgba(255,255,255,0.05)',
  border: '1px solid rgba(255,255,255,0.1)',
}
const inputFocusCls = 'w-full rounded-lg px-3 py-1.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

interface StepConfigProps {
  step: WorkflowStep
  onChange: (id: string, config: Record<string, string>) => void
}

function StepConfig({ step, onChange }: StepConfigProps) {
  const cfg = step.config ?? {}
  const update = (key: string, val: string) => onChange(step.id, { ...cfg, [key]: val })

  if (step.type === 'SEND_EMAIL') return (
    <div className="space-y-2 pt-2">
      <input placeholder="Subject line" value={cfg['subject'] ?? ''} onChange={e => update('subject', e.target.value)}
        className={inputFocusCls} style={inputBase} />
      <textarea rows={2} placeholder="Email body (use {{name}}, {{email}}, etc.)" value={cfg['body'] ?? ''} onChange={e => update('body', e.target.value)}
        className={`${inputFocusCls} resize-none`} style={inputBase} />
    </div>
  )

  if (step.type === 'SEND_SMS') return (
    <div className="pt-2">
      <textarea rows={2} placeholder="SMS message (use {{name}}, etc.)" value={cfg['message'] ?? ''} onChange={e => update('message', e.target.value)}
        className={`${inputFocusCls} resize-none`} style={inputBase} />
    </div>
  )

  if (step.type === 'WAIT_DELAY') return (
    <div className="flex gap-2 pt-2">
      <input type="number" min="1" placeholder="Duration" value={cfg['duration'] ?? '1'} onChange={e => update('duration', e.target.value)}
        className={`w-20 ${inputFocusCls}`} style={inputBase} />
      <select value={cfg['unit'] ?? 'hours'} onChange={e => update('unit', e.target.value)}
        className={`flex-1 ${inputFocusCls}`} style={inputBase}>
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
        <option value="days">Days</option>
      </select>
    </div>
  )

  if (step.type === 'NOTIFY_TEAM') return (
    <div className="pt-2">
      <input placeholder="Notification message" value={cfg['message'] ?? ''} onChange={e => update('message', e.target.value)}
        className={inputFocusCls} style={inputBase} />
    </div>
  )

  if (step.type === 'AI_ACTION') return (
    <div className="pt-2">
      <textarea rows={2} placeholder="Describe what the AI should do…" value={cfg['prompt'] ?? ''} onChange={e => update('prompt', e.target.value)}
        className={`${inputFocusCls} resize-none`} style={inputBase} />
    </div>
  )

  return null
}

interface CanvasProps {
  workflow: Workflow
  onClose: () => void
  onSave: (workflow: Workflow) => void
}

function StepCanvas({ workflow: initial, onClose, onSave }: CanvasProps) {
  const [wf, setWf] = useState<Workflow>(initial)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [showPalette, setShowPalette] = useState(false)
  const dragIdx = useRef<number | null>(null)

  const updateStepConfig = (stepId: string, config: Record<string, string>) => {
    setWf(prev => ({ ...prev, steps: prev.steps.map(s => s.id === stepId ? { ...s, config } : s) }))
  }

  const addStep = (type: string) => {
    const meta = getStepMeta(type)
    const newStep: WorkflowStep = { id: `step-${Date.now()}`, type, name: meta.label, order: wf.steps.length + 1 }
    setWf(prev => ({ ...prev, steps: [...prev.steps, newStep] }))
    setShowPalette(false)
    setExpandedId(newStep.id)
  }

  const removeStep = (id: string) => {
    setWf(prev => ({ ...prev, steps: prev.steps.filter(s => s.id !== id).map((s, i) => ({ ...s, order: i + 1 })) }))
    if (expandedId === id) setExpandedId(null)
  }

  const onDragStart = (idx: number) => { dragIdx.current = idx }
  const onDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault()
    if (dragIdx.current === null || dragIdx.current === idx) return
    const steps = [...wf.steps]
    const [moved] = steps.splice(dragIdx.current, 1)
    steps.splice(idx, 0, moved!)
    dragIdx.current = idx
    setWf(prev => ({ ...prev, steps: steps.map((s, i) => ({ ...s, order: i + 1 })) }))
  }
  const onDragEnd = () => { dragIdx.current = null }

  return (
    <div className="fixed inset-0 z-50 flex" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div
        className="w-full max-w-2xl ml-auto h-full flex flex-col"
        style={{ background: 'hsl(var(--sidebar))', borderLeft: '1px solid hsl(var(--border))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex-1 mr-4">
            <input
              value={wf.name}
              onChange={e => setWf(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-transparent text-foreground font-semibold text-lg focus:outline-none"
              style={{ borderBottom: '1px solid transparent' }}
              onFocus={e => (e.target.style.borderBottomColor = 'rgba(6,182,212,0.5)')}
              onBlur={e => (e.target.style.borderBottomColor = 'transparent')}
            />
            <p className="text-xs text-muted-foreground mt-0.5">Trigger: {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onSave(wf)}
              className="px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              Save
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-accent/60 text-muted-foreground">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-0">
          {/* Trigger node */}
          <div className="flex flex-col items-center">
            <div
              className="w-full rounded-xl px-4 py-3 text-center"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.3)' }}
            >
              <p className="text-xs text-primary font-medium uppercase tracking-wide">Trigger</p>
              <p className="text-sm text-foreground font-medium mt-0.5">⚡ {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</p>
            </div>
            {wf.steps.length > 0 && <div className="w-0.5 h-6 bg-muted-foreground/20 my-1" />}
          </div>

          {/* Step nodes */}
          {wf.steps.map((step, idx) => {
            const meta = getStepMeta(step.type)
            const isExpanded = expandedId === step.id
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className="w-full rounded-xl cursor-move select-none"
                  style={{ background: meta.bg, border: `1px solid ${meta.border}` }}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDragEnd={onDragEnd}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="h-4 w-4 text-muted-foreground/40 flex-shrink-0" />
                    <span className="text-base">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <input
                        value={step.name}
                        onChange={e => setWf(prev => ({ ...prev, steps: prev.steps.map(s => s.id === step.id ? { ...s, name: e.target.value } : s) }))}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-transparent text-sm text-foreground font-medium focus:outline-none"
                      />
                      <p className="text-xs text-muted-foreground">{meta.label}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : step.id)}
                        className="p-1 rounded hover:bg-white/10 text-muted-foreground"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeStep(step.id)} className="p-1 rounded text-muted-foreground transition-colors" style={{ }} onMouseEnter={e => (e.currentTarget.style.color='#f87171')} onMouseLeave={e => (e.currentTarget.style.color='')}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : step.id)} className="p-1 rounded hover:bg-white/10 text-muted-foreground">
                        {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                  {isExpanded && (
                    <div className="px-4 pb-3" onClick={e => e.stopPropagation()}>
                      <StepConfig step={step} onChange={updateStepConfig} />
                    </div>
                  )}
                </div>
                {idx < wf.steps.length - 1 && <div className="w-0.5 h-6 bg-muted-foreground/20 my-1" />}
              </div>
            )
          })}

          {/* Add step */}
          <div className="flex flex-col items-center mt-2">
            {wf.steps.length > 0 && <div className="w-0.5 h-4 bg-muted-foreground/20 mb-1" />}
            <div className="relative">
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm text-muted-foreground transition-all hover:text-primary"
                style={{ border: '2px dashed rgba(255,255,255,0.15)' }}
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
              {showPalette && (
                <div
                  className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 rounded-xl z-10 overflow-hidden shadow-2xl"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
                >
                  <p className="text-xs text-muted-foreground px-3 py-2" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                    Choose step type
                  </p>
                  {STEP_TYPES.map(st => (
                    <button
                      key={st.type}
                      onClick={() => addStep(st.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
                    >
                      <span>{st.icon}</span>
                      {st.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEMO_WORKFLOWS)
  const [stats, setStats] = useState({ total: 3, active: 2, totalRuns: 142, recentFailures: 0 })
  const [showGenerator, setShowGenerator] = useState(false)
  const [goal, setGoal] = useState('')
  const [generating, setGenerating] = useState(false)
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null)
  const [executingId, setExecutingId] = useState<string | null>(null)
  const [builderOpen, setBuilderOpen] = useState(false)
  const [draft, setDraft] = useState<BuilderDraft>(EMPTY_DRAFT)
  const [savingDraft, setSavingDraft] = useState(false)
  const [showActionPicker, setShowActionPicker] = useState(false)

  useEffect(() => {
    Promise.all([
      (apiClient as any).get('/automations').catch(() => null),
      (apiClient as any).get('/automations/stats').catch(() => null),
    ]).then(([wf, st]: any[]) => {
      if (wf?.workflows?.length) setWorkflows(wf.workflows)
      if (st?.total !== undefined) setStats(st)
    })
  }, [])

  async function toggleWorkflow(id: string, isActive: boolean) {
    try {
      await (apiClient as any).patch(`/automations/${id}`, { isActive: !isActive })
    } catch {}
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w))
  }

  async function executeWorkflow(id: string) {
    setExecutingId(id)
    try {
      await (apiClient as any).post(`/automations/${id}/execute`, {})
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, runCount: w.runCount + 1, lastRunAt: new Date().toISOString() } : w))
      toast('Workflow executed', 'success')
    } catch {
      toast('Failed to execute workflow', 'error')
    }
    setExecutingId(null)
  }

  async function generateWorkflow() {
    if (!goal.trim()) return
    setGenerating(true)
    try {
      const data = await (apiClient as any).post('/automations/generate', { goal }) as any
      if (data.workflow) {
        setWorkflows(prev => [data.workflow, ...prev])
        setShowGenerator(false)
        setGoal('')
        return
      }
    } catch {
      const mock: Workflow = {
        id: `demo-${Date.now()}`,
        name: `AI: ${goal.slice(0, 40)}`,
        description: `Auto-generated workflow for: ${goal}`,
        triggerType: 'MANUAL',
        isActive: false,
        runCount: 0,
        steps: [
          { id: 'ai1', type: 'AI_ACTION', name: 'AI Analysis', order: 1, config: { prompt: `Analyze and process: ${goal}` } },
          { id: 'ai2', type: 'SEND_EMAIL', name: 'Send notification', order: 2 },
          { id: 'ai3', type: 'NOTIFY_TEAM', name: 'Alert team', order: 3 },
        ],
      }
      setWorkflows(prev => [mock, ...prev])
      setShowGenerator(false)
      setGoal('')
    }
    setGenerating(false)
  }

  const draftValid = draft.name.trim().length > 0 && draft.trigger !== null && draft.actions.length > 0

  function closeBuilder() {
    setBuilderOpen(false)
    setDraft(EMPTY_DRAFT)
    setShowActionPicker(false)
  }

  async function createAutomation() {
    if (!draftValid || savingDraft) return
    setSavingDraft(true)
    const description = draftSentence(draft)
    const trig = TRIGGERS.find(t => t.key === draft.trigger)
    let created: Workflow | null = null
    try {
      const data = await (apiClient as any).post('/automations', {
        name: draft.name.trim(),
        trigger: draft.trigger,
        condition: draft.condition,
        conditionValue: draft.conditionValue,
        actions: draft.actions,
      }) as any
      if (data?.workflow) created = data.workflow
    } catch {}
    if (!created) {
      // Demo mode — build the workflow locally from the draft
      created = {
        id: `auto-${Date.now()}`,
        name: draft.name.trim(),
        description,
        triggerType: trig?.triggerType ?? 'MANUAL',
        isActive: true,
        runCount: 0,
        steps: draft.actions.map((a, i) => {
          const meta = ACTIONS.find(x => x.key === a.key)
          return {
            id: `bstep-${Date.now()}-${i}`,
            type: meta?.stepType ?? 'AI_ACTION',
            name: a.value.trim() ? `${meta?.label ?? a.key}: ${a.value.trim()}` : (meta?.label ?? a.key),
            order: i + 1,
            ...(a.value.trim() ? { config: { value: a.value.trim() } } : {}),
          }
        }),
      }
    }
    setWorkflows(prev => [created!, ...prev])
    setStats(prev => ({ ...prev, total: prev.total + 1, active: prev.active + (created!.isActive ? 1 : 0) }))
    closeBuilder()
    toast('Automation created', 'success')
    setSavingDraft(false)
  }

  const handleSaveWorkflow = async (updated: Workflow) => {
    try {
      await (apiClient as any).patch(`/automations/${updated.id}`, { name: updated.name, steps: updated.steps })
      toast('Workflow saved', 'success')
    } catch {
      toast('Could not save to server — changes applied locally', 'info')
    }
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w))
    setEditingWorkflow(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {editingWorkflow && (
        <StepCanvas
          workflow={editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          onSave={handleSaveWorkflow}
        />
      )}

      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Automations</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered workflow automation engine</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowGenerator(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60"
            style={{ border: '1px solid hsl(var(--border))' }}
          >
            <Zap className="h-4 w-4" />
            Generate with AI
          </button>
          <button
            onClick={() => setBuilderOpen(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Automation
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, hex: null as string | null },
          { label: 'Active', value: stats.active, hex: '#34d399' as string | null },
          { label: 'Total Runs', value: stats.totalRuns, hex: null as string | null },
          { label: 'Failures (7d)', value: stats.recentFailures, hex: (stats.recentFailures > 0 ? '#f87171' : '#34d399') as string | null },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4 text-center"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <p className={`text-3xl font-bold tabular${!stat.hex ? ' text-primary' : ''}`} style={stat.hex ? { color: stat.hex } : undefined}>{stat.value}</p>
            <p className="text-xs text-muted-foreground mt-1">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* AI Generator modal */}
      {showGenerator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-lg rounded-2xl p-6 space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <h3 className="text-lg font-bold text-foreground">Generate Automation with AI</h3>
            </div>
            <p className="text-sm text-muted-foreground">Describe what you want to automate and our AI will build the workflow.</p>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={3}
              placeholder="e.g. When a new lead signs up, send a welcome email immediately, wait 2 hours, then send a follow-up SMS with a special offer"
              className="w-full rounded-xl px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 resize-none"
              style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <div className="flex gap-3">
              <button
                onClick={generateWorkflow}
                disabled={generating || !goal.trim()}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {generating ? 'Generating…' : '✨ Generate Workflow'}
              </button>
              <button
                onClick={() => { setShowGenerator(false); setGoal('') }}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Automation Builder modal */}
      {builderOpen && (() => {
        const selectedTrigger = TRIGGERS.find(t => t.key === draft.trigger)
        const selectedCondition = CONDITIONS.find(c => c.key === draft.condition)
        const Connector = () => <div className="mx-auto my-0" style={{ width: '2px', height: '24px', background: 'hsl(var(--border))' }} />
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
            <div className="w-full max-w-2xl rounded-2xl flex flex-col" style={{ ...cardStyle, maxHeight: '90vh' }}>
              {/* Modal header */}
              <div className="flex items-center justify-between px-6 py-4 flex-shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div>
                  <h3 className="text-lg font-bold text-foreground">New Automation</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Build a trigger → condition → action flow</p>
                </div>
                <button onClick={closeBuilder} className="p-2 rounded-lg hover:bg-accent/60 text-muted-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Scrollable body */}
              <div className="flex-1 overflow-y-auto px-6 py-5 space-y-0">
                {/* Name */}
                <input
                  value={draft.name}
                  onChange={e => setDraft(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Automation name"
                  className={inputCls}
                  style={inputStyle}
                />

                <div className="h-4" />

                {/* WHEN node */}
                <div className="rounded-xl p-4" style={cardStyle}>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-3">When</p>
                  {!selectedTrigger ? (
                    <div className="grid grid-cols-2 gap-2">
                      {TRIGGERS.map(t => (
                        <button
                          key={t.key}
                          onClick={() => setDraft(prev => ({ ...prev, trigger: t.key }))}
                          className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm text-muted-foreground transition-colors hover:text-foreground"
                          style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                          onMouseEnter={e => (e.currentTarget.style.borderColor = t.color)}
                          onMouseLeave={e => (e.currentTarget.style.borderColor = 'hsl(var(--border))')}
                        >
                          <span className="text-base">{t.icon}</span>
                          <span>{t.label}</span>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div
                      className="flex items-center justify-between gap-3 rounded-lg px-3 py-2.5"
                      style={{ background: 'hsl(var(--muted))', borderLeft: `3px solid ${selectedTrigger.color}` }}
                    >
                      <div className="flex items-center gap-2 text-sm text-foreground font-medium">
                        <span className="text-base">{selectedTrigger.icon}</span>
                        {selectedTrigger.label}
                      </div>
                      <button
                        onClick={() => setDraft(prev => ({ ...prev, trigger: null }))}
                        className="text-xs text-muted-foreground transition-colors hover:text-foreground flex-shrink-0"
                      >
                        change
                      </button>
                    </div>
                  )}
                </div>

                <Connector />

                {/* IF node */}
                <div className="rounded-xl p-4" style={cardStyle}>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-3">If</p>
                  <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                    <select
                      value={draft.condition}
                      onChange={e => setDraft(prev => ({ ...prev, condition: e.target.value, conditionValue: '' }))}
                      className={inputCls}
                      style={inputStyle}
                    >
                      {CONDITIONS.map(c => (
                        <option key={c.key} value={c.key}>{c.label}</option>
                      ))}
                    </select>
                    {selectedCondition?.hasInput && (
                      <input
                        type={selectedCondition.inputType ?? 'text'}
                        value={draft.conditionValue}
                        onChange={e => setDraft(prev => ({ ...prev, conditionValue: e.target.value }))}
                        placeholder={selectedCondition.placeholder}
                        className={`${inputCls} sm:w-44 flex-shrink-0`}
                        style={inputStyle}
                      />
                    )}
                  </div>
                </div>

                <Connector />

                {/* THEN node */}
                <div className="rounded-xl p-4" style={cardStyle}>
                  <p className="text-xs uppercase tracking-wide font-semibold text-muted-foreground mb-3">Then</p>
                  <div className="space-y-2">
                    {draft.actions.map((a, idx) => {
                      const meta = ACTIONS.find(x => x.key === a.key)
                      return (
                        <div
                          key={`${a.key}-${idx}`}
                          className="flex items-center gap-2 rounded-lg px-3 py-2"
                          style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                        >
                          <span className="text-base flex-shrink-0">{meta?.icon}</span>
                          <span className="text-sm text-foreground font-medium flex-shrink-0">{meta?.label ?? a.key}</span>
                          {meta?.hasInput && (
                            <input
                              value={a.value}
                              onChange={e => setDraft(prev => ({
                                ...prev,
                                actions: prev.actions.map((x, i) => i === idx ? { ...x, value: e.target.value } : x),
                              }))}
                              placeholder={meta.placeholder}
                              className={`${inputCls} flex-1 min-w-0`}
                              style={inputStyle}
                            />
                          )}
                          <button
                            onClick={() => setDraft(prev => ({ ...prev, actions: prev.actions.filter((_, i) => i !== idx) }))}
                            className="ml-auto flex-shrink-0 p-1 rounded text-muted-foreground transition-colors"
                            onMouseEnter={e => (e.currentTarget.style.color = '#f87171')}
                            onMouseLeave={e => (e.currentTarget.style.color = '')}
                            aria-label="Remove action"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )
                    })}

                    {draft.actions.length < 4 && (
                      <div>
                        <button
                          onClick={() => setShowActionPicker(v => !v)}
                          className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-primary"
                          style={{ border: '2px dashed hsl(var(--border))' }}
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add action
                        </button>
                        {showActionPicker && (
                          <div className="flex flex-wrap gap-2 mt-2">
                            {ACTIONS.map(a => (
                              <button
                                key={a.key}
                                onClick={() => {
                                  setDraft(prev => prev.actions.length >= 4 ? prev : { ...prev, actions: [...prev.actions, { key: a.key, value: '' }] })
                                  setShowActionPicker(false)
                                }}
                                className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                              >
                                <span>{a.icon}</span>
                                {a.label}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {draft.actions.length >= 4 && (
                      <p className="text-xs text-muted-foreground">Maximum of 4 actions per automation.</p>
                    )}
                  </div>
                </div>

                {/* Live sentence preview */}
                <div className="mt-4 rounded-xl px-4 py-3" style={{ background: 'hsl(var(--muted))' }}>
                  <p className="text-xs text-muted-foreground italic leading-relaxed">{draftSentence(draft)}</p>
                </div>
              </div>

              {/* Footer */}
              <div className="flex gap-3 px-6 py-4 flex-shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <button
                  onClick={closeBuilder}
                  className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  Cancel
                </button>
                <button
                  onClick={createAutomation}
                  disabled={!draftValid || savingDraft}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  {savingDraft ? 'Creating…' : 'Create Automation'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Workflow list */}
      <div className="kv-anim space-y-4" style={{ animationDelay: '0.39s' }}>
        {workflows.map(wf => (
          <div
            key={wf.id}
            className="rounded-xl border p-5"
            style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1 flex-wrap">
                  <h3 className="text-foreground font-semibold truncate">{wf.name}</h3>
                  <span
                    className="flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium"
                    style={wf.isActive
                      ? { background: 'rgba(52,211,153,0.1)', color: '#34d399' }
                      : { background: 'rgba(255,255,255,0.05)', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {wf.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
                {wf.description && <p className="text-sm text-muted-foreground mb-3">{wf.description}</p>}
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <span
                    className="text-xs px-2 py-0.5 rounded-full text-primary font-medium"
                    style={{ background: 'rgba(6,182,212,0.1)' }}
                  >
                    ⚡ {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}
                  </span>
                  <span className="text-xs text-muted-foreground">{wf.runCount} runs</span>
                  {wf.lastRunAt && <span className="text-xs text-muted-foreground">Last: {new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {wf.steps.map((step, i) => {
                    const meta = getStepMeta(step.type)
                    return (
                      <div key={step.id} className="flex items-center gap-1">
                        <span
                          className="text-xs rounded-lg px-2 py-1 font-medium"
                          style={{ background: meta.bg, border: `1px solid ${meta.border}`, color: meta.text }}
                        >
                          {meta.icon} {step.name}
                        </span>
                        {i < wf.steps.length - 1 && <span className="text-muted-foreground/40 text-xs">→</span>}
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2 flex-shrink-0">
                <button
                  onClick={() => setEditingWorkflow(wf)}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  Edit Canvas
                </button>
                <button
                  onClick={() => toggleWorkflow(wf.id, wf.isActive)}
                  className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
                  style={{
                    color: wf.isActive ? '#f87171' : '#34d399',
                    border: `1px solid ${wf.isActive ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}`,
                  }}
                >
                  {wf.isActive ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
                </button>
                <button
                  onClick={() => executeWorkflow(wf.id)}
                  disabled={executingId === wf.id}
                  className="rounded-lg px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground hover:bg-accent/60 disabled:opacity-50"
                  style={{ border: '1px solid hsl(var(--border))' }}
                >
                  {executingId === wf.id ? 'Running…' : '▶ Run now'}
                </button>
              </div>
            </div>
          </div>
        ))}

        <button
          onClick={() => {
            const blank: Workflow = { id: `new-${Date.now()}`, name: 'New Workflow', triggerType: 'MANUAL', isActive: false, runCount: 0, steps: [] }
            setWorkflows(prev => [blank, ...prev])
            setEditingWorkflow(blank)
          }}
          className="w-full rounded-xl py-4 text-muted-foreground hover:text-foreground transition-colors text-sm flex items-center justify-center gap-2"
          style={{ border: '2px dashed hsl(var(--border))' }}
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </button>
      </div>
    </div>
  )
}
