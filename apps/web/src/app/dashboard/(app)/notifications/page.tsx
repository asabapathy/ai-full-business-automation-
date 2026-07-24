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
  info: <Info className="h-4 w-4 text-blue-500" />,
  warning: <AlertCircle className="h-4 w-4 text-yellow-500" />,
  success: <CheckCircle className="h-4 w-4 text-green-500" />,
  error: <AlertCircle className="h-4 w-4 text-red-500" />,
  action: <Zap className="h-4 w-4 text-purple-500" />,
}

export default function NotificationsPage() {
  const [data, setData] = useState<NotifPage | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [markingAll, setMarkingAll] = useState(false)

  useEffect(() => { load() }, [page])

  async function load() {
    setLoading(true)
    try {
      const res = await apiClient.get<NotifPage>(`/notification-center?page=${page}&limit=20`)
      setData(res)
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

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Notifications</h1>
          {data && data.unread > 0 && (
            <span className="bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-full">
              {data.unread}
            </span>
          )}
        </div>
        {data && data.unread > 0 && (
          <button onClick={markAllRead} disabled={markingAll}
            className="flex items-center gap-2 border px-3 py-2 rounded-lg text-sm font-medium hover:bg-muted disabled:opacity-50">
            <CheckCheck className="h-4 w-4" />
            {markingAll ? 'Marking…' : 'Mark all read'}
          </button>
        )}
      </div>

      {loading && !data ? (
        <div className="text-center py-12 text-muted-foreground">Loading…</div>
      ) : !data || data.notifications.length === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-muted-foreground">No notifications</p>
        </div>
      ) : (
        <>
          <div className="space-y-2">
            {data.notifications.map(n => (
              <div key={n.id}
                className={`bg-card border rounded-xl p-4 flex items-start gap-4 transition-colors ${!n.isRead ? 'border-primary/30 bg-primary/5' : ''}`}>
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
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline mt-1.5">
                      View <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {!n.isRead && (
                    <button onClick={() => markRead(n.id)} title="Mark read"
                      className="p-1.5 rounded hover:bg-muted transition-colors">
                      <Check className="h-4 w-4 text-green-500" />
                    </button>
                  )}
                  <button onClick={() => remove(n.id)} title="Delete"
                    className="p-1.5 rounded hover:bg-muted transition-colors">
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {data.pages > 1 && (
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1 || loading}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-muted">
                Previous
              </button>
              <span className="text-sm text-muted-foreground">Page {data.page} of {data.pages}</span>
              <button onClick={() => setPage(p => Math.min(data.pages, p + 1))} disabled={page === data.pages || loading}
                className="px-3 py-1.5 border rounded-lg text-sm disabled:opacity-40 hover:bg-muted">
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
