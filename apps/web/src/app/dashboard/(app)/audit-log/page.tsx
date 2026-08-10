'use client'

import { useState, useEffect } from 'react'
import { ShieldCheck, Search, Filter, TrendingUp, Activity } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface AuditLog {
  id: string
  userId?: string
  user?: { firstName: string; lastName: string; email: string }
  action: string
  entity: string
  entityId?: string
  changes?: Record<string, any>
  ipAddress?: string
  userAgent?: string
  createdAt: string
}

interface Stats {
  actionsToday: number
  actionsThisWeek: number
  topEntities: Array<{ entity: string; count: number }>
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [stats, setStats] = useState<Stats>({ actionsToday: 0, actionsThisWeek: 0, topEntities: [] })
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ entity: '', action: '', from: '', to: '' })
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: String(page), limit: '25' })
      if (filters.entity) params.set('entity', filters.entity)
      if (filters.action) params.set('action', filters.action)
      if (filters.from) params.set('from', filters.from)
      if (filters.to) params.set('to', filters.to)

      const [logRes, statRes] = await Promise.all([
        apiClient.get(`/audit-log?${params}`) as any,
        apiClient.get('/audit-log/stats') as any,
      ])
      setLogs(logRes?.logs ?? [])
      setTotal(logRes?.total ?? 0)
      setStats(statRes ?? stats)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [page, filters])

  const actionStyle: Record<string, React.CSSProperties> = {
    create: { background: 'rgba(52,211,153,0.15)', color: '#34d399' },
    update: { background: 'rgba(6,182,212,0.15)', color: '#06b6d4' },
    delete: { background: 'rgba(248,113,113,0.15)', color: '#f87171' },
    view: { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' },
    login: { background: 'rgba(168,85,247,0.15)', color: '#a78bfa' },
    logout: { background: 'rgba(251,146,60,0.15)', color: '#fb923c' },
  }

  const actionFallbackStyle: React.CSSProperties = { background: 'hsl(var(--muted))', color: 'hsl(var(--muted-foreground))' }

  const entities = ['contact', 'appointment', 'invoice', 'campaign', 'user', 'organization', 'form', 'document']
  const actions = ['create', 'update', 'delete', 'view', 'login', 'logout', 'send', 'redeem']

  const inputStyle: React.CSSProperties = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
  const inputClass = 'w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Audit Log</h1>
        <p className="text-sm text-muted-foreground mt-1">Track all actions and changes in your organization</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">Actions Today</p>
            <Activity className="h-4 w-4" style={{ color: '#06b6d4' }} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.actionsToday}</p>
        </div>
        <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">This Week</p>
            <TrendingUp className="h-4 w-4" style={{ color: '#34d399' }} />
          </div>
          <p className="text-2xl font-bold text-foreground mt-1">{stats.actionsThisWeek}</p>
        </div>
        <div className="sm:col-span-2 rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
          <p className="text-sm text-muted-foreground mb-2">Top Entities</p>
          <div className="flex flex-wrap gap-2">
            {stats.topEntities.slice(0, 5).map(e => (
              <span key={e.entity} className="rounded-full px-3 py-0.5 text-xs font-medium" style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
                {e.entity} <span className="opacity-60">({e.count})</span>
              </span>
            ))}
            {stats.topEntities.length === 0 && <span className="text-sm text-muted-foreground">No data</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border p-4" style={{ background: 'hsl(var(--card))' }}>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Entity</label>
            <select className={inputClass} style={inputStyle} value={filters.entity} onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}>
              <option value="">All entities</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">Action</label>
            <select className={inputClass} style={inputStyle} value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
              <option value="">All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">From</label>
            <input type="date" className={inputClass} style={inputStyle} value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1">To</label>
            <input type="date" className={inputClass} style={inputStyle} value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No log entries found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-muted">
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <><p className="font-medium text-foreground text-xs">{log.user.firstName} {log.user.lastName}</p><p className="text-xs text-muted-foreground">{log.user.email}</p></>
                        ) : <span className="text-muted-foreground text-xs">System</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex rounded-full px-2 py-0.5 text-xs font-medium" style={actionStyle[log.action] ?? actionFallbackStyle}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-muted-foreground">{log.entity}</p>
                        {log.entityId && <p className="text-xs text-muted-foreground font-mono">{log.entityId.slice(0, 8)}...</p>}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs font-mono">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs hover:underline" style={{ color: '#06b6d4' }}>
                            {expanded === log.id ? 'Hide' : 'Changes'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === log.id && log.changes && (
                      <tr key={`${log.id}-expanded`} style={{ background: 'hsl(var(--muted))' }}>
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-muted-foreground overflow-x-auto">{JSON.stringify(log.changes, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t" style={{ background: 'hsl(var(--muted))' }}>
              <p className="text-xs text-muted-foreground">{total} total entries</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs rounded hover:bg-card disabled:opacity-40" style={{ border: '1px solid hsl(var(--border))' }}>
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-muted-foreground">Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 25} className="px-3 py-1 text-xs rounded hover:bg-card disabled:opacity-40" style={{ border: '1px solid hsl(var(--border))' }}>
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
