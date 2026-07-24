'use client'

import { useState, useEffect } from 'react'
import { Webhook, Plus, Trash2, Play, CheckCircle2, XCircle, Eye, EyeOff } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

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

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookEntry[]>([])
  const [events, setEvents] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [testingId, setTestingId] = useState<string | null>(null)
  const [showSecret, setShowSecret] = useState<Record<string, boolean>>({})
  const [form, setForm] = useState({ name: '', url: '', events: [] as string[] })

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    setLoading(true)
    const [whRes, evRes] = await Promise.all([
      fetch(`${API_BASE}/webhooks`, { headers }),
      fetch(`${API_BASE}/webhooks/events`, { headers }),
    ])
    const whData = await whRes.json() as { webhooks: WebhookEntry[] }
    const evData = await evRes.json() as { events: string[] }
    setWebhooks(whData.webhooks ?? [])
    setEvents(evData.events ?? [])
    setLoading(false)
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.url || form.events.length === 0) return
    await fetch(`${API_BASE}/webhooks`, { method: 'POST', headers, body: JSON.stringify(form) })
    setForm({ name: '', url: '', events: [] })
    setShowCreate(false)
    void load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return
    await fetch(`${API_BASE}/webhooks/${id}`, { method: 'DELETE', headers })
    void load()
  }

  const handleTest = async (id: string) => {
    setTestingId(id)
    const res = await fetch(`${API_BASE}/webhooks/${id}/test`, { method: 'POST', headers })
    const data = await res.json() as { success: boolean; statusCode?: number }
    alert(data.success ? `Test delivered! Status: ${data.statusCode}` : `Test failed. Status: ${data.statusCode ?? 'no response'}`)
    setTestingId(null)
    void load()
  }

  const toggleEvent = (event: string) => {
    setForm(p => ({
      ...p,
      events: p.events.includes(event) ? p.events.filter(e => e !== event) : [...p.events, event],
    }))
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Webhook className="w-6 h-6 text-indigo-400" /> Webhooks</h1>
          <p className="text-gray-400 text-sm mt-1">Send real-time events to your integrations (Zapier, Make, n8n, custom)</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading...</div>
      ) : webhooks.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Webhook className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No webhooks yet. Connect your integrations.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {webhooks.map(wh => (
            <div key={wh.id} className="bg-gray-900 border border-gray-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-white">{wh.name}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${wh.isActive ? 'bg-green-500/20 text-green-400' : 'bg-gray-500/20 text-gray-400'}`}>
                      {wh.isActive ? 'Active' : 'Disabled'}
                    </span>
                    {wh.failureCount > 0 && <span className="text-xs bg-red-500/20 text-red-400 px-2 py-0.5 rounded-full">{wh.failureCount} failures</span>}
                  </div>
                  <p className="text-sm text-gray-400 font-mono">{wh.url}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => handleTest(wh.id)} disabled={testingId === wh.id} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-xs disabled:opacity-50">
                    <Play className="w-3 h-3" /> {testingId === wh.id ? 'Testing...' : 'Test'}
                  </button>
                  <button onClick={() => handleDelete(wh.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>

              <div className="flex flex-wrap gap-1.5 mb-3">
                {wh.events.map(e => (
                  <span key={e} className="text-xs bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded">{e}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span className="font-mono bg-gray-800 px-2 py-1 rounded">
                  {showSecret[wh.id] ? wh.secret : '••••••••••••••••'}
                </span>
                <button onClick={() => setShowSecret(p => ({ ...p, [wh.id]: !p[wh.id] }))} className="text-gray-500 hover:text-gray-300">
                  {showSecret[wh.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
                {wh.lastTriggeredAt && <span>Last: {new Date(wh.lastTriggeredAt).toLocaleString()}</span>}
              </div>

              {wh.deliveries.length > 0 && (
                <div className="mt-3 border-t border-gray-800 pt-3">
                  <p className="text-xs text-gray-500 mb-1.5">Recent deliveries</p>
                  <div className="space-y-1">
                    {wh.deliveries.map(d => (
                      <div key={d.id} className="flex items-center gap-2 text-xs">
                        {d.success ? <CheckCircle2 className="w-3.5 h-3.5 text-green-400" /> : <XCircle className="w-3.5 h-3.5 text-red-400" />}
                        <span className="text-gray-300">{d.event}</span>
                        <span className="text-gray-500">{d.statusCode ?? '-'}</span>
                        <span className="text-gray-600">{new Date(d.createdAt).toLocaleTimeString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4">Add Webhook</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Webhook name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.url} onChange={e => setForm(p => ({ ...p, url: e.target.value }))} placeholder="https://hooks.zapier.com/..." className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <div>
                <p className="text-sm text-gray-400 mb-2">Events to subscribe to:</p>
                <div className="grid grid-cols-2 gap-1.5 max-h-48 overflow-y-auto">
                  {events.map(e => (
                    <label key={e} className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer hover:text-white">
                      <input type="checkbox" checked={form.events.includes(e)} onChange={() => toggleEvent(e)} className="rounded" />
                      {e}
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Add Webhook</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
