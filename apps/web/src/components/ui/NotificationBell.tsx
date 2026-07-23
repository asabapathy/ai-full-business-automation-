'use client'

import { useState, useEffect, useRef } from 'react'

interface Notification {
  id: string
  type: string
  title: string
  body: string
  actionUrl?: string
  readAt?: string
  createdAt: string
}

const DEMO_NOTIFICATIONS: Notification[] = [
  { id: '1', type: 'new_lead', title: 'New lead captured', body: 'Sarah Mitchell just submitted a contact form from your website.', actionUrl: '/dashboard/crm', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '2', type: 'invoice_overdue', title: 'Invoice overdue', body: 'Invoice #INV-0042 for $2,400 is 7 days past due.', actionUrl: '/dashboard/invoices', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', type: 'deal_won', title: 'Deal won! 🎉', body: 'The "Website Redesign" deal for $8,500 has been marked as won.', actionUrl: '/dashboard/sales', readAt: new Date(Date.now() - 3600000).toISOString(), createdAt: new Date(Date.now() - 86400000).toISOString() },
  { id: '4', type: 'new_review', title: 'New 5-star review', body: 'David K. left you a 5-star review on Google: "Excellent service!"', actionUrl: '/dashboard/reviews', createdAt: new Date(Date.now() - 172800000).toISOString() },
]

function timeAgo(date: string): string {
  const diff = Date.now() - new Date(date).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

const TYPE_ICONS: Record<string, string> = {
  new_lead: '👤',
  invoice_overdue: '⚠️',
  deal_won: '🏆',
  new_review: '⭐',
  workflow_action: '⚡',
  appointment: '📅',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>(DEMO_NOTIFICATIONS)
  const panelRef = useRef<HTMLDivElement>(null)

  const unreadCount = notifications.filter(n => !n.readAt).length

  useEffect(() => {
    Promise.all([
      fetch('/api/notifications').then(r => r.json()).catch(() => null),
      fetch('/api/notifications/unread-count').then(r => r.json()).catch(() => null),
    ]).then(([data]) => {
      if (data?.notifications?.length) setNotifications(data.notifications)
    })
  }, [])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  async function markAllRead() {
    try {
      await fetch('/api/notifications/mark-all-read', { method: 'POST' })
    } catch {}
    setNotifications(prev => prev.map(n => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
  }

  async function markRead(id: string) {
    try {
      await fetch('/api/notifications/mark-read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids: [id] }),
      })
    } catch {}
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
  }

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 rounded-lg hover:bg-white/5 text-gray-400 hover:text-white transition-colors"
        aria-label="Notifications"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-[#1a1a2e] border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
            <h3 className="text-sm font-semibold text-white">Notifications</h3>
            {unreadCount > 0 && (
              <button onClick={markAllRead} className="text-xs text-purple-400 hover:text-purple-300 transition-colors">
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-sm text-gray-500">No notifications</div>
            ) : (
              <ul>
                {notifications.map(notif => (
                  <li key={notif.id}>
                    <button
                      onClick={() => {
                        markRead(notif.id)
                        if (notif.actionUrl) { window.location.href = notif.actionUrl; setOpen(false) }
                      }}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${!notif.readAt ? 'bg-purple-500/5' : ''}`}
                    >
                      <span className="text-xl mt-0.5 shrink-0">{TYPE_ICONS[notif.type] ?? '🔔'}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium ${!notif.readAt ? 'text-white' : 'text-gray-300'}`}>{notif.title}</p>
                          {!notif.readAt && <span className="w-2 h-2 bg-purple-500 rounded-full shrink-0 mt-1" />}
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{notif.body}</p>
                        <p className="text-xs text-gray-500 mt-1">{timeAgo(notif.createdAt)}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
