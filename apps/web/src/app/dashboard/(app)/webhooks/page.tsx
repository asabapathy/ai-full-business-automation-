'use client'

import { useState, useEffect } from 'react'
import { Webhook, Plus, Trash2, Play, CheckCircle2, XCircle, Eye, EyeOff, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'


interface WebhookEntry {
  id: string
  name: string
  url: string
  events: string[]
  isActive: boolean
  secret: string
  failureCount: number
  lastTriggeredAt: string | null
  deliveries: Array<{ id: string; event: string; success: boolean; statusCode: number | null; createdAt: string }>
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

const DEMO_WEBHOOKS: WebhookEntry[] = [
  {
    id: '1',
    name: 'Zapier — New Contact',
    url: 'https://hooks.zapier.com/hooks/catch/abc123/xyz',
    events: ['contact.created', 'contact.updated'],
    isActive: true,
    secret: 'whsec_demo1234567890abcdef',
    failureCount: 0,
    lastTriggeredAt: new Date(Date.now() - 3600000).toISOString(),
    deliveries: [
      { id: 'd1', event: 'contact.created', success: true, statusCode: 200, createdAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'd2', event: 'contact.updated', success: true, statusCode: 200, createdAt: new Date(Date.now() - 7200000).toISOString() },
    ],
  },
]

const DEMO_EVENTS = [
  'contact.created', 'contact.updated', 'contact.deleted',
  'appointment.created', 'appointment.confirmed', 'appointment.cancelled',
  'invoice.paid', 'invoice.created', 'deal.won', 'deal.lost',
  'review.received', 'form.submitted',
]

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] })

  const load = async () => {
    setLoading(true)
    try {
      const [whData, evData] = await Promise.all([
        apiClient.get('/webhooks'),
        apiClient.get('/webhooks/events'),
      ]) as any[]
      setWebhooks(whData?.webhooks ?? [])
      setEvents(evData?.events ?? DEMO_EVENTS)
    } catch {
      setWebhooks(DEMO_WEBHOOKS)
      setEvents(DEMO_EVENTS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.url || form.events.length === 0) return
    setCreating(true)
    try {
      await apiClient.post('/webhooks', form)
      setForm({ name: '', url: '', events: [] })
      setShowCreate(false)
      toast('Webhook created', 'success')
      void load()
    } catch {
      toast('Failed to create webhook', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id)
    try {
      await apiClient.delete(`/webhooks/${id}`)
      setWebhooks(prev => prev.filter(w => w.id !== id))
      toast('Webhook deleted', 'success')
    } catch {
      toast('Failed to delete webhook', 'error')
    } finally {
      setDeletingId(null)
    }
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    try {
      const data = await apiClient.post(`/webhooks/${id}/test`, {}) as any
      if (data?.success) {
        toast(`Test delivered — status ${data.statusCode ?? 200}`, 'success')
      } else {
        toast(`Test failed — status ${data?.statusCode ?? 'no response'}`, 'error')
      }
      void load()
    } catch {
      toast('Test request failed', 'error')
    } finally {
      setTestingId(null)
    }
  }

  const toggleEvent = (event: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(event) ? p.events.filter(e => e !== event) : [...p.events, event],
    }))
  }

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Webhooks</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Send real-time events to Zapier, Make, n8n, or custom endpoints</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          Add Webhook
        </button>
      </div>

      {/* Webhook list */}
      {loading ? (
        <div {...anim(1)} className="space-y-4">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-28 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
        </div>
      ) : webhooks.length === 0 ? (
        <div {...anim(1)} className="flex flex-col items-center justify-center py-16 text-center rounded-xl" style={cardStyle}>
          <Webhook className="h-10 w-10 text-muted-foreground/30 mb-3" />
          <p className="font-medium text-foreground">No webhooks yet</p>
          <p className="text-sm text-muted-foreground mt-1">Connect your integrations to receive live events.</p>
        </div>
      ) : (
        <div {...anim(1)} className="space-y-4">
          {webhooks.map((wh, i) => (
            <div
              key={wh.id}
              className="kv-anim rounded-xl p-5 space-y-3"
              style={{ animationDelay: `${0.11 + i * 0.07}s`, ...cardStyle }}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="font-semibold text-foreground">{wh.name}</span>
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-full font-medium"
                      style={wh.isActive
                        ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
                        : { color: '#94a3b8', background: 'rgba(148,163,184,0.12)' }
                      }
                    >
                      {wh.isActive ? 'Active' : 'Disabled'}
                    </span>
                    {wh.failureCount > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium" style={{ color: '#f87171', background: 'rgba(248,113,113,0.12)' }}>
                        {wh.failureCount} failures
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono truncate">{wh.url}</p>
                </div>
                <div className="flex gap-2 shrink-0 ml-3">
                  <button
                    onClick={() => handleTest(wh.id)}
                    disabled={testingId === wh.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50"
                    style={{ border: '1px solid hsl(var(--border))' }}
                  >
                    <Play className="h-3 w-3" />
                    {testingId === wh.id ? 'Testing…' : 'Test'}
                  </button>
                  <button
                    onClick={() => handleDelete(wh.id)}
                    disabled={deletingId === wh.id}
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Event tags */}
              <div className="flex flex-wrap gap-1.5">
                {wh.events.map(e => (
                  <span key={e} className="text-xs px-2 py-0.5 rounded font-medium" style={{ color: '#a78bfa', background: 'rgba(167,139,250,0.12)' }}>
                    {e}
                  </span>
                ))}
              </div>

              {/* Secret + last triggered */}
              <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                <div className="flex items-center gap-1.5">
                  <code className="px-2 py-0.5 rounded text-xs" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    {showSecret[wh.id] ? wh.secret : '••••••••••••••••'}
                  </code>
                  <button
                    onClick={() => setShowSecret(p => ({ ...p, [wh.id]: !p[wh.id] }))}
                    className="text-muted-foreground/60 hover:text-muted-foreground transition-colors"
                  >
                    {showSecret[wh.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                  </button>
                </div>
                {wh.lastTriggeredAt && (
                  <span>Last triggered {new Date(wh.lastTriggeredAt).toLocaleString()}</span>
                )}
              </div>

              {/* Recent deliveries */}
              {wh.deliveries.length > 0 && (
                <div className="border-t pt-3 space-y-1.5" style={{ borderColor: 'hsl(var(--border))' }}>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Recent deliveries</p>
                  {wh.deliveries.map(d => (
                    <div key={d.id} className="flex items-center gap-2 text-xs">
                      {d.success
                        ? <CheckCircle2 className="h-3.5 w-3.5 shrink-0" style={{ color: '#34d399' }} />
                        : <XCircle className="h-3.5 w-3.5 shrink-0" style={{ color: '#f87171' }} />
                      }
                      <span className="text-foreground/80">{d.event}</span>
                      <span className="text-muted-foreground tabular">{d.statusCode ?? '—'}</span>
                      <span className="text-muted-foreground/60 ml-auto">{new Date(d.createdAt).toLocaleTimeString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Add Webhook</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Webhook Name *</label>
                <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Zapier — New Contact" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Endpoint URL *</label>
                <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} className={inputCls} style={inputStyle} placeholder="https://hooks.zapier.com/..." />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Events *</label>
                <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-1">
                  {events.map(e => (
                    <label key={e} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground cursor-pointer py-0.5">
                      <input
                        type="checkbox"
                        checked={form.events.includes(e)}
                        onChange={() => toggleEvent(e)}
                        className="rounded"
                      />
                      <span className="text-xs font-mono">{e}</span>
                    </label>
                  ))}
                </div>
                {form.events.length > 0 && (
                  <p className="text-xs text-primary mt-2">{form.events.length} event{form.events.length !== 1 ? 's' : ''} selected</p>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.name || !form.url || form.events.length === 0}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Creating…' : 'Add Webhook'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
