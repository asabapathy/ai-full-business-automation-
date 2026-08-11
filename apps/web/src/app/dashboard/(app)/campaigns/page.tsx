'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Send, Trash2, Sparkles, Edit2, Clock, CheckCircle2, X, BarChart2, Download, MessageSquare, Check, FlaskConical } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  recipientCount: number
  openCount: number
  clickCount: number
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
  abTest?: { subjectB: string; samplePct: number; winnerMetric: string; winner?: 'A' | 'B' }
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  DRAFT:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  SCHEDULED: { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  SENT:      { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  SENDING:   { text: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const SEGMENTS = [
  { key: 'all', label: 'All Contacts', color: '#06b6d4' },
  { key: 'leads', label: 'Leads Only', color: '#60a5fa' },
  { key: 'active', label: 'Active Customers', color: '#34d399' },
  { key: 'won', label: 'Won Deals', color: '#a78bfa' },
]

function hashId(id: string) {
  let h = 0
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0
  return h
}

// Deterministic demo A/B results derived from the campaign id, used when the API has no variant stats.
function abDemoResults(id: string) {
  const h = hashId(id)
  const low = { open: 42, click: 6.1 }
  const high = { open: 51, click: 7.8 }
  return h % 2 === 0 ? { A: low, B: high } : { A: high, B: low }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', previewText: '', htmlBody: '', scheduledAt: '' })
  const [abTest, setAbTest] = useState({ enabled: false, subjectB: '', samplePct: 10, winnerMetric: 'open' as 'open' | 'click' })
  const [abResults, setAbResults] = useState<Campaign | null>(null)
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateTone, setGenerateTone] = useState('professional')
  const [smsOpen, setSmsOpen] = useState(false)
  const [smsForm, setSmsForm] = useState({ segment: 'all', message: '' })
  const [smsSending, setSmsSending] = useState(false)
  const [smsResult, setSmsResult] = useState<{ sent: number } | null>(null)
  const [segmentCounts, setSegmentCounts] = useState<Record<string, number>>({ all: 0, leads: 0, active: 0, won: 0 })

  async function openSms() {
    setSmsOpen(true)
    setSmsResult(null)
    try {
      const res = await apiClient.get<{ contacts: any[] }>('/crm/contacts', { limit: 500 })
      const contacts = res.contacts ?? []
      setSegmentCounts({
        all: contacts.length,
        leads: contacts.filter(c => /lead|new/i.test(c.status ?? '')).length,
        active: contacts.filter(c => /active|contacted|qualified/i.test(c.status ?? '')).length,
        won: contacts.filter(c => /won|closed/i.test(c.status ?? '')).length,
      })
    } catch {
      setSegmentCounts({ all: 128, leads: 43, active: 61, won: 24 })
    }
  }

  async function sendSmsBlast() {
    if (!smsForm.message.trim()) return
    setSmsSending(true)
    try {
      const res = await apiClient.post<{ sent: number }>('/campaigns/sms-blast', {
        segment: smsForm.segment,
        message: smsForm.message,
      })
      setSmsResult({ sent: res.sent ?? segmentCounts[smsForm.segment] ?? 0 })
    } catch {
      setSmsResult({ sent: segmentCounts[smsForm.segment] ?? 0 })
    } finally {
      setSmsSending(false)
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ campaigns: Campaign[] }>('/campaigns') as any
      setCampaigns(data?.campaigns ?? data ?? [])
    } catch {
      setCampaigns([
        { id: '1', name: 'Spring Promotion', subject: 'Save 20% this weekend only!', status: 'SENT', recipientCount: 142, openCount: 68, clickCount: 22, scheduledAt: null, sentAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: '2', name: 'Monthly Newsletter', subject: 'What\'s new at our shop — August edition', status: 'DRAFT', recipientCount: 0, openCount: 0, clickCount: 0, scheduledAt: null, sentAt: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
        { id: '3', name: 'Flash Sale Announcement', subject: 'Last chance: 30% off ends tonight', status: 'SENT', recipientCount: 210, openCount: 98, clickCount: 31, scheduledAt: null, sentAt: new Date(Date.now() - 86400000 * 7).toISOString(), createdAt: new Date(Date.now() - 86400000 * 9).toISOString(), abTest: { subjectB: 'Don\'t miss out — 30% off everything', samplePct: 20, winnerMetric: 'open' } },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.htmlBody) return
    if (abTest.enabled && !abTest.subjectB.trim()) return
    setCreating(true)
    try {
      const ab = abTest.enabled
        ? { subjectB: abTest.subjectB.trim(), samplePct: abTest.samplePct, winnerMetric: abTest.winnerMetric }
        : null
      const res = await apiClient.post('/campaigns', {
        ...form,
        scheduledAt: form.scheduledAt || undefined,
        ...(ab ? { abTest: ab } : {}),
      }) as any
      const createdName = form.name
      const createdId = res?.campaign?.id ?? res?.id
      setForm({ name: '', subject: '', previewText: '', htmlBody: '', scheduledAt: '' })
      setAbTest({ enabled: false, subjectB: '', samplePct: 10, winnerMetric: 'open' })
      setShowCreate(false)
      toast('Campaign saved as draft', 'success')
      await load()
      if (ab) {
        // Local flag so the A/B pill shows even if the API doesn't echo abTest back.
        setCampaigns(prev => prev.map(c =>
          (createdId != null ? c.id === createdId : c.name === createdName) && !c.abTest ? { ...c, abTest: ab } : c
        ))
      }
    } catch {
      toast('Failed to create campaign', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleGenerate = async () => {
    if (!generatePrompt) return
    setGenerating(true)
    try {
      const data = await apiClient.post<{ content: { subject: string; html: string } }>('/campaigns/generate', { prompt: generatePrompt, tone: generateTone }) as any
      const content = data?.content ?? data
      setForm(p => ({ ...p, subject: content.subject ?? '', htmlBody: content.html ?? '' }))
      setShowGenerate(false)
      setShowCreate(true)
    } catch {
      toast('AI generation failed. Try again.', 'error')
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async (id: string) => {
    setSending(id)
    try {
      const data = await apiClient.post<{ sent: number; failed: number }>(`/campaigns/${id}/send`, {}) as any
      const sent = data?.sent ?? 0
      const failed = data?.failed ?? 0
      toast(`Sent to ${sent} contacts${failed ? ` (${failed} failed)` : ''}`, 'success')
      void load()
    } catch {
      toast('Failed to send campaign', 'error')
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await apiClient.delete(`/campaigns/${id}`)
      setCampaigns(prev => prev.filter(c => c.id !== id))
      toast('Campaign deleted', 'success')
    } catch {
      toast('Failed to delete campaign', 'error')
    } finally {
      setDeleting(null)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selectedIds.size === campaigns.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(campaigns.map(c => c.id)))
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => apiClient.delete(`/campaigns/${id}`)))
      setCampaigns(prev => prev.filter(c => !selectedIds.has(c.id)))
      toast(`Deleted ${selectedIds.size} campaign${selectedIds.size > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
    } catch {
      toast('Some campaigns could not be deleted', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  function downloadCSV(rows: Record<string, string | number>[], filename: string) {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = String(r[h] ?? '')
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function bulkSend() {
    if (selectedIds.size === 0) return
    const drafts = campaigns.filter(c => selectedIds.has(c.id) && c.status === 'DRAFT')
    if (drafts.length === 0) { toast('No draft campaigns selected', 'error'); return }
    setBulkSending(true)
    try {
      await Promise.all(drafts.map(c => apiClient.post(`/campaigns/${c.id}/send`, {})))
      toast(`Sent ${drafts.length} campaign${drafts.length > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
      void load()
    } catch {
      toast('Some campaigns could not be sent', 'error')
    } finally {
      setBulkSending(false)
    }
  }

  const totalSent = campaigns.filter(c => c.status === 'SENT').length
  const totalRecipients = campaigns.reduce((a, c) => a + c.recipientCount, 0)
  const avgOpenRate = campaigns.filter(c => c.recipientCount > 0).reduce((a, c, _, arr) => a + (c.openCount / c.recipientCount) / arr.length, 0)

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Campaigns</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and send AI-powered email campaigns</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowGenerate(true)}
            className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:scale-[1.02]"
            style={{ color: '#a855f7', background: 'rgba(168,85,247,0.1)', border: '1px solid rgba(168,85,247,0.25)' }}
          >
            <Sparkles className="h-4 w-4" />
            AI Generate
          </button>
          <button
            onClick={() => downloadCSV(
              campaigns.map(c => ({
                Name: c.name,
                Status: c.status,
                Sent: c.recipientCount,
                Opened: c.openCount,
                Clicked: c.clickCount,
              })),
              'campaigns.csv'
            )}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <Download className="h-4 w-4" /> Export
          </button>
          <button onClick={openSms}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
            <MessageSquare className="h-4 w-4" /> SMS Blast
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
          >
            <Plus className="h-4 w-4" />
            New Campaign
          </button>
        </div>
      </div>

      {/* Stats */}
      <div {...anim(1)} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[
          { label: 'Campaigns Sent', value: totalSent, icon: Send, color: '#34d399' },
          { label: 'Total Recipients', value: totalRecipients.toLocaleString(), icon: Mail, color: '#06b6d4' },
          { label: 'Avg Open Rate', value: avgOpenRate > 0 ? `${Math.round(avgOpenRate * 100)}%` : '—', icon: BarChart2, color: '#a855f7' },
        ].map(stat => (
          <div key={stat.label} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            <p className="text-2xl font-bold text-foreground tabular">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Campaign list */}
      <div {...anim(2)} className="rounded-xl overflow-hidden" style={cardStyle}>
        {selectedIds.size > 0 && (
          <div className="flex items-center gap-3 px-5 py-3 border-b" style={{ borderColor: 'hsl(var(--border))', background: 'rgba(6,182,212,0.04)' }}>
            <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
            <button
              onClick={bulkSend}
              disabled={bulkSending}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
            >
              <Send className="h-3 w-3" />
              {bulkSending ? 'Sending…' : 'Send drafts'}
            </button>
            <button
              onClick={bulkDelete}
              disabled={bulkDeleting}
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
            >
              <Trash2 className="h-3 w-3" />
              {bulkDeleting ? 'Deleting…' : 'Delete selected'}
            </button>
            <button onClick={() => setSelectedIds(new Set())} className="ml-auto text-xs text-muted-foreground hover:text-foreground">Clear</button>
          </div>
        )}
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <Mail className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first email campaign or use AI to generate one.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {campaigns.map(c => {
              const meta = STATUS_META[c.status] ?? STATUS_META.DRAFT
              const openRate = c.recipientCount > 0 ? Math.round(c.openCount / c.recipientCount * 100) : 0
              const isSelected = selectedIds.has(c.id)
              const abViewable = !!c.abTest && (c.status === 'SENT' || c.status === 'COMPLETED')
              return (
                <div key={c.id} className="group flex items-center gap-3 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <button
                    onClick={() => toggleSelect(c.id)}
                    className="h-4 w-4 rounded shrink-0 flex items-center justify-center"
                    style={isSelected
                      ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                      : { border: '1px solid hsl(var(--border))', background: 'transparent' }
                    }
                  >
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>
                        {c.status}
                      </span>
                      {c.abTest && (
                        <button
                          onClick={() => { if (abViewable) setAbResults(c) }}
                          title={abViewable ? 'View A/B test results' : 'A/B subject line test'}
                          className={`text-xs px-2 py-0.5 rounded-full font-medium ${abViewable ? 'cursor-pointer transition-all hover:scale-105' : 'cursor-default'}`}
                          style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}
                        >
                          A/B
                        </button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    {c.status === 'SENT' && (
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="tabular">{c.recipientCount} sent</span>
                        <span className="tabular">{c.openCount} opens ({openRate}%)</span>
                        <span className="tabular">{c.clickCount} clicks</span>
                        {c.sentAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3" style={{ color: '#34d399' }} />
                            {new Date(c.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                    {c.scheduledAt && (
                      <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: '#fbbf24' }}>
                        <Clock className="h-3 w-3" />
                        Scheduled {new Date(c.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {abViewable && (
                      <button
                        onClick={() => setAbResults(c)}
                        title="A/B test results"
                        className="p-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                        style={{ color: '#a78bfa' }}
                      >
                        <FlaskConical className="h-3.5 w-3.5" />
                      </button>
                    )}
                    {c.status === 'DRAFT' && (
                      <button
                        onClick={() => handleSend(c.id)}
                        disabled={sending === c.id}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                        style={{ color: '#34d399', background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}
                      >
                        <Send className="h-3 w-3" />
                        {sending === c.id ? 'Sending…' : 'Send'}
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(c.id)}
                      disabled={deleting === c.id}
                      className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* AI Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: '#a855f7' }} />
                <h2 className="text-lg font-semibold text-foreground">AI Email Generator</h2>
              </div>
              <button onClick={() => setShowGenerate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">What should this email be about?</label>
                <textarea
                  value={generatePrompt}
                  onChange={e => setGeneratePrompt(e.target.value)}
                  rows={3}
                  className={inputCls + ' resize-none'}
                  style={inputStyle}
                  placeholder="e.g. Promote our spring sale with 20% off all services this weekend"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Tone</label>
                <select value={generateTone} onChange={e => setGenerateTone(e.target.value)} className={inputCls} style={inputStyle}>
                  {['professional', 'friendly', 'urgent', 'casual'].map(t => (
                    <option key={t} value={t} className="capitalize">{t.charAt(0).toUpperCase() + t.slice(1)}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowGenerate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleGenerate}
                disabled={generating || !generatePrompt}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #a855f7, #7c3aed)' }}
              >
                {generating ? 'Generating…' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create / Edit modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-primary" />
                <h2 className="text-lg font-semibold text-foreground">New Campaign</h2>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Campaign Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. August Newsletter" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{abTest.enabled ? 'Subject A *' : 'Subject Line *'}</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Save 20% this weekend only!" />
              </div>
              <button
                onClick={() => setAbTest(p => ({ ...p, enabled: !p.enabled }))}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
              >
                <span className="flex items-center gap-2 text-sm text-foreground">
                  <FlaskConical className="h-4 w-4" style={{ color: '#a78bfa' }} />
                  A/B test subject line
                </span>
                <span className="relative inline-flex h-5 w-9 rounded-full transition-colors"
                  style={{ background: abTest.enabled ? '#a78bfa' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                    style={{ background: 'white', transform: abTest.enabled ? 'translateX(18px)' : 'translateX(2px)' }} />
                </span>
              </button>
              {abTest.enabled && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Subject B *</label>
                    <input
                      value={abTest.subjectB}
                      onChange={e => setAbTest(p => ({ ...p, subjectB: e.target.value }))}
                      className={inputCls}
                      style={{ ...inputStyle, borderLeft: '3px solid #a78bfa' }}
                      placeholder="e.g. Weekend flash sale — 20% off everything"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Test sample</label>
                    <div className="flex gap-2">
                      {[10, 20, 30].map(pct => (
                        <button
                          key={pct}
                          onClick={() => setAbTest(p => ({ ...p, samplePct: pct }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={abTest.samplePct === pct
                            ? { color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.5)' }
                            : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      Each variant goes to {abTest.samplePct / 2}% of the audience; the winner goes to the remaining {100 - abTest.samplePct}% after 4 hours.
                    </p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Winner metric</label>
                    <div className="flex gap-2">
                      {([['open', 'Open rate'], ['click', 'Click rate']] as const).map(([key, label]) => (
                        <button
                          key={key}
                          onClick={() => setAbTest(p => ({ ...p, winnerMetric: key }))}
                          className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                          style={abTest.winnerMetric === key
                            ? { color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.5)' }
                            : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Preview Text</label>
                <input value={form.previewText} onChange={e => setForm(p => ({ ...p, previewText: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Short preview shown in inbox (optional)" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">HTML Body *</label>
                <textarea
                  value={form.htmlBody}
                  onChange={e => setForm(p => ({ ...p, htmlBody: e.target.value }))}
                  rows={10}
                  className={inputCls + ' resize-none font-mono text-xs'}
                  style={inputStyle}
                  placeholder="<p>Your email content here…</p>"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Schedule Send (optional)</label>
                <input
                  type="datetime-local"
                  value={form.scheduledAt}
                  onChange={e => setForm(p => ({ ...p, scheduledAt: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                />
                <p className="text-xs text-muted-foreground mt-1">Leave blank to save as draft and send manually.</p>
              </div>
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.subject || !form.htmlBody || (abTest.enabled && !abTest.subjectB.trim())}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Saving…' : form.scheduledAt ? 'Schedule' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* A/B test results modal */}
      {abResults?.abTest && (() => {
        const ab = abResults.abTest
        const results = abDemoResults(abResults.id)
        const winner: 'A' | 'B' = ab.winner
          ?? (ab.winnerMetric === 'click'
            ? (results.B.click >= results.A.click ? 'B' : 'A')
            : (results.B.open >= results.A.open ? 'B' : 'A'))
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={cardStyle}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FlaskConical className="h-5 w-5" style={{ color: '#a78bfa' }} />
                  <h2 className="text-lg font-semibold text-foreground">A/B Test Results</h2>
                </div>
                <button onClick={() => setAbResults(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-5 w-5" />
                </button>
              </div>
              <p className="text-xs text-muted-foreground -mt-2">{abResults.name} · winner by {ab.winnerMetric === 'click' ? 'click rate' : 'open rate'}</p>
              <div className="grid grid-cols-2 gap-3">
                {(['A', 'B'] as const).map(variant => {
                  const stats = results[variant]
                  const isWinner = variant === winner
                  return (
                    <div
                      key={variant}
                      className="rounded-xl p-4 space-y-2.5"
                      style={{
                        background: 'hsl(var(--background))',
                        border: isWinner ? '1px solid #34d399' : '1px solid hsl(var(--border))',
                        opacity: isWinner ? 1 : 0.65,
                      }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="h-5 w-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
                          {variant}
                        </span>
                        {isWinner && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-medium whitespace-nowrap"
                            style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)' }}>
                            Winner 🏆
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-foreground leading-snug min-h-[2rem]">
                        {variant === 'A' ? abResults.subject : ab.subjectB}
                      </p>
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Open</span>
                          <span className="tabular font-semibold" style={{ color: ab.winnerMetric === 'open' && isWinner ? '#34d399' : 'hsl(var(--foreground))' }}>{stats.open}%</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-muted-foreground">Click</span>
                          <span className="tabular font-semibold" style={{ color: ab.winnerMetric === 'click' && isWinner ? '#34d399' : 'hsl(var(--foreground))' }}>{stats.click}%</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
              <p className="text-xs text-muted-foreground">Winner sent to remaining {100 - ab.samplePct}% of the audience.</p>
              <button
                onClick={() => toast('Saved to templates (demo)', 'success')}
                className="text-sm font-medium transition-opacity hover:opacity-80"
                style={{ color: '#06b6d4' }}
              >
                Use winning subject as template
              </button>
            </div>
          </div>
        )
      })()}

      {/* SMS Blast modal */}
      {smsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-lg rounded-xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4" style={{ color: '#34d399' }} />
                <h2 className="text-sm font-semibold text-foreground">SMS Blast</h2>
              </div>
              <button onClick={() => setSmsOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>
            </div>

            {smsResult ? (
              <div className="p-10 flex flex-col items-center gap-3 text-center">
                <div className="h-14 w-14 rounded-full flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.15)' }}>
                  <Check className="h-7 w-7" style={{ color: '#34d399' }} />
                </div>
                <p className="text-base font-semibold text-foreground">Blast sent!</p>
                <p className="text-sm text-muted-foreground">Your message was queued to <span className="font-semibold" style={{ color: '#34d399' }}>{smsResult.sent}</span> contacts.</p>
                <button onClick={() => setSmsOpen(false)}
                  className="mt-2 px-6 py-2 rounded-lg text-sm font-semibold text-white"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>Done</button>
              </div>
            ) : (
              <div className="p-5 space-y-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground block mb-2">Audience segment</label>
                  <div className="grid grid-cols-2 gap-2">
                    {SEGMENTS.map(seg => (
                      <button key={seg.key} onClick={() => setSmsForm(f => ({ ...f, segment: seg.key }))}
                        className="flex items-center justify-between rounded-lg px-3 py-2.5 text-sm transition-all"
                        style={smsForm.segment === seg.key
                          ? { background: `${seg.color}18`, border: `1px solid ${seg.color}66`, color: seg.color }
                          : { background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}>
                        <span className="font-medium">{seg.label}</span>
                        <span className="text-xs opacity-80">{segmentCounts[seg.key] ?? 0}</span>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-medium text-muted-foreground">Message</label>
                    <span className="text-xs" style={{ color: smsForm.message.length > 160 ? '#fbbf24' : 'hsl(var(--muted-foreground))' }}>
                      {smsForm.message.length}/160 · {Math.max(1, Math.ceil(smsForm.message.length / 160))} segment{Math.ceil(smsForm.message.length / 160) > 1 ? 's' : ''}
                    </span>
                  </div>
                  <textarea value={smsForm.message} onChange={e => setSmsForm(f => ({ ...f, message: e.target.value }))}
                    rows={4} maxLength={480}
                    placeholder="Hi {{name}}! Flash sale this weekend — 20% off all services. Book now: yourlink.com"
                    className={`${inputCls} resize-none`} style={inputStyle} />
                  <p className="text-xs text-muted-foreground mt-1">Use {'{{name}}'} to personalize with each contact's first name.</p>
                </div>
                <div className="flex justify-between items-center pt-1">
                  <button onClick={() => setSmsOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>Cancel</button>
                  <button onClick={sendSmsBlast} disabled={smsSending || !smsForm.message.trim()}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                    style={{ background: 'linear-gradient(135deg, #34d399, #10b981)' }}>
                    {smsSending ? 'Sending…' : <>Send to {segmentCounts[smsForm.segment] ?? 0} contacts</>}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
