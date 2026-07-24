'use client'

import { useState, useEffect, useRef } from 'react'
import { Plus, Play, Pause, Zap, GripVertical, Trash2, ChevronDown, ChevronUp, Settings, X } from 'lucide-react'

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
  { type: 'SEND_EMAIL', label: 'Send Email', icon: '📧', color: 'bg-blue-500/20 border-blue-500/30 text-blue-300' },
  { type: 'SEND_SMS', label: 'Send SMS', icon: '💬', color: 'bg-green-500/20 border-green-500/30 text-green-300' },
  { type: 'WAIT_DELAY', label: 'Wait / Delay', icon: '⏱', color: 'bg-yellow-500/20 border-yellow-500/30 text-yellow-300' },
  { type: 'NOTIFY_TEAM', label: 'Notify Team', icon: '🔔', color: 'bg-purple-500/20 border-purple-500/30 text-purple-300' },
  { type: 'UPDATE_CRM', label: 'Update CRM', icon: '📋', color: 'bg-orange-500/20 border-orange-500/30 text-orange-300' },
  { type: 'AI_ACTION', label: 'AI Action', icon: '🤖', color: 'bg-pink-500/20 border-pink-500/30 text-pink-300' },
  { type: 'MAKE_CALL', label: 'Make Call', icon: '📞', color: 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300' },
  { type: 'CONDITION_BRANCH', label: 'Condition', icon: '⚡', color: 'bg-red-500/20 border-red-500/30 text-red-300' },
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
  return STEP_TYPES.find(s => s.type === type) ?? { type, label: type, icon: '▸', color: 'bg-white/5 border-white/10 text-gray-300' }
}

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
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
      <textarea rows={2} placeholder="Email body (use {{name}}, {{email}}, etc.)" value={cfg['body'] ?? ''} onChange={e => update('body', e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
    </div>
  )

  if (step.type === 'SEND_SMS') return (
    <div className="pt-2">
      <textarea rows={2} placeholder="SMS message (use {{name}}, etc.)" value={cfg['message'] ?? ''} onChange={e => update('message', e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
    </div>
  )

  if (step.type === 'WAIT_DELAY') return (
    <div className="flex gap-2 pt-2">
      <input type="number" min="1" placeholder="Duration" value={cfg['duration'] ?? '1'} onChange={e => update('duration', e.target.value)}
        className="w-20 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500" />
      <select value={cfg['unit'] ?? 'hours'} onChange={e => update('unit', e.target.value)}
        className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-purple-500">
        <option value="minutes">Minutes</option>
        <option value="hours">Hours</option>
        <option value="days">Days</option>
      </select>
    </div>
  )

  if (step.type === 'NOTIFY_TEAM') return (
    <div className="pt-2">
      <input placeholder="Notification message" value={cfg['message'] ?? ''} onChange={e => update('message', e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500" />
    </div>
  )

  if (step.type === 'AI_ACTION') return (
    <div className="pt-2">
      <textarea rows={2} placeholder="Describe what the AI should do..." value={cfg['prompt'] ?? ''} onChange={e => update('prompt', e.target.value)}
        className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none" />
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
    setWf(prev => ({
      ...prev,
      steps: prev.steps.map(s => s.id === stepId ? { ...s, config } : s),
    }))
  }

  const addStep = (type: string) => {
    const meta = getStepMeta(type)
    const newStep: WorkflowStep = {
      id: `step-${Date.now()}`,
      type,
      name: meta.label,
      order: wf.steps.length + 1,
    }
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
    <div className="fixed inset-0 z-50 bg-black/60 flex">
      <div className="w-full max-w-2xl ml-auto h-full bg-[#0f0f1a] border-l border-white/10 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
          <div className="flex-1 mr-4">
            <input
              value={wf.name}
              onChange={e => setWf(prev => ({ ...prev, name: e.target.value }))}
              className="w-full bg-transparent text-white font-semibold text-lg focus:outline-none focus:border-b focus:border-purple-500"
            />
            <p className="text-xs text-gray-400 mt-0.5">Trigger: {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => onSave(wf)} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-lg transition-colors">
              Save
            </button>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-white/5 text-gray-400">
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex-1 overflow-y-auto p-6 space-y-0">
          {/* Trigger node */}
          <div className="flex flex-col items-center">
            <div className="w-full rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-3 text-center">
              <p className="text-xs text-purple-400 font-medium uppercase tracking-wide">Trigger</p>
              <p className="text-sm text-white font-medium mt-0.5">⚡ {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}</p>
            </div>
            {wf.steps.length > 0 && <div className="w-0.5 h-6 bg-white/20 my-1" />}
          </div>

          {/* Step nodes */}
          {wf.steps.map((step, idx) => {
            const meta = getStepMeta(step.type)
            const isExpanded = expandedId === step.id
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div
                  className={`w-full rounded-xl border ${meta.color} cursor-move select-none`}
                  draggable
                  onDragStart={() => onDragStart(idx)}
                  onDragOver={e => onDragOver(e, idx)}
                  onDragEnd={onDragEnd}
                >
                  <div className="flex items-center gap-3 px-4 py-3">
                    <GripVertical className="h-4 w-4 text-gray-500 flex-shrink-0" />
                    <span className="text-base">{meta.icon}</span>
                    <div className="flex-1 min-w-0">
                      <input
                        value={step.name}
                        onChange={e => setWf(prev => ({ ...prev, steps: prev.steps.map(s => s.id === step.id ? { ...s, name: e.target.value } : s) }))}
                        onClick={e => e.stopPropagation()}
                        className="w-full bg-transparent text-sm text-white font-medium focus:outline-none"
                      />
                      <p className="text-xs text-gray-500">{meta.label}</p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => setExpandedId(isExpanded ? null : step.id)}
                        className="p-1 rounded hover:bg-white/10 text-gray-400"
                      >
                        <Settings className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => removeStep(step.id)} className="p-1 rounded hover:bg-red-500/20 text-gray-500 hover:text-red-400">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={() => setExpandedId(isExpanded ? null : step.id)} className="p-1 rounded hover:bg-white/10 text-gray-400">
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
                {idx < wf.steps.length - 1 && <div className="w-0.5 h-6 bg-white/20 my-1" />}
              </div>
            )
          })}

          {/* Add step */}
          <div className="flex flex-col items-center mt-2">
            {wf.steps.length > 0 && <div className="w-0.5 h-4 bg-white/20 mb-1" />}
            <div className="relative">
              <button
                onClick={() => setShowPalette(!showPalette)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl border border-dashed border-white/20 text-gray-400 hover:border-purple-500 hover:text-purple-400 text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Add Step
              </button>
              {showPalette && (
                <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-64 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-10 overflow-hidden">
                  <p className="text-xs text-gray-500 px-3 py-2 border-b border-white/10">Choose step type</p>
                  {STEP_TYPES.map(st => (
                    <button
                      key={st.type}
                      onClick={() => addStep(st.type)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-white/5 text-left text-sm text-gray-300 hover:text-white transition-colors"
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
      fetch('/api/automations').then(r => r.json()).catch(() => null),
      fetch('/api/automations/stats').then(r => r.json()).catch(() => null),
    ]).then(([wf, st]) => {
      if (wf?.workflows?.length) setWorkflows(wf.workflows)
      if (st?.total !== undefined) setStats(st)
    })
  }, [])

  async function toggleWorkflow(id: string, isActive: boolean) {
    try {
      await fetch(`/api/automations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !isActive }),
      })
    } catch {}
    setWorkflows(prev => prev.map(w => w.id === id ? { ...w, isActive: !isActive } : w))
  }

  async function executeWorkflow(id: string) {
    setExecutingId(id)
    try {
      await fetch(`/api/automations/${id}/execute`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' })
      setWorkflows(prev => prev.map(w => w.id === id ? { ...w, runCount: w.runCount + 1, lastRunAt: new Date().toISOString() } : w))
    } catch {}
    setExecutingId(null)
  }

  async function generateWorkflow() {
    if (!goal.trim()) return
    setGenerating(true)
    try {
      const res = await fetch('/api/automations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goal }),
      })
      const data = await res.json()
      if (data.workflow) {
        setWorkflows(prev => [data.workflow, ...prev])
        setShowGenerator(false)
        setGoal('')
      }
    } catch {
      const mockWorkflow: Workflow = {
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
      setWorkflows(prev => [mockWorkflow, ...prev])
      setShowGenerator(false)
      setGoal('')
    }
    setGenerating(false)
  }

  const handleSaveWorkflow = async (updated: Workflow) => {
    try {
      await fetch(`/api/automations/${updated.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: updated.name, steps: updated.steps }),
      })
    } catch {}
    setWorkflows(prev => prev.map(w => w.id === updated.id ? updated : w))
    setEditingWorkflow(null)
  }

  return (
    <div className="p-6 space-y-6">
      {editingWorkflow && (
        <StepCanvas
          workflow={editingWorkflow}
          onClose={() => setEditingWorkflow(null)}
          onSave={handleSaveWorkflow}
        />
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered workflow automation engine</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Zap className="h-4 w-4" />
          Generate with AI
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-white">{stats.total}</p>
          <p className="text-xs text-gray-400 mt-1">Total Workflows</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-green-400">{stats.active}</p>
          <p className="text-xs text-gray-400 mt-1">Active</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className="text-3xl font-bold text-blue-400">{stats.totalRuns}</p>
          <p className="text-xs text-gray-400 mt-1">Total Runs</p>
        </div>
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 text-center">
          <p className={`text-3xl font-bold ${stats.recentFailures > 0 ? 'text-red-400' : 'text-green-400'}`}>{stats.recentFailures}</p>
          <p className="text-xs text-gray-400 mt-1">Failures (7d)</p>
        </div>
      </div>

      {/* AI generator modal */}
      {showGenerator && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 w-full max-w-lg space-y-4">
            <h3 className="text-lg font-bold text-white">Generate Automation with AI</h3>
            <p className="text-sm text-gray-400">Describe what you want to automate and our AI will build the workflow.</p>
            <textarea
              value={goal}
              onChange={e => setGoal(e.target.value)}
              rows={3}
              placeholder="e.g. When a new lead signs up, send a welcome email immediately, wait 2 hours, then send a follow-up SMS with a special offer"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500 resize-none"
            />
            <div className="flex gap-3">
              <button
                onClick={generateWorkflow}
                disabled={generating || !goal.trim()}
                className="flex-1 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {generating ? 'Generating...' : '✨ Generate Workflow'}
              </button>
              <button
                onClick={() => { setShowGenerator(false); setGoal('') }}
                className="px-4 py-2.5 bg-white/5 text-gray-400 rounded-xl text-sm hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Workflow list */}
      <div className="space-y-4">
        {workflows.map(wf => {
          return (
            <div key={wf.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-white font-semibold truncate">{wf.name}</h3>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full ${wf.isActive ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>
                      {wf.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  {wf.description && <p className="text-sm text-gray-400 mb-3">{wf.description}</p>}
                  <div className="flex items-center gap-2 flex-wrap mb-3">
                    <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">
                      ⚡ {TRIGGER_LABELS[wf.triggerType] ?? wf.triggerType}
                    </span>
                    <span className="text-xs text-gray-500">{wf.runCount} runs</span>
                    {wf.lastRunAt && <span className="text-xs text-gray-500">Last: {new Date(wf.lastRunAt).toLocaleDateString()}</span>}
                  </div>
                  {/* Steps preview */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {wf.steps.map((step, i) => {
                      const meta = getStepMeta(step.type)
                      return (
                        <div key={step.id} className="flex items-center gap-1">
                          <span className={`text-xs border rounded-lg px-2 py-1 ${meta.color}`}>
                            {meta.icon} {step.name}
                          </span>
                          {i < wf.steps.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="flex flex-col gap-2 flex-shrink-0">
                  <button
                    onClick={() => setEditingWorkflow(wf)}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors"
                  >
                    Edit Canvas
                  </button>
                  <button
                    onClick={() => toggleWorkflow(wf.id, wf.isActive)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${wf.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                  >
                    {wf.isActive ? <><Pause className="h-3 w-3" /> Pause</> : <><Play className="h-3 w-3" /> Activate</>}
                  </button>
                  <button
                    onClick={() => executeWorkflow(wf.id)}
                    disabled={executingId === wf.id}
                    className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-gray-300 text-xs rounded-lg transition-colors disabled:opacity-50"
                  >
                    {executingId === wf.id ? 'Running...' : '▶ Run now'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}

        {/* New workflow */}
        <button
          onClick={() => {
            const blank: Workflow = { id: `new-${Date.now()}`, name: 'New Workflow', triggerType: 'MANUAL', isActive: false, runCount: 0, steps: [] }
            setWorkflows(prev => [blank, ...prev])
            setEditingWorkflow(blank)
          }}
          className="w-full border border-dashed border-white/20 rounded-xl py-4 text-gray-500 hover:text-gray-300 hover:border-white/40 transition-colors text-sm flex items-center justify-center gap-2"
        >
          <Plus className="h-4 w-4" />
          New Workflow
        </button>
      </div>
    </div>
  )
}
