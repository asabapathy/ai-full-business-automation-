'use client'

import { useState, useEffect } from 'react'

interface WorkflowStep {
  id: string
  type: string
  name: string
  order: number
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
  _count?: { executions: number }
}

const DEMO_WORKFLOWS: Workflow[] = [
  {
    id: '1', name: 'New Lead Welcome Sequence', triggerType: 'CONTACT_CREATED', isActive: true, runCount: 47, lastRunAt: new Date(Date.now() - 3600000).toISOString(),
    description: 'Automatically welcome new leads with email + SMS sequence',
    steps: [
      { id: 's1', type: 'SEND_EMAIL', name: 'Send welcome email', order: 1 },
      { id: 's2', type: 'WAIT_DELAY', name: 'Wait 2 hours', order: 2 },
      { id: 's3', type: 'SEND_SMS', name: 'Follow-up SMS', order: 3 },
    ],
  },
  {
    id: '2', name: 'Overdue Invoice Reminder', triggerType: 'INVOICE_OVERDUE', isActive: true, runCount: 12, lastRunAt: new Date(Date.now() - 86400000).toISOString(),
    description: 'Escalating reminders for overdue invoices',
    steps: [
      { id: 's4', type: 'SEND_EMAIL', name: 'Gentle reminder', order: 1 },
      { id: 's5', type: 'WAIT_DELAY', name: 'Wait 3 days', order: 2 },
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

const STEP_TYPE_ICONS: Record<string, string> = {
  SEND_EMAIL: '📧',
  SEND_SMS: '💬',
  WAIT_DELAY: '⏱',
  NOTIFY_TEAM: '🔔',
  UPDATE_CRM: '📋',
  AI_ACTION: '🤖',
  MAKE_CALL: '📞',
  CONDITION_BRANCH: '⚡',
}

const TRIGGER_LABELS: Record<string, string> = {
  CONTACT_CREATED: 'New Contact',
  DEAL_STAGE_CHANGED: 'Deal Stage Change',
  APPOINTMENT_BOOKED: 'Appointment Booked',
  INVOICE_OVERDUE: 'Invoice Overdue',
  REVIEW_RECEIVED: 'Review Received',
  SCHEDULE: 'Scheduled',
  MANUAL: 'Manual',
}

export default function AutomationsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>(DEMO_WORKFLOWS)
  const [stats, setStats] = useState({ total: 3, active: 2, totalRuns: 142, recentFailures: 0 })
  const [showGenerator, setShowGenerator] = useState(false)
  const [goal, setGoal] = useState('')
  const [generating, setGenerating] = useState(false)
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
          { id: 'ai1', type: 'AI_ACTION', name: 'AI Analysis', order: 1 },
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Automations</h1>
          <p className="text-gray-400 text-sm mt-1">AI-powered workflow automation engine</p>
        </div>
        <button
          onClick={() => setShowGenerator(true)}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          ✨ Generate with AI
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
        {workflows.map(wf => (
          <div key={wf.id} className="bg-white/5 border border-white/10 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-white font-semibold">{wf.name}</h3>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${wf.isActive ? 'bg-green-400/10 text-green-400' : 'bg-gray-400/10 text-gray-400'}`}>
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
                {/* Steps */}
                <div className="flex items-center gap-2 flex-wrap">
                  {wf.steps.map((step, i) => (
                    <div key={step.id} className="flex items-center gap-1">
                      <span className="text-xs bg-white/5 border border-white/10 rounded-lg px-2 py-1">
                        {STEP_TYPE_ICONS[step.type] ?? '▸'} {step.name}
                      </span>
                      {i < wf.steps.length - 1 && <span className="text-gray-600 text-xs">→</span>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <button
                  onClick={() => toggleWorkflow(wf.id, wf.isActive)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${wf.isActive ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20' : 'bg-green-500/10 text-green-400 hover:bg-green-500/20'}`}
                >
                  {wf.isActive ? 'Pause' : 'Activate'}
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
        ))}
      </div>
    </div>
  )
}
