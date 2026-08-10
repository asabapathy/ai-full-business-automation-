'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { Bell, Check, CheckCheck, Trash2, ExternalLink, Info, AlertCircle, CheckCircle, Zap } from 'lucide-react'

interface Notification {
  id: string
  title: string
  message: string
  type: string
  isRead: boolean
  entityType?: string
  entityId?: string
  actionUrl?: string
  createdAt: string
  readAt?: string
}

interface NotifPage {
  notifications: Notification[]
  total: number
  unread: number
  page: number
  pages: number
}

const typeIcon: Record<string, React.ReactNode> = {
  info: <Info className="h-4 w-4" style={{ color: '#60a5fa' }} />,
  warning: <AlertCircle className="h-4 w-4" style={{ color: '#fbbf24' }} />,
  success: <CheckCircle className="h-4 w-4" style={{ color: '#34d399' }} />,
  error: <AlertCircle className="h-4 w-4" style={{ color: '#f87171' }} />,
  action: <Zap className="h-4 w-4" style={{ color: '#06b6d4' }} />,
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', title: 'New lead from website', message: 'Alice Johnson submitted the contact form', type: 'info', isRead: false, createdAt: new Date(Date.now() - 600000).toISOString() },
  { id: '2', title: 'Invoice paid', message: 'INV-001 has been paid by Mark Johnson ($4,500)', type: 'success', isRead: false, createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '3', title: 'Appointment reminder', message: 'HVAC service scheduled for tomorrow at 10am', type: 'action', isRead: true, createdAt: new Date(Date.now() - 86400000).toISOString() },
]

export default function NotificationsPage() {
  const [data, setData] = useState<NotifPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [markingAll, setMarkingAll] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const [deletingAll, setDeletingAll] = useState(false)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    try {
      const res = await apiClient.get<NotifPage>(`/notification-center?page=${page}&limit=20`)
      setData(res)
    } catch {
      setData({ notifications: DEMO_NOTIFICATIONS, total: 3, unread: 2, page: 1, pages: 1 })
    } finally { setLoading(false) }
  }

  async function markRead(id: string) {
    await apiClient.patch(`/notification-center/${id}/read`, {})
    setData(prev => prev ? {
      ...prev,
      unread: Math.max(0, prev.unread - 1),
      notifications: prev.notifications.map(n => n.id === id ? { ...n, isRead: true } : n),
    } : null)
  }

  async function markAllRead() {
    setMarkingAll(true)
    try {
      await apiClient.post('/notification-center/mark-all-read', {})
      setData(prev => prev ? {
        ...prev,
        unread: 0,
        notifications: prev.notifications.map(n => ({ ...n, isRead: true })),
      } : null)
    } finally { setMarkingAll(false) }
  }

  async function remove(id: string) {
    await apiClient.delete(`/notification-center/${id}`)
    setData(prev => prev ? {
      ...prev,
      total: prev.total - 1,
      notifications: prev.notifications.filter(n => n.id !== id),
    } : null)
  }

  async function deleteAll() {
    if (!data) return
    setDeletingAll(true)
    try {
      await Promise.all(data.notifications.map(n => apiClient.delete(`/notification-center/${n.id}`)))
      setData(prev => prev ? { ...prev, total: 0, unread: 0, notifications: [] } : null)
    } catch {
      void load()
    } finally {
      setDeletingAll(false)
    }
  }

  const displayed = data ? (filter === 'unread' ? data.notifications.filter(n => !n.isRead) : data.notifications) : []

  return (
    <div className="p-6 space-y-6 max-w-[900px]">
      <div className="kv-anim flex items-center justify-between gap-3" style={{ animationDelay: '0.04s' }}>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-foreground">Notifications</h1>
          {data && data.unread > 0 && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ background: '#06b6d4', color: 'white' }}>
              {data.unread}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {data && data.unread > 0 && (
            <button onClick={markAllRead} disabled={markingAll}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground disabled:opacity-50 transition-colors"
              style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
              <CheckCheck className="h-4 w-4" />
              {markingAll ? 'Marking…' : 'Mark all read'}
            </button>
          )}
          {data && data.notifications.length > 0 && (
            <button onClick={deleteAll} disabled={deletingAll}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium disabled:opacity-50 transition-colors"
              style={{ color: '#f87171', background: 'rgba(248,113,113,0.08)', border: '1px solid rgba(248,113,113,0.2)' }}>
              <Trash2 className="h-4 w-4" />
              {deletingAll ? 'Clearing…' : 'Clear all'}
            </button>
          )}
        </div>
      </div>

      {data && (
        <div className="flex gap-2">
          {(['all', 'unread'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="rounded-lg px-3 py-1.5 text-xs font-medium capitalize transition-all"
              style={filter === f
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
              }
            >
              {f === 'unread' ? `Unread (${data.unread})` : `All (${data.total})`}
            </button>
          ))}
        </div>
      )}

      {loading && !data ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : !data || displayed.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <>
          <div className="kv-anim space-y-2" style={{ animationDelay: '0.11s' }}>
            {displayed.map(n => (
              <div key={n.id}
                className="rounded-xl p-4 flex items-start gap-4 transition-colors"
                style={!n.isRead
                  ? { background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.2)' }
                  : { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
                }>
                <div className="mt-0.5 shrink-0">
                  {typeIcon[n.type] ?? typeIcon.info}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${!n.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                      {n.title}
                    </p>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Date(n.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">{n.message}</p>
                  {n.actionUrl && (
                    <a href={n.actionUrl} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs hover:underline mt-1.5" style={{ color: '#06b6d4' }}>
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} title="Mark read"
                      className="p-1.5 rounded hover:bg-muted transition-colors">
                      <Check className="h-4 w-4" style={{ color: '#34d399' }} />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} title="Delete"
                    className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-4 w-4" style={{ color: '#f87171' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages || loading}
                className="px-3 py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-40 transition-colors"
                style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
