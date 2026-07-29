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
  INVOICE_OVERDUE: 'Invoice Overdue',
  REVIEW_RECEIVED: 'Review Received',
  SCHEDULE: 'Scheduled',
  MANUAL: 'Manual',
}

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
                      <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-red-500/20 text-muted-foreground hover:text-red-400">
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
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <Zap className="h-4 w-4" />
          Generate with AI
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Workflows', value: stats.total, color: 'text-primary' },
          { label: 'Active', value: stats.active, color: 'text-emerald-400' },
          { label: 'Total Runs', value: stats.totalRuns, color: 'text-primary' },
          { label: 'Failures (7d)', value: stats.recentFailures, color: stats.recentFailures > 0 ? 'text-red-400' : 'text-emerald-400' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4 text-center"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <p className={`text-3xl font-bold tabular ${stat.color}`}>{stat.value}</p>
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
                  className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${wf.isActive
                    ? 'text-red-400 hover:bg-red-400/10'
                    : 'text-emerald-400 hover:bg-emerald-400/10'
                  }`}
                  style={{ border: `1px solid ${wf.isActive ? 'rgba(248,113,113,0.2)' : 'rgba(52,211,153,0.2)'}` }}
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
