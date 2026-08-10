'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { CalendarCheck, Plus, Trash2, Copy, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'

interface Feed {
  id: string
  name: string
  feedToken: string
  isActive: boolean
  staffUserId?: string
  createdAt: string
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function CalendarSyncPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', staffUserId: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await apiClient.get<{ feeds: Feed[] }>('/calendar-sync')
      setFeeds(res.feeds)
    } finally { setLoading(false) }
  }

  async function create() {
    if (!form.name) return
    setCreating(true)
    try {
      await apiClient.post('/calendar-sync', {
        name: form.name,
        staffUserId: form.staffUserId || undefined,
      })
      setShowCreate(false)
      setForm({ name: '', staffUserId: '' })
      load()
    } catch (e: any) {
      toast(e.message || 'Failed to create feed', 'error')
    } finally { setCreating(false) }
  }

  async function toggle(id: string, isActive: boolean) {
    await apiClient.patch(`/calendar-sync/${id}/toggle`, { isActive: !isActive })
    load()
  }

  async function remove(id: string) {
    setDeletingId(id)
    setFeeds(prev => prev.filter(f => f.id !== id))
    try {
      await apiClient.delete(`/calendar-sync/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to delete feed', 'error')
      load()
    } finally { setDeletingId(null) }
  }

  function feedUrl(token: string) {
    return `${process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'}/calendar-sync/feed/${token}.ics`
  }

  function copyUrl(token: string, id: string) {
    navigator.clipboard.writeText(feedUrl(token))
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Calendar Sync</h1>
          <p className="text-muted-foreground text-sm mt-1">Subscribe your appointments to Google Calendar, Outlook, or Apple Calendar</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> New Feed
        </button>
      </div>

      <div {...anim(1)} className="kv-anim rounded-xl p-4 text-sm" style={{ color: '#60a5fa', background: 'rgba(96,165,250,0.08)', border: '1px solid rgba(96,165,250,0.2)' }}>
        <strong>How it works:</strong> Create a calendar feed below, then copy the .ics URL and paste it into Google Calendar (Other calendars → From URL), Outlook (Add calendar → Subscribe from web), or Apple Calendar (File → New Calendar Subscription).
      </div>

      <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : feeds.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground mb-4">No calendar feeds yet</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] mx-auto"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Plus className="h-4 w-4" /> Create Your First Feed
            </button>
          </div>
        ) : (
          <div>
            {feeds.map((feed, i) => (
              <div key={feed.id} className="p-4 flex items-start gap-4" style={{ borderBottom: i < feeds.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-foreground">{feed.name}</p>
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={feed.isActive
                      ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                      : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }}>
                      {feed.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs px-2 py-1 rounded font-mono truncate max-w-md" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                      {feedUrl(feed.feedToken)}
                    </code>
                    <button onClick={() => copyUrl(feed.feedToken, feed.id)}
                      className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors" title="Copy URL">
                      {copiedId === feed.id
                        ? <CheckCircle className="h-4 w-4" style={{ color: '#34d399' }} />
                        : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created {new Date(feed.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(feed.id, feed.isActive)} title={feed.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1.5 rounded hover:bg-muted transition-colors">
                    {feed.isActive
                      ? <ToggleRight className="h-5 w-5" style={{ color: '#34d399' }} />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => remove(feed.id)} disabled={deletingId === feed.id} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">New Calendar Feed</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Feed Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="All Appointments" className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Filter by Staff (optional — User ID)</label>
              <input value={form.staffUserId} onChange={e => setForm({ ...form, staffUserId: e.target.value })}
                placeholder="Leave blank for all appointments" className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={create} disabled={creating || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Feed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
