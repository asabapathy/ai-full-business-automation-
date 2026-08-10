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

const CHANNEL_META: Record<string, { text: string; bg: string }> = {
  email: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  sms:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  active:    { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  paused:    { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  completed: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
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
  const [deletingId, setDeletingId] = useState<string | null>(null)

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
    setDeletingId(id)
    setCampaigns(prev => prev.filter(c => c.id !== id))
    if (selected?.id === id) setSelected(null)
    try {
      await apiClient.delete(`/drip-campaigns/${id}`)
    } catch {
      load()
    } finally { setDeletingId(null) }
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

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Drip Campaigns</h1>
          <p className="text-sm text-muted-foreground mt-1">Automate email and SMS sequences for your contacts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" />New Campaign
        </button>
      </div>

      <div {...anim(1)} className="kv-anim grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="space-y-3">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : campaigns.length === 0 ? (
            <div className="rounded-xl p-8 text-center text-muted-foreground" style={cardStyle}>No campaigns yet</div>
          ) : campaigns.map(c => (
            <div key={c.id} onClick={() => selectCampaign(c)}
              className="rounded-xl p-4 cursor-pointer transition-all"
              style={selected?.id === c.id
                ? { ...cardStyle, borderColor: 'rgba(6,182,212,0.5)', boxShadow: '0 0 0 1px rgba(6,182,212,0.2)' }
                : cardStyle}>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Zap className="h-4 w-4 shrink-0" style={{ color: '#06b6d4' }} />
                  <p className="font-medium text-foreground truncate">{c.name}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={e => { e.stopPropagation(); toggleActive(c) }} className="p-1 text-muted-foreground hover:text-primary transition-colors">
                    {c.isActive ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
                  </button>
                  <button onClick={e => { e.stopPropagation(); deleteCampaign(c.id) }} disabled={deletingId === c.id} className="p-1 transition-colors" style={{ color: '#f87171' }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={c.isActive ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' } : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }}>
                  {c.isActive ? 'Active' : 'Paused'}
                </span>
                <span className="text-xs text-muted-foreground">{c.steps.length} steps</span>
                <span className="text-xs text-muted-foreground">{c._count?.enrollments ?? 0} enrolled</span>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-2">
          {!selected ? (
            <div className="rounded-xl p-8 text-center text-muted-foreground h-full flex items-center justify-center" style={cardStyle}>
              Select a campaign to view details
            </div>
          ) : (
            <div className="space-y-4">
              <div className="rounded-xl p-5" style={cardStyle}>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-foreground">{selected.name}</h2>
                  <button onClick={() => setEnrollModal(selected.id)}
                    className="flex items-center gap-1.5 text-sm text-white rounded-lg px-3 py-1.5 transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                    <Users className="h-3.5 w-3.5" />Enroll Contact
                  </button>
                </div>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase mb-3">Steps</h3>
                <div className="space-y-2">
                  {selected.steps.map((step, i) => {
                    const cm = CHANNEL_META[step.channel] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                    return (
                      <div key={i} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))' }}>
                        <div className="h-6 w-6 rounded-full text-white text-xs flex items-center justify-center font-semibold shrink-0" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>{i + 1}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: cm.text, background: cm.bg }}>{step.channel}</span>
                            <span className="text-xs text-muted-foreground">Day {step.delayDays}</span>
                          </div>
                          {step.subject && <p className="text-sm font-medium text-foreground">{step.subject}</p>}
                          <p className="text-xs text-muted-foreground truncate">{step.content}</p>
                        </div>
                      </div>
                    )
                  })}
                  {selected.steps.length === 0 && <p className="text-sm text-muted-foreground">No steps defined</p>}
                </div>
              </div>

              <div className="rounded-xl overflow-hidden" style={cardStyle}>
                <div className="px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                  <h3 className="text-sm font-semibold text-foreground">Enrollments ({enrollments.length})</h3>
                </div>
                {enrollments.length === 0 ? (
                  <div className="p-6 text-center text-muted-foreground text-sm">No enrollments</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                          {['Contact', 'Step', 'Status', 'Next Send'].map(h => (
                            <th key={h} className="text-left px-4 py-2 text-xs font-medium text-muted-foreground uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {enrollments.map((e, i) => {
                          const sm = STATUS_META[e.status] ?? STATUS_META.paused
                          return (
                            <tr key={e.id} style={{ borderBottom: i < enrollments.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                              <td className="px-4 py-2">
                                {e.contact
                                  ? <><p className="font-medium text-foreground">{e.contact.firstName} {e.contact.lastName}</p><p className="text-xs text-muted-foreground">{e.contact.email}</p></>
                                  : <span className="text-muted-foreground text-xs">{e.contactId.slice(0, 8)}</span>}
                              </td>
                              <td className="px-4 py-2 text-muted-foreground">{e.currentStep + 1}</td>
                              <td className="px-4 py-2">
                                <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={{ color: sm.text, background: sm.bg }}>{e.status}</span>
                              </td>
                              <td className="px-4 py-2 text-muted-foreground text-xs">{e.nextSendAt ? new Date(e.nextSendAt).toLocaleDateString() : '—'}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">New Drip Campaign</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Campaign Name</label>
              <input className={inputCls} style={inputStyle} placeholder="New Customer Onboarding" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Description</label>
              <input className={inputCls} style={inputStyle} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>

            <div className="rounded-lg p-4 space-y-3" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
              <p className="text-sm font-medium flex items-center gap-2">
                <Sparkles className="h-4 w-4" />Generate steps with AI
              </p>
              <div className="flex gap-2">
                <input className={`flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50`}
                  style={inputStyle} placeholder="e.g. Welcome new customers and upsell premium plan"
                  value={aiGoal} onChange={e => setAiGoal(e.target.value)} />
                <button onClick={generateSteps} disabled={generating || !aiGoal}
                  className="px-3 py-2 text-sm text-white rounded-lg disabled:opacity-50 shrink-0 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {generating ? '…' : 'Generate'}
                </button>
              </div>
            </div>

            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Steps (JSON)</label>
              <textarea rows={8} className={`${inputCls} font-mono resize-none`} style={inputStyle} value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={create}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {enrollModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Enroll Contact</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Contact ID</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={enrollContactId} onChange={e => setEnrollContactId(e.target.value)} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setEnrollModal(null)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={enroll}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Enroll
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
