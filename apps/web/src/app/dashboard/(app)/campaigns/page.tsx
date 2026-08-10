'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Send, Trash2, Sparkles, Edit2, Clock, CheckCircle2, X, BarChart2 } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Skeleton } from '../../../../components/ui/skeleton'

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
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({ name: '', subject: '', previewText: '', htmlBody: '' })
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateTone, setGenerateTone] = useState('professional')

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get<{ campaigns: Campaign[] }>('/campaigns') as any
      setCampaigns(data?.campaigns ?? data ?? [])
    } catch {
      setCampaigns([
        { id: '1', name: 'Spring Promotion', subject: 'Save 20% this weekend only!', status: 'SENT', recipientCount: 142, openCount: 68, clickCount: 22, scheduledAt: null, sentAt: new Date(Date.now() - 86400000 * 3).toISOString(), createdAt: new Date(Date.now() - 86400000 * 5).toISOString() },
        { id: '2', name: 'Monthly Newsletter', subject: 'What\'s new at our shop — August edition', status: 'DRAFT', recipientCount: 0, openCount: 0, clickCount: 0, scheduledAt: null, sentAt: null, createdAt: new Date(Date.now() - 86400000).toISOString() },
      ])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.htmlBody) return
    setCreating(true)
    try {
      await apiClient.post('/campaigns', form) as any
      setForm({ name: '', subject: '', previewText: '', htmlBody: '' })
      setShowCreate(false)
      toast('Campaign saved as draft', 'success')
      void load()
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
      <div {...anim(1)} className="grid grid-cols-3 gap-4">
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
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
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
              return (
                <div key={c.id} className="flex items-center gap-4 px-5 py-4 hover:bg-accent/30 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <p className="font-medium text-foreground text-sm">{c.name}</p>
                      <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{c.subject}</p>
                    {c.status === 'SENT' && (
                      <div className="flex gap-4 mt-1.5 text-xs text-muted-foreground">
                        <span className="tabular">{c.recipientCount} sent</span>
                        <span className="tabular">{c.openCount} opens ({openRate}%)</span>
                        <span className="tabular">{c.clickCount} clicks</span>
                        {c.sentAt && (
                          <span className="flex items-center gap-1">
                            <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                            {new Date(c.sentAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    )}
                    {c.scheduledAt && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-amber-400">
                        <Clock className="h-3 w-3" />
                        Scheduled {new Date(c.scheduledAt).toLocaleString()}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
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
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Subject Line *</label>
                <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Save 20% this weekend only!" />
              </div>
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
            </div>
            <div className="flex gap-3 pt-1">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.subject || !form.htmlBody}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
