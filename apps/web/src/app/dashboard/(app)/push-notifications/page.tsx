'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { BellRing, Send, Users, Smartphone, Plus } from 'lucide-react'

interface Stats { total: number; active: number }

export default function PushNotificationsPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ title: '', body: '', url: '' })
  const [sending, setSending] = useState(false)
  const [result, setResult] = useState<{ sent: number; failed: number } | null>(null)
  const [subscribed, setSubscribed] = useState(false)
  const [subscribing, setSubscribing] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const s = await apiClient.get<Stats>('/push/stats')
      setStats(s)
    } finally { setLoading(false) }
  }

  async function subscribe() {
    setSubscribing(true)
    try {
      const { publicKey } = await apiClient.get<{ publicKey: string }>('/push/vapid-key')
      const reg = await navigator.serviceWorker.register('/sw.js')
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: publicKey,
      })
      const json = sub.toJSON()
      await apiClient.post('/push/subscribe', {
        endpoint: json.endpoint,
        p256dh: json.keys?.p256dh,
        auth: json.keys?.auth,
      })
      setSubscribed(true)
      load()
    } catch (e: any) {
      alert('Failed to subscribe: ' + e.message)
    } finally { setSubscribing(false) }
  }

  async function sendPush() {
    if (!form.title || !form.body) return
    setSending(true)
    setResult(null)
    try {
      const res = await apiClient.post<{ sent: number; failed: number }>('/push/send', form)
      setResult(res)
      setForm({ title: '', body: '', url: '' })
    } catch (e: any) { alert(e.message) } finally { setSending(false) }
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Push Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Send browser push notifications to subscribed team members</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Total Subscriptions</p>
              <Users className="h-4 w-4 text-purple-500" />
            </div>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          <div className="bg-card border rounded-xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-muted-foreground">Active</p>
              <Smartphone className="h-4 w-4 text-green-500" />
            </div>
            <p className="text-2xl font-bold">{stats.active}</p>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Subscribe This Browser
          </h2>
          <p className="text-sm text-muted-foreground">Subscribe your current browser to receive push notifications.</p>
          {subscribed ? (
            <div className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg p-3 text-sm font-medium">
              ✓ This browser is now subscribed
            </div>
          ) : (
            <button onClick={subscribe} disabled={subscribing}
              className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90">
              <Plus className="h-4 w-4" />
              {subscribing ? 'Subscribing…' : 'Subscribe Browser'}
            </button>
          )}
        </div>

        <div className="bg-card border rounded-xl p-5 space-y-4">
          <h2 className="font-semibold text-lg flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send Notification
          </h2>
          <div>
            <label className="text-sm font-medium block mb-1">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Notification title"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Message</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              rows={3} placeholder="Notification message…"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
          </div>
          <div>
            <label className="text-sm font-medium block mb-1">Action URL (optional)</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
          </div>
          {result && (
            <div className="bg-muted rounded-lg p-3 text-sm">
              Sent to <span className="font-semibold text-green-600">{result.sent}</span> subscribers
              {result.failed > 0 && <>, <span className="font-semibold text-red-500">{result.failed}</span> failed</>}
            </div>
          )}
          <button onClick={sendPush} disabled={sending || !form.title || !form.body}
            className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:opacity-90">
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send to All Subscribers'}
          </button>
        </div>
      </div>
    </div>
  )
}
