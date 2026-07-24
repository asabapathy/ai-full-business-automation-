'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { CalendarCheck, Plus, Trash2, Copy, CheckCircle, ToggleLeft, ToggleRight } from 'lucide-react'

interface Feed {
  id: string
  name: string
  feedToken: string
  isActive: boolean
  staffUserId?: string
  createdAt: string
}

export default function CalendarSyncPage() {
  const [feeds, setFeeds] = useState<Feed[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', staffUserId: '' })
  const [creating, setCreating] = useState(false)
  const [copiedId, setCopiedId] = useState<string | null>(null)

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
    } catch (e: any) { alert(e.message) } finally { setCreating(false) }
  }

  async function toggle(id: string, isActive: boolean) {
    await apiClient.patch(`/calendar-sync/${id}/toggle`, { isActive: !isActive })
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this calendar feed?')) return
    await apiClient.delete(`/calendar-sync/${id}`)
    load()
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
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Calendar Sync</h1>
          <p className="text-muted-foreground text-sm mt-1">Subscribe your appointments to Google Calendar, Outlook, or Apple Calendar</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Feed
        </button>
      </div>

      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-4 text-sm text-blue-800 dark:text-blue-300">
        <strong>How it works:</strong> Create a calendar feed below, then copy the .ics URL and paste it into Google Calendar (Other calendars → From URL), Outlook (Add calendar → Subscribe from web), or Apple Calendar (File → New Calendar Subscription).
      </div>

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : feeds.length === 0 ? (
          <div className="p-12 text-center">
            <CalendarCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground mb-4">No calendar feeds yet</p>
            <button onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90 mx-auto">
              <Plus className="h-4 w-4" /> Create Your First Feed
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {feeds.map(feed => (
              <div key={feed.id} className="p-4 flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium">{feed.name}</p>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${feed.isActive
                      ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                      : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'}`}>
                      {feed.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate max-w-md">
                      {feedUrl(feed.feedToken)}
                    </code>
                    <button onClick={() => copyUrl(feed.feedToken, feed.id)}
                      className="shrink-0 p-1.5 rounded hover:bg-muted transition-colors" title="Copy URL">
                      {copiedId === feed.id
                        ? <CheckCircle className="h-4 w-4 text-green-500" />
                        : <Copy className="h-4 w-4 text-muted-foreground" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">Created {new Date(feed.createdAt).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggle(feed.id, feed.isActive)} title={feed.isActive ? 'Deactivate' : 'Activate'}
                    className="p-1.5 rounded hover:bg-muted transition-colors">
                    {feed.isActive
                      ? <ToggleRight className="h-5 w-5 text-green-500" />
                      : <ToggleLeft className="h-5 w-5 text-muted-foreground" />}
                  </button>
                  <button onClick={() => remove(feed.id)} className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">New Calendar Feed</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Feed Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="All Appointments"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Filter by Staff (optional — User ID)</label>
              <input value={form.staffUserId} onChange={e => setForm({ ...form, staffUserId: e.target.value })}
                placeholder="Leave blank for all appointments"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={create} disabled={creating || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating…' : 'Create Feed'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
