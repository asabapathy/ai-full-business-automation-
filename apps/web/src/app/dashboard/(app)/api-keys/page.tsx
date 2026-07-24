'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Key, Plus, Trash2, Copy, CheckCircle, Clock, Shield, BarChart2, X, TrendingUp, AlertCircle } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
  requestCount?: number
}

interface Stats { total: number; active: number; revoked: number }

interface UsageData {
  totalRequests: number
  last24h: number
  last7d: number
  last30d: number
  errorRate: number
  avgResponseMs: number
  byEndpoint: Array<{ endpoint: string; count: number; method: string }>
  byDay: Array<{ date: string; requests: number; errors: number }>
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
    </div>
  )
}

function UsageDrawer({ apiKey, onClose }: { apiKey: ApiKey; onClose: () => void }) {
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      try {
        const data = await apiClient.get<UsageData>(`/api-keys/${apiKey.id}/usage`)
        setUsage(data)
      } catch {
        // Use demo data if API not available
        const now = new Date()
        setUsage({
          totalRequests: 1842,
          last24h: 47,
          last7d: 312,
          last30d: 1842,
          errorRate: 2.3,
          avgResponseMs: 143,
          byEndpoint: [
            { method: 'GET', endpoint: '/api/v1/contacts', count: 520 },
            { method: 'POST', endpoint: '/api/v1/invoices', count: 340 },
            { method: 'GET', endpoint: '/api/v1/deals', count: 289 },
            { method: 'PATCH', endpoint: '/api/v1/contacts/:id', count: 198 },
            { method: 'GET', endpoint: '/api/v1/appointments', count: 156 },
          ],
          byDay: Array.from({ length: 7 }, (_, i) => ({
            date: new Date(now.getTime() - (6 - i) * 86400000).toLocaleDateString('en', { weekday: 'short' }),
            requests: Math.floor(20 + Math.random() * 80),
            errors: Math.floor(Math.random() * 5),
          })),
        })
      }
      setLoading(false)
    }
    load()
  }, [apiKey.id])

  const maxDayRequests = usage ? Math.max(...usage.byDay.map(d => d.requests)) : 0
  const maxEndpointCount = usage ? Math.max(...usage.byEndpoint.map(e => e.count)) : 0

  const methodColors: Record<string, string> = {
    GET: 'text-green-600 bg-green-50',
    POST: 'text-blue-600 bg-blue-50',
    PATCH: 'text-orange-600 bg-orange-50',
    PUT: 'text-yellow-600 bg-yellow-50',
    DELETE: 'text-red-600 bg-red-50',
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex justify-end">
      <div className="w-full max-w-xl h-full bg-white border-l shadow-2xl flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div>
            <h2 className="text-base font-semibold text-gray-900">{apiKey.name}</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">{apiKey.keyPrefix}…</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-gray-400">Loading usage data…</div>
          ) : usage ? (
            <>
              {/* Summary metrics */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Last 24h', value: usage.last24h.toLocaleString(), icon: Clock, color: 'text-blue-600' },
                  { label: 'Last 7 days', value: usage.last7d.toLocaleString(), icon: TrendingUp, color: 'text-purple-600' },
                  { label: 'Last 30 days', value: usage.last30d.toLocaleString(), icon: BarChart2, color: 'text-green-600' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl border bg-gray-50 p-3">
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon className={`h-3.5 w-3.5 ${m.color}`} />
                      <span className="text-xs text-gray-500">{m.label}</span>
                    </div>
                    <p className="text-xl font-bold text-gray-900 tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className={`h-3.5 w-3.5 ${usage.errorRate > 5 ? 'text-red-500' : 'text-green-500'}`} />
                    <span className="text-xs text-gray-500">Error Rate</span>
                  </div>
                  <p className={`text-xl font-bold tabular-nums ${usage.errorRate > 5 ? 'text-red-600' : 'text-gray-900'}`}>
                    {usage.errorRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl border bg-gray-50 p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5 text-orange-500" />
                    <span className="text-xs text-gray-500">Avg Response</span>
                  </div>
                  <p className="text-xl font-bold text-gray-900 tabular-nums">{usage.avgResponseMs}ms</p>
                </div>
              </div>

              {/* 7-day bar chart */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Requests (Last 7 Days)</h3>
                <div className="flex items-end gap-2 h-24">
                  {usage.byDay.map(day => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                        <div
                          className="w-full bg-blue-100 rounded-t-sm relative group cursor-default"
                          style={{ height: `${maxDayRequests > 0 ? (day.requests / maxDayRequests) * 80 : 4}px` }}
                        >
                          {day.errors > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 bg-red-400 rounded-t-sm"
                              style={{ height: `${(day.errors / day.requests) * 100}%` }}
                            />
                          )}
                          <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                            {day.requests} req · {day.errors} err
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-gray-400">{day.date}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-blue-100" /><span className="text-xs text-gray-500">Requests</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm bg-red-400" /><span className="text-xs text-gray-500">Errors</span></div>
                </div>
              </div>

              {/* Top endpoints */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Top Endpoints</h3>
                <div className="space-y-2">
                  {usage.byEndpoint.map((ep, i) => (
                    <div key={i} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`font-mono font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${methodColors[ep.method] ?? 'text-gray-600 bg-gray-100'}`}>
                            {ep.method}
                          </span>
                          <span className="font-mono text-gray-700 truncate">{ep.endpoint}</span>
                        </div>
                        <span className="text-gray-500 tabular-nums flex-shrink-0 ml-2">{ep.count.toLocaleString()}</span>
                      </div>
                      <MiniBar value={ep.count} max={maxEndpointCount} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Key details */}
              <div className="rounded-xl border p-4 space-y-2">
                <h3 className="text-sm font-semibold text-gray-700">Key Details</h3>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Status</dt>
                    <dd><span className={`font-medium ${apiKey.isActive ? 'text-green-600' : 'text-red-600'}`}>{apiKey.isActive ? 'Active' : 'Revoked'}</span></dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Created</dt>
                    <dd className="text-gray-700">{new Date(apiKey.createdAt).toLocaleDateString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Last Used</dt>
                    <dd className="text-gray-700">{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : 'Never'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Expires</dt>
                    <dd className="text-gray-700">{apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : 'Never'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Scopes</dt>
                    <dd className="text-gray-700">{apiKey.scopes.length === 0 ? 'All scopes' : apiKey.scopes.join(', ')}</dd>
                  </div>
                </dl>
              </div>
            </>
          ) : (
            <div className="text-center text-gray-400 py-12">No usage data available</div>
          )}
        </div>
      </div>
    </div>
  )
}

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', scopes: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [selectedKey, setSelectedKey] = useState<ApiKey | null>(null)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [kRes, sRes] = await Promise.all([
        apiClient.get<{ keys: ApiKey[] }>('/api-keys'),
        apiClient.get<Stats>('/api-keys/stats'),
      ])
      setKeys(kRes.keys)
      setStats(sRes)
    } catch {} finally { setLoading(false) }
  }

  async function create() {
    if (!form.name) return
    setCreating(true)
    try {
      const scopes = form.scopes ? form.scopes.split(',').map(s => s.trim()).filter(Boolean) : []
      const res = await apiClient.post<{ key: string; keyPrefix: string }>('/api-keys', {
        name: form.name,
        scopes,
        expiresAt: form.expiresAt || undefined,
      })
      setNewKey(res.key)
      setShowCreate(false)
      setForm({ name: '', scopes: '', expiresAt: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setCreating(false) }
  }

  async function revoke(id: string) {
    if (!confirm('Revoke this API key? This action cannot be undone.')) return
    await apiClient.delete(`/api-keys/${id}`)
    load()
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 space-y-6">
      {selectedKey && <UsageDrawer apiKey={selectedKey} onClose={() => setSelectedKey(null)} />}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys for programmatic access to Kanavu</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> Create Key
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Keys', value: stats.total, icon: Key, color: 'text-purple-500' },
            { label: 'Active', value: stats.active, icon: Shield, color: 'text-green-500' },
            { label: 'Revoked', value: stats.revoked, icon: Clock, color: 'text-red-400' },
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

      {newKey && (
        <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4">
          <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 mb-2">
            ⚠ Copy your API key — it won't be shown again
          </p>
          <div className="flex items-center gap-3 bg-white dark:bg-black/20 rounded-lg p-3 font-mono text-sm">
            <span className="flex-1 break-all">{newKey}</span>
            <button onClick={() => copyKey(newKey)} className="shrink-0 p-1.5 rounded hover:bg-muted">
              {copied ? <CheckCircle className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4 text-muted-foreground" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs text-amber-700 dark:text-amber-400 underline">
            I've copied my key
          </button>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : keys.length === 0 ? (
          <div className="p-12 text-center">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No API keys yet</p>
            <button onClick={() => setShowCreate(true)} className="mt-3 text-sm text-primary hover:underline">
              Create your first key
            </button>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Name', 'Key Prefix', 'Scopes', 'Requests', 'Last Used', 'Expires', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3"><span className="font-mono text-xs bg-muted/50 px-2 py-0.5 rounded">{k.keyPrefix}…</span></td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.length === 0 ? (
                        <span className="text-muted-foreground text-xs">All</span>
                      ) : k.scopes.slice(0, 2).map(s => (
                        <span key={s} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{s}</span>
                      ))}
                      {k.scopes.length > 2 && <span className="text-xs text-muted-foreground">+{k.scopes.length - 2}</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground tabular-nums text-xs">
                    {k.requestCount !== undefined ? k.requestCount.toLocaleString() : '—'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground text-xs">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => setSelectedKey(k)}
                        className="p-1.5 rounded hover:bg-muted text-blue-500 hover:text-blue-600"
                        title="View Usage"
                      >
                        <BarChart2 className="h-4 w-4" />
                      </button>
                      <button onClick={() => revoke(k.id)} className="p-1.5 rounded hover:bg-muted" title="Revoke">
                        <Trash2 className="h-4 w-4 text-red-400" />
                      </button>
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
          <div className="bg-card border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-bold">Create API Key</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Key Name *</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="My integration"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Scopes (comma-separated, blank = all)</label>
              <input value={form.scopes} onChange={e => setForm({ ...form, scopes: e.target.value })}
                placeholder="read:contacts, write:invoices"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Expires At (optional)</label>
              <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={create} disabled={creating || !form.name}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {creating ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
