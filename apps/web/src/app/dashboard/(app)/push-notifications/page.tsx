'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Send, Users, Smartphone, Plus } from 'lucide-react'

interface Stats { total: number; active: number }

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

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
    } catch {
      setStats({ total: 0, active: 0 })
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
      toast('Failed to subscribe: ' + (e.message || 'Unknown error'), 'error')
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
    } catch (e: any) {
      toast(e.message || 'Failed to send notification', 'error')
    } finally { setSending(false) }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <div {...anim(0)} className="kv-anim">
        <h1 className="text-2xl font-bold text-foreground">Push Notifications</h1>
        <p className="text-muted-foreground text-sm mt-1">Send browser push notifications to subscribed team members</p>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 gap-4">
          {[
            { label: 'Total Subscriptions', value: stats.total, icon: Users, color: '#a78bfa' },
            { label: 'Active', value: stats.active, icon: Smartphone, color: '#34d399' },
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

      <div className="grid md:grid-cols-2 gap-6">
        <div {...anim(2)} className="kv-anim rounded-xl p-5 space-y-4" style={cardStyle}>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" /> Subscribe This Browser
          </h2>
          <p className="text-sm text-muted-foreground">Subscribe your current browser to receive push notifications.</p>
          {subscribed ? (
            <div className="flex items-center gap-2 text-sm rounded-xl px-4 py-2.5" style={{ color: '#34d399', background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}>
              ✓ This browser is now subscribed
            </div>
          ) : (
            <button onClick={subscribe} disabled={subscribing}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Plus className="h-4 w-4" />
              {subscribing ? 'Subscribing…' : 'Subscribe Browser'}
            </button>
          )}
        </div>

        <div {...anim(3)} className="kv-anim rounded-xl p-5 space-y-4" style={cardStyle}>
          <h2 className="font-semibold text-foreground flex items-center gap-2">
            <Send className="h-5 w-5 text-primary" /> Send Notification
          </h2>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Title</label>
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Notification title"
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Message</label>
            <textarea value={form.body} onChange={e => setForm({ ...form, body: e.target.value })}
              rows={3} placeholder="Notification message…"
              className={`${inputCls} resize-none`} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Action URL (optional)</label>
            <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })}
              placeholder="https://…"
              className={inputCls} style={inputStyle} />
          </div>
          {result && (
            <div className="rounded-lg p-3 text-sm" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
              Sent to <span className="font-semibold" style={{ color: '#34d399' }}>{result.sent}</span> subscribers
              {result.failed > 0 && <>, <span className="font-semibold" style={{ color: '#f87171' }}>{result.failed}</span> failed</>}
            </div>
          )}
          <button onClick={sendPush} disabled={sending || !form.title || !form.body}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
            <Send className="h-4 w-4" />
            {sending ? 'Sending…' : 'Send to All Subscribers'}
          </button>
        </div>
      </div>
    </div>
  )
}
