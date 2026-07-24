'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Key, Plus, Trash2, Copy, CheckCircle, Clock, Shield } from 'lucide-react'

interface ApiKey {
  id: string
  name: string
  keyPrefix: string
  scopes: string[]
  lastUsedAt?: string
  expiresAt?: string
  isActive: boolean
  createdAt: string
}

interface Stats { total: number; active: number; revoked: number }

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [form, setForm] = useState({ name: '', scopes: '', expiresAt: '' })
  const [creating, setCreating] = useState(false)
  const [newKey, setNewKey] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

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
    } finally { setLoading(false) }
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">API Keys</h1>
          <p className="text-muted-foreground text-sm mt-1">Manage API keys for programmatic access</p>
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
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Name', 'Key Prefix', 'Scopes', 'Last Used', 'Expires', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {keys.map(k => (
                <tr key={k.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{k.name}</td>
                  <td className="px-4 py-3 font-mono text-xs bg-muted/30 rounded">{k.keyPrefix}…</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-1">
                      {k.scopes.length === 0 ? (
                        <span className="text-muted-foreground">All scopes</span>
                      ) : k.scopes.map(s => (
                        <span key={s} className="bg-primary/10 text-primary px-1.5 py-0.5 rounded text-xs">{s}</span>
                      ))}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {k.expiresAt ? new Date(k.expiresAt).toLocaleDateString() : 'Never'}
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => revoke(k.id)} className="p-1.5 rounded hover:bg-muted" title="Revoke">
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
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
              <label className="text-sm font-medium block mb-1">Key Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })}
                placeholder="My integration"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Scopes (comma-separated, leave blank for all)</label>
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
