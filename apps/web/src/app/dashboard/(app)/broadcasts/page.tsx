'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Radio, Plus, Send, Trash2, Edit2, Users, MailOpen, TrendingUp } from 'lucide-react'

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

export default function BroadcastsPage() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Broadcast | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ subject: '', htmlContent: '', tags: '' })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)

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
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function send(id: string) {
    if (!confirm('Send this broadcast to all active contacts?')) return
    setSending(id)
    try {
      await apiClient.post(`/broadcasts/${id}/send`, {})
      load()
    } catch (e: any) { alert(e.message) } finally { setSending(null) }
  }

  async function remove(id: string) {
    if (!confirm('Delete this broadcast?')) return
    await apiClient.delete(`/broadcasts/${id}`)
    load()
  }

  function edit(b: Broadcast) {
    setSelected(b)
    setForm({ subject: b.subject, htmlContent: b.htmlContent, tags: b.tags.join(', ') })
    setShowCreate(true)
  }

  const statusColor: Record<string, string> = {
    draft: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
    sending: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    sent: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
    failed: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Email Broadcasts</h1>
          <p className="text-muted-foreground text-sm mt-1">Send bulk emails to all your contacts</p>
        </div>
        <button onClick={() => { setSelected(null); setForm({ subject: '', htmlContent: '', tags: '' }); setShowCreate(true) }}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Broadcast
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: stats.total, icon: Radio, color: 'text-purple-500' },
            { label: 'Sent', value: stats.sent, icon: Send, color: 'text-green-500' },
            { label: 'Drafts', value: stats.draft, icon: Edit2, color: 'text-yellow-500' },
            { label: 'Avg Open Rate', value: `${stats.avgOpenRate.toFixed(1)}%`, icon: MailOpen, color: 'text-blue-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <s.icon className={`h-4 w-4 ${s.color}`} />
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-12 text-center">
            <Radio className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No broadcasts yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Subject', 'Status', 'Sent', 'Opens', 'Sent At', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {broadcasts.map(b => (
                <tr key={b.id} className="border-b last:border-0 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-3 font-medium">{b.subject}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${statusColor[b.status] ?? ''}`}>{b.status}</span>
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
                          <button onClick={() => edit(b)} className="p-1.5 rounded hover:bg-muted">
                            <Edit2 className="h-4 w-4 text-muted-foreground" />
                          </button>
                          <button onClick={() => send(b.id)} disabled={sending === b.id}
                            className="p-1.5 rounded hover:bg-muted">
                            <Send className={`h-4 w-4 ${sending === b.id ? 'text-muted-foreground animate-pulse' : 'text-blue-500'}`} />
                          </button>
                          <button onClick={() => remove(b.id)} className="p-1.5 rounded hover:bg-muted">
                            <Trash2 className="h-4 w-4 text-red-400" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl space-y-4">
            <h2 className="text-lg font-bold">{selected ? 'Edit Broadcast' : 'New Broadcast'}</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Subject</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Email subject…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">HTML Content</label>
              <textarea value={form.htmlContent} onChange={e => setForm({ ...form, htmlContent: e.target.value })}
                rows={8} placeholder="<p>Hello {{firstName}},</p><p>…</p>"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background font-mono focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Tags (comma-separated)</label>
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })}
                placeholder="newsletter, promo"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.subject || !form.htmlContent}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Save Draft'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
