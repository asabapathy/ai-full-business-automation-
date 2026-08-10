'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Bell } from 'lucide-react'
import { apiClient } from '../../lib/api-client'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  actionUrl?: string
  isRead: boolean
  readAt?: string
  createdAt: string
}

const TYPE_ICONS: Record<string, string> = {
  new_lead: '👤',
  invoice_overdue: '⚠️',
  deal_won: '🏆',
  new_review: '⭐',
  workflow_action: '⚡',
  appointment: '📅',
  WARNING: '⚠️',
  info: '🔔',
  SUCCESS: '✅',
}

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 2) return 'just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const panelRef = useRef<HTMLDivElement>(null)

  const load = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        apiClient.get<{ notifications: Notification[] }>('/notification-center'),
        apiClient.get<{ count: number }>('/notification-center/unread-count'),
      ])
      setNotifications((listRes as any).notifications ?? [])
      setUnreadCount((countRes as any).count ?? 0)
    } catch {}
  }, [])

  useEffect(() => {
    load()
    const interval = setInterval(load, 60000)
    return () => clearInterval(interval)
  }, [load])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function markAllRead() {
    try { await apiClient.post('/notification-center/mark-all-read', {}) } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
    setUnreadCount(0)
  }

  async function markRead(id: string) {
    try { await apiClient.patch(`/notification-center/${id}/read`, {}) } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n))
    setUnreadCount(c => Math.max(0, c - 1))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => { setOpen(o => !o); if (!open) load() }}
        className="relative p-2 rounded-lg transition-colors hover:bg-white/5 text-muted-foreground hover:text-foreground"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span
            className="absolute top-1 right-1 min-w-[16px] h-4 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1"
            style={{ background: '#06b6d4', boxShadow: '0 0 8px rgba(6,182,212,0.5)' }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 mt-2 w-80 rounded-2xl shadow-2xl overflow-hidden z-50"
          style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-primary hover:underline transition-colors">
                Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-sm text-muted-foreground">
                <Bell className="h-8 w-8 mx-auto mb-2 opacity-20" />
                No notifications yet
              </div>
            ) : (
              <ul>
                {notifications.map(notif => (
                  <li key={notif.id}>
                    <button
                      onClick={() => {
                        if (!notif.isRead) markRead(notif.id)
                        if (notif.actionUrl) { window.location.href = notif.actionUrl; setOpen(false) }
                      }}
                      className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors"
                      style={{
                        borderBottom: '1px solid hsl(var(--border))',
                        background: !notif.isRead ? 'rgba(6,182,212,0.04)' : undefined,
                      }}
                    >
                      <span className="text-lg mt-0.5 shrink-0">
                        {TYPE_ICONS[notif.type] ?? '🔔'}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-snug ${!notif.isRead ? 'text-foreground' : 'text-muted-foreground'}`}>
                            {notif.title}
                          </p>
                          {!notif.isRead && (
                            <span className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: '#06b6d4' }} />
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{notif.message}</p>
                        <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <a
              href="/dashboard/notifications"
              className="text-xs text-primary hover:underline"
              onClick={() => setOpen(false)}
            >
              View all notifications
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
