'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Radio, Plus, Send, Trash2, Edit2, MailOpen } from 'lucide-react'

interface Broadcast {
  id: string
  subject: string
  htmlContent: string
  status: string
  sentCount: number
  openCount: number
  tags: string[]
  sentAt?: string
  createdAt: string
}

interface Stats { total: number; sent: number; draft: number; avgOpenRate: number }

const STATUS_META: Record<string, { text: string; bg: string }> = {
  draft:   { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  sending: { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  sent:    { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  failed:  { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Broadcast | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ subject: '', htmlContent: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [bRes, sRes] = await Promise.all([
        apiClient.get<{ broadcasts: Broadcast[] }>('/broadcasts'),
        apiClient.get<Stats>('/broadcasts/stats'),
      ])
      setBroadcasts(bRes.broadcasts)
      setStats(sRes)
    } catch {
      setBroadcasts([])
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.subject || !form.htmlContent) return
    setSaving(true)
    try {
      const tags = form.tags ? form.tags.split(',').map(t => t.trim()).filter(Boolean) : []
      if (selected) {
        await apiClient.put(`/broadcasts/${selected.id}`, { subject: form.subject, htmlContent: form.htmlContent, tags })
      } else {
        await apiClient.post('/broadcasts', { subject: form.subject, htmlContent: form.htmlContent, tags })
      }
      setShowCreate(false)
      setSelected(null)
      setForm({ subject: '', htmlContent: '', tags: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to save broadcast', 'error')
    } finally { setSaving(false) }
  }

  async function send(id: string) {
    setSending(id)
    try {
      await apiClient.post(`/broadcasts/${id}/send`, {})
      toast('Broadcast sent successfully', 'success')
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to send broadcast', 'error')
    } finally { setSending(null) }
  }

  async function remove(id: string) {
    setDeletingId(id)
    setBroadcasts(prev => prev.filter(b => b.id !== id))
    try {
      await apiClient.delete(`/broadcasts/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete broadcast', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function edit(b: Broadcast) {
    setSelected(b)
    setForm({ subject: b.subject, htmlContent: b.htmlContent, tags: b.tags.join(', ') })
    setShowCreate(true)
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Email Broadcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">Send bulk emails to all your contacts</p>
        </div>
        <button onClick={() => { setSelected(null); setForm({ subject: '', htmlContent: '', tags: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Broadcast
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Radio, color: '#a78bfa' },
            { label: 'Sent', value: stats.sent, icon: Send, color: '#34d399' },
            { label: 'Drafts', value: stats.draft, icon: Edit2, color: '#fbbf24' },
            { label: 'Avg Open Rate', value: `${stats.avgOpenRate.toFixed(1)}%`, icon: MailOpen, color: '#60a5fa' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
              </div>
              <p className="text-2xl font-bold text-foreground">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-12 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No broadcasts yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Subject', 'Status', 'Sent', 'Opens', 'Sent At', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {broadcasts.map((b, i) => {
                  const sm = STATUS_META[b.status] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                  return (
                    <tr key={b.id} style={{ borderBottom: i < broadcasts.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                      <td className="px-4 py-3 font-medium text-foreground">{b.subject}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold capitalize" style={{ color: sm.text, background: sm.bg }}>{b.status}</span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{b.sentCount}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.sentCount > 0 ? `${((b.openCount / b.sentCount) * 100).toFixed(0)}%` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {b.sentAt ? new Date(b.sentAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {b.status === 'draft' && (
                            <>
                              <button onClick={() => edit(b)} className="p-1.5 rounded transition-colors hover:text-foreground text-muted-foreground">
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button onClick={() => send(b.id)} disabled={sending === b.id}
                                className="p-1.5 rounded transition-colors hover:text-primary text-muted-foreground">
                                <Send className={`h-4 w-4 ${sending === b.id ? 'animate-pulse' : ''}`} />
                              </button>
                              <button onClick={() => remove(b.id)} disabled={deletingId === b.id}
                                className="p-1.5 rounded transition-colors" style={{ color: '#f87171' }}>
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">{selected ? 'Edit Broadcast' : 'New Broadcast'}</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject…"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">HTML Content</label>
              <textarea value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                rows={8} placeholder="<p>Hello {{firstName}},</p><p>…</p>"
                className={`${inputCls} resize-none font-mono`} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="newsletter, promo"
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={save} disabled={saving || !form.subject || !form.htmlContent}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
