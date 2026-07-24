'use client'

import { useState, useEffect } from 'react'
import { Zap, Plus, Play, Pause, Trash2, Users, ChevronRight, Sparkles } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface DripStep {
  delayDays: number
  channel: string
  subject?: string
  content: string
}

interface DripCampaign {
  id: string
  name: string
  description?: string
  isActive: boolean
  steps: DripStep[]
  _count?: { enrollments: number }
  createdAt: string
}

interface Enrollment {
  id: string
  contactId: string
  contact?: { firstName: string; lastName: string; email: string }
  currentStep: number
  status: string
  nextSendAt?: string
  createdAt: string
}

export default function DripCampaignsPage() {
  const [campaigns, setCampaigns] = useState<DripCampaign[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<DripCampaign | null>(null)
  const [enrollments, setEnrollments] = useState<Enrollment[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [enrollModal, setEnrollModal] = useState<string | null>(null)
  const [enrollContactId, setEnrollContactId] = useState('')
  const [generating, setGenerating] = useState(false)
  const [form, setForm] = useState({ name: '', description: '', goal: '', steps: '[]' })
  const [aiGoal, setAiGoal] = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const res = await apiClient.get('/drip-campaigns') as any
      setCampaigns(res?.campaigns ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const loadEnrollments = async (id: string) => {
    try {
      const res = await apiClient.get(`/drip-campaigns/${id}/enrollments`) as any
      setEnrollments(res?.enrollments ?? [])
    } catch {}
  }

  const selectCampaign = (c: DripCampaign) => {
    setSelected(c)
    loadEnrollments(c.id)
  }

  const generateSteps = async () => {
    if (!aiGoal) return
    setGenerating(true)
    try {
      const res = await apiClient.post('/drip-campaigns/generate-steps', { goal: aiGoal, stepCount: 5 }) as any
      setForm(f => ({ ...f, steps: JSON.stringify(res.steps, null, 2) }))
    } catch {}
    setGenerating(false)
  }

  const create = async () => {
    if (!form.name) return
    try {
      let steps: DripStep[] = []
      try { steps = JSON.parse(form.steps) } catch {}
      await apiClient.post('/drip-campaigns', { ...form, steps })
      setShowCreate(false)
      setForm({ name: '', description: '', goal: '', steps: '[]' })
      setAiGoal('')
      load()
    } catch {}
  }

  const toggleActive = async (c: DripCampaign) => {
    try {
      await apiClient.patch(`/drip-campaigns/${c.id}`, { isActive: !c.isActive })
      load()
    } catch {}
  }

  const deleteCampaign = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    try {
      await apiClient.delete(`/drip-campaigns/${id}`)
      if (selected?.id === id) setSelected(null)
      load()
    } catch {}
  }

  const enroll = async () => {
    if (!enrollModal || !enrollContactId) return
    try {
      await apiClient.post(`/drip-campaigns/${enrollModal}/enroll`, { contactId: enrollContactId })
      setEnrollModal(null)
      setEnrollContactId('')
      if (selected?.id === enrollModal) loadEnrollments(enrollModal)
    } catch {}
  }

  const channelColor: Record<string, string> = {
    email: 'bg-blue-100 text-blue-700',
    sms: 'bg-green-100 text-green-700',
  }

  const statusColor: Record<string, string> = {
    active: 'bg-green-100 text-green-700',
    paused: 'bg-yellow-100 text-yellow-700',
    completed: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Drip Campaigns</h1>
          <p className="text-sm text-gray-500 mt-1">Automate email and SMS sequences for your contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Campaign list */}
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-400">No campaigns yet</div>
          ) : campaigns.map(c => (
            <div key={c.id} onClick={() => selectCampaign(c)} className={`rounded-xl border bg-white p-4 shadow-sm cursor-pointer transition-all hover:border-blue-200 ${selected?.id === c.id ? 'border-blue-400 ring-1 ring-blue-200' : ''}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="h-4 w-4 text-blue-600 shrink-0" />
                  <p className="font-medium text-gray-900 truncate">{c.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggleActive(c) }} className="text-gray-400 hover:text-blue-600 p-1">
                    {c.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCampaign(c.id) }} className="text-gray-400 hover:text-red-500 p-1">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-gray-300" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${c.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {c.isActive ? 'Active' : 'Paused'}
                </span>
                <span className="text-xs text-gray-500">{c.steps.length} steps</span>
                <span className="text-xs text-gray-500">{c._count?.enrollments ?? 0} enrolled</span>
              </div>
            </div>
          ))}
        </div>

        {/* Campaign detail */}
        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-400 h-full flex items-center justify-center">
              Select a campaign to view details
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl border bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-gray-900">{selected.name}</h2>
                  <button onClick={() => setEnrollModal(selected.id)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
                    <Users className="h-3.5 w-3.5" />
                    Enroll Contact
                  </button>
                </div>
                <h3 className="text-xs font-semibold text-gray-500 uppercase mb-3">Steps</h3>
                <div className="space-y-2">
                  {selected.steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-gray-50">
                      <div className="h-6 w-6 rounded-full bg-blue-600 text-white text-xs flex items-center justify-center font-semibold shrink-0">{i + 1}</div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${channelColor[step.channel] ?? 'bg-gray-100 text-gray-600'}`}>{step.channel}</span>
                          <span className="text-xs text-gray-500">Day {step.delayDays}</span>
                        </div>
                        {step.subject && <p className="text-sm font-medium text-gray-800">{step.subject}</p>}
                        <p className="text-xs text-gray-600 truncate">{step.content}</p>
                      </div>
                    </div>
                  ))}
                  {selected.steps.length === 0 && <p className="text-sm text-gray-400">No steps defined</p>}
                </div>
              </div>

              <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
                <div className="px-4 py-3 border-b">
                  <h3 className="text-sm font-semibold text-gray-900">Enrollments ({enrollments.length})</h3>
                </div>
                {enrollments.length === 0 ? (
                  <div className="p-6 text-center text-gray-400 text-sm">No enrollments</div>
                ) : (
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Contact</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Step</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="text-left px-4 py-2 text-xs font-medium text-gray-500 uppercase">Next Send</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {enrollments.map(e => (
                        <tr key={e.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2">
                            {e.contact ? <><p className="font-medium text-gray-900">{e.contact.firstName} {e.contact.lastName}</p><p className="text-xs text-gray-500">{e.contact.email}</p></> : <span className="text-gray-400 text-xs">{e.contactId.slice(0, 8)}</span>}
                          </td>
                          <td className="px-4 py-2 text-gray-600">{e.currentStep + 1}</td>
                          <td className="px-4 py-2">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[e.status] ?? 'bg-gray-100 text-gray-600'}`}>{e.status}</span>
                          </td>
                          <td className="px-4 py-2 text-gray-500 text-xs">{e.nextSendAt ? new Date(e.nextSendAt).toLocaleDateString() : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900">New Drip Campaign</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Campaign Name</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="New Customer Onboarding" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            {/* AI generation */}
            <div className="rounded-lg bg-blue-50 border border-blue-100 p-4 space-y-3">
              <p className="text-sm font-medium text-blue-800 flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Generate steps with AI
              </p>
              <div className="flex gap-2">
                <input className="flex-1 rounded-lg border border-blue-200 px-3 py-2 text-sm bg-white" placeholder="e.g. Welcome new customers and upsell premium plan" value={aiGoal} onChange={e => setAiGoal(e.target.value)} />
                <button onClick={generateSteps} disabled={generating || !aiGoal} className="px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 shrink-0">
                  {generating ? '...' : 'Generate'}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Steps (JSON)</label>
              <textarea rows={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono resize-none" value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={create} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Campaign</button>
            </div>
          </div>
        </div>
      )}

      {/* Enroll Modal */}
      {enrollModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Enroll Contact</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={enrollContactId} onChange={e => setEnrollContactId(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEnrollModal(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={enroll} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Enroll</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
