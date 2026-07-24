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

  const actionColor: Record<string, string> = {
    create: 'bg-green-100 text-green-700',
    update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-600',
    view: 'bg-gray-100 text-gray-600',
    login: 'bg-purple-100 text-purple-700',
    logout: 'bg-orange-100 text-orange-700',
  }

  const entities = ['contact', 'appointment', 'invoice', 'campaign', 'user', 'organization', 'form', 'document']
  const actions = ['create', 'update', 'delete', 'view', 'login', 'logout', 'send', 'redeem']

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Audit Log</h1>
        <p className="text-sm text-gray-500 mt-1">Track all actions and changes in your organization</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">Actions Today</p>
            <Activity className="h-4 w-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.actionsToday}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-500">This Week</p>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-gray-900 mt-1">{stats.actionsThisWeek}</p>
        </div>
        <div className="sm:col-span-2 rounded-xl border bg-white p-4 shadow-sm">
          <p className="text-sm text-gray-500 mb-2">Top Entities</p>
          <div className="flex flex-wrap gap-2">
            {stats.topEntities.slice(0, 5).map(e => (
              <span key={e.entity} className="rounded-full bg-blue-50 px-3 py-0.5 text-xs font-medium text-blue-700">
                {e.entity} <span className="opacity-60">({e.count})</span>
              </span>
            ))}
            {stats.topEntities.length === 0 && <span className="text-sm text-gray-400">No data</span>}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Entity</label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.entity} onChange={e => setFilters(f => ({ ...f, entity: e.target.value }))}>
              <option value="">All entities</option>
              {entities.map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Action</label>
            <select className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value }))}>
              <option value="">All actions</option>
              {actions.map(a => <option key={a} value={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">From</label>
            <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.from} onChange={e => setFilters(f => ({ ...f, from: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">To</label>
            <input type="date" className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" value={filters.to} onChange={e => setFilters(f => ({ ...f, to: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Log table */}
      <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No log entries found</div>
        ) : (
          <>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Time</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">User</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Action</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Entity</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">IP</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {logs.map(log => (
                  <>
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</td>
                      <td className="px-4 py-3">
                        {log.user ? (
                          <><p className="font-medium text-gray-900 text-xs">{log.user.firstName} {log.user.lastName}</p><p className="text-xs text-gray-500">{log.user.email}</p></>
                        ) : <span className="text-gray-400 text-xs">System</span>}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${actionColor[log.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-700">{log.entity}</p>
                        {log.entityId && <p className="text-xs text-gray-400 font-mono">{log.entityId.slice(0, 8)}...</p>}
                      </td>
                      <td className="px-4 py-3 text-gray-500 text-xs font-mono">{log.ipAddress ?? '—'}</td>
                      <td className="px-4 py-3">
                        {log.changes && Object.keys(log.changes).length > 0 && (
                          <button onClick={() => setExpanded(expanded === log.id ? null : log.id)} className="text-xs text-blue-600 hover:underline">
                            {expanded === log.id ? 'Hide' : 'Changes'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {expanded === log.id && log.changes && (
                      <tr key={`${log.id}-expanded`} className="bg-gray-50">
                        <td colSpan={6} className="px-4 py-3">
                          <pre className="text-xs text-gray-700 overflow-x-auto">{JSON.stringify(log.changes, null, 2)}</pre>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
            <div className="flex items-center justify-between px-4 py-3 border-t bg-gray-50">
              <p className="text-xs text-gray-500">{total} total entries</p>
              <div className="flex gap-2">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40">
                  Previous
                </button>
                <span className="px-3 py-1 text-xs text-gray-600">Page {page}</span>
                <button onClick={() => setPage(p => p + 1)} disabled={logs.length < 25} className="px-3 py-1 text-xs rounded border border-gray-200 hover:bg-white disabled:opacity-40">
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
