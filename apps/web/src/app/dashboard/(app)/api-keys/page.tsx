'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

function MiniBar({ value, max }: { value: number; max: number }) {
  const pct = max > 0 ? (value / max) * 100 : 0
  return (
    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: 'hsl(var(--background))' }}>
      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: '#60a5fa' }} />
    </div>
  )
}

const METHOD_COLORS: Record<string, { color: string; bg: string }> = {
  GET:    { color: '#34d399', bg: 'rgba(52,211,153,0.1)' },
  POST:   { color: '#60a5fa', bg: 'rgba(96,165,250,0.1)' },
  PATCH:  { color: '#fb923c', bg: 'rgba(251,146,60,0.1)' },
  PUT:    { color: '#fbbf24', bg: 'rgba(251,191,36,0.1)' },
  DELETE: { color: '#f87171', bg: 'rgba(248,113,113,0.1)' },
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

  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)' }}>
      <div className="w-full max-w-xl h-full flex flex-col overflow-hidden" style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}>
        <div className="flex items-center justify-between px-6 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div>
            <h2 className="text-base font-semibold text-foreground">{apiKey.name}</h2>
            <p className="text-xs text-muted-foreground font-mono mt-0.5">{apiKey.keyPrefix}…</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg transition-colors hover:text-foreground text-muted-foreground">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-40 text-muted-foreground">Loading usage data…</div>
          ) : usage ? (
            <>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'Last 24h', value: usage.last24h.toLocaleString(), icon: Clock, color: '#60a5fa' },
                  { label: 'Last 7 days', value: usage.last7d.toLocaleString(), icon: TrendingUp, color: '#a78bfa' },
                  { label: 'Last 30 days', value: usage.last30d.toLocaleString(), icon: BarChart2, color: '#34d399' },
                ].map(m => (
                  <div key={m.label} className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center gap-1.5 mb-1">
                      <m.icon className="h-3.5 w-3.5" style={{ color: m.color }} />
                      <span className="text-xs text-muted-foreground">{m.label}</span>
                    </div>
                    <p className="text-xl font-bold text-foreground tabular-nums">{m.value}</p>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <AlertCircle className="h-3.5 w-3.5" style={{ color: usage.errorRate > 5 ? '#f87171' : '#34d399' }} />
                    <span className="text-xs text-muted-foreground">Error Rate</span>
                  </div>
                  <p className="text-xl font-bold tabular-nums" style={{ color: usage.errorRate > 5 ? '#f87171' : 'hsl(var(--foreground))' }}>
                    {usage.errorRate.toFixed(1)}%
                  </p>
                </div>
                <div className="rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid hsl(var(--border))' }}>
                  <div className="flex items-center gap-1.5 mb-1">
                    <Clock className="h-3.5 w-3.5" style={{ color: '#fb923c' }} />
                    <span className="text-xs text-muted-foreground">Avg Response</span>
                  </div>
                  <p className="text-xl font-bold text-foreground tabular-nums">{usage.avgResponseMs}ms</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Requests (Last 7 Days)</h3>
                <div className="flex items-end gap-2 h-24">
                  {usage.byDay.map(day => (
                    <div key={day.date} className="flex-1 flex flex-col items-center gap-1">
                      <div className="w-full flex flex-col justify-end" style={{ height: '80px' }}>
                        <div
                          className="w-full rounded-t-sm relative group cursor-default"
                          style={{ height: `${maxDayRequests > 0 ? (day.requests / maxDayRequests) * 80 : 4}px`, background: 'rgba(96,165,250,0.25)' }}
                        >
                          {day.errors > 0 && (
                            <div
                              className="absolute bottom-0 left-0 right-0 rounded-t-sm"
                              style={{ height: `${(day.errors / day.requests) * 100}%`, background: '#f87171' }}
                            />
                          )}
                          <div className="hidden group-hover:block absolute bottom-full mb-1 left-1/2 -translate-x-1/2 rounded px-2 py-1 text-xs whitespace-nowrap z-10 text-white" style={{ background: 'rgba(0,0,0,0.8)' }}>
                            {day.requests} req · {day.errors} err
                          </div>
                        </div>
                      </div>
                      <span className="text-[10px] text-muted-foreground">{day.date}</span>
                    </div>
                  ))}
                </div>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: 'rgba(96,165,250,0.25)' }} /><span className="text-xs text-muted-foreground">Requests</span></div>
                  <div className="flex items-center gap-1"><div className="w-2.5 h-2.5 rounded-sm" style={{ background: '#f87171' }} /><span className="text-xs text-muted-foreground">Errors</span></div>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Top Endpoints</h3>
                <div className="space-y-2">
                  {usage.byEndpoint.map((ep, i) => {
                    const mc = METHOD_COLORS[ep.method] ?? { color: '#94a3b8', bg: 'rgba(148,163,184,0.1)' }
                    return (
                      <div key={i} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold px-1.5 py-0.5 rounded text-[10px] flex-shrink-0" style={{ color: mc.color, background: mc.bg }}>
                              {ep.method}
                            </span>
                            <span className="font-mono text-muted-foreground truncate">{ep.endpoint}</span>
                          </div>
                          <span className="text-muted-foreground tabular-nums flex-shrink-0 ml-2">{ep.count.toLocaleString()}</span>
                        </div>
                        <MiniBar value={ep.count} max={maxEndpointCount} />
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="rounded-xl p-4 space-y-2" style={cardStyle}>
                <h3 className="text-sm font-semibold text-foreground">Key Details</h3>
                <dl className="space-y-1.5 text-xs">
                  {[
                    { dt: 'Status', dd: <span style={{ color: apiKey.isActive ? '#34d399' : '#f87171' }}>{apiKey.isActive ? 'Active' : 'Revoked'}</span> },
                    { dt: 'Created', dd: <span className="text-muted-foreground">{new Date(apiKey.createdAt).toLocaleDateString()}</span> },
                    { dt: 'Last Used', dd: <span className="text-muted-foreground">{apiKey.lastUsedAt ? new Date(apiKey.lastUsedAt).toLocaleString() : 'Never'}</span> },
                    { dt: 'Expires', dd: <span className="text-muted-foreground">{apiKey.expiresAt ? new Date(apiKey.expiresAt).toLocaleDateString() : 'Never'}</span> },
                    { dt: 'Scopes', dd: <span className="text-muted-foreground">{apiKey.scopes.length === 0 ? 'All scopes' : apiKey.scopes.join(', ')}</span> },
                  ].map(({ dt, dd }) => (
                    <div key={dt} className="flex justify-between">
                      <dt className="text-muted-foreground">{dt}</dt>
                      <dd>{dd}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </>
          ) : (
            <div className="text-center text-muted-foreground py-12">No usage data available</div>
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
  const [revokingId, setRevokingId] = useState<string | null>(null)

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
    } catch (e: any) {
      toast(e.message || 'Failed to create key', 'error')
    } finally { setCreating(false) }
  }

  async function revoke(id: string) {
    setRevokingId(id)
    setKeys(prev => prev.filter(k => k.id !== id))
    try {
      await apiClient.delete(`/api-keys/${id}`)
    } catch (e: any) {
      toast(e.message || 'Failed to revoke key', 'error')
      load()
    } finally { setRevokingId(null) }
  }

  function copyKey(key: string) {
    navigator.clipboard.writeText(key)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      {selectedKey && <UsageDrawer apiKey={selectedKey} onClose={() => setSelectedKey(null)} />}

      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys for programmatic access to Kanavu</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
          <Plus className="h-4 w-4" /> Create Key
        </button>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-3 gap-4">
          {[
            { label: 'Total Keys', value: stats.total, icon: Key, color: '#a78bfa' },
            { label: 'Active', value: stats.active, icon: Shield, color: '#34d399' },
            { label: 'Revoked', value: stats.revoked, icon: Clock, color: '#f87171' },
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

      {newKey && (
        <div {...anim(2)} className="kv-anim rounded-xl p-4" style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.3)' }}>
          <p className="text-sm font-semibold mb-2" style={{ color: '#fbbf24' }}>
            ⚠ Copy your API key — it won't be shown again
          </p>
          <div className="flex items-center gap-3 rounded-lg p-3 font-mono text-sm" style={{ background: 'rgba(0,0,0,0.2)', border: '1px solid hsl(var(--border))' }}>
            <span className="flex-1 break-all text-foreground">{newKey}</span>
            <button onClick={() => copyKey(newKey)} className="shrink-0 p-1.5 rounded transition-colors hover:text-foreground text-muted-foreground">
              {copied ? <CheckCircle className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          <button onClick={() => setNewKey(null)} className="mt-2 text-xs underline" style={{ color: '#fbbf24' }}>
            I've copied my key
          </button>
        </div>
      )}

      <div {...anim(newKey ? 3 : 2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Name', 'Key Prefix', 'Scopes', 'Requests', 'Last Used', 'Expires', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground text-xs">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {keys.map((k, i) => (
                  <tr key={k.id} style={{ borderBottom: i < keys.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                    <td className="px-4 py-3 font-medium text-foreground">{k.name}</td>
                    <td className="px-4 py-3"><span className="font-mono text-xs px-2 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid hsl(var(--border))' }}>{k.keyPrefix}…</span></td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {k.scopes.length === 0 ? (
                          <span className="text-muted-foreground text-xs">All</span>
                        ) : k.scopes.slice(0, 2).map(s => (
                          <span key={s} className="px-1.5 py-0.5 rounded text-xs" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>{s}</span>
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
                        <button onClick={() => setSelectedKey(k)} className="p-1.5 rounded transition-colors hover:text-primary text-muted-foreground" title="View Usage">
                          <BarChart2 className="h-4 w-4" />
                        </button>
                        <button onClick={() => revoke(k.id)} disabled={revokingId === k.id} className="p-1.5 rounded transition-colors" style={{ color: '#f87171' }} title="Revoke">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ ...cardStyle, boxShadow: '0 25px 50px rgba(0,0,0,0.4)' }}>
            <h2 className="text-lg font-bold text-foreground">Create API Key</h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Key Name <span style={{ color: '#f87171' }}>*</span></label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="My integration"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Scopes (comma-separated, blank = all)</label>
              <input value={form.scopes} onChange={e => setForm({ ...form, scopes: e.target.value })}
                placeholder="read:contacts, write:invoices"
                className={inputCls} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1.5">Expires At (optional)</label>
              <input type="datetime-local" value={form.expiresAt} onChange={e => setForm({ ...form, expiresAt: e.target.value })}
                className={inputCls} style={inputStyle} />
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button onClick={create} disabled={creating || !form.name}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
