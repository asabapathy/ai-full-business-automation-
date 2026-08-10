'use client'

import { useState, useEffect } from 'react'
import { Inbox, Mail, CheckCircle, Sparkles, Send, RefreshCw } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface Thread {
  id: string
  subject: string
  fromAddress: string
  status: string
  isRead: boolean
  snippet?: string
  assignedToId?: string
  updatedAt: string
  emailMessages?: { id: string; body: string; direction: string; sentAt: string }[]
}

interface Stats { total: number; open: number; closed: number; unread: number }

const DEMO_THREADS: Thread[] = [
  {
    id: '1', subject: 'Question about your services', fromAddress: 'alice@example.com',
    status: 'OPEN', isRead: false, updatedAt: new Date(Date.now() - 900000).toISOString(),
    snippet: 'Hi, I was wondering if you offer weekend appointments…',
    emailMessages: [
      { id: 'm1', direction: 'inbound', body: 'Hi, I was wondering if you offer weekend appointments for HVAC service? We need someone out this Saturday if possible.', sentAt: new Date(Date.now() - 900000).toISOString() },
    ],
  },
  {
    id: '2', subject: 'Follow-up on quote', fromAddress: 'bob@company.com',
    status: 'OPEN', isRead: true, updatedAt: new Date(Date.now() - 3600000).toISOString(),
    snippet: 'Thanks for the estimate, I have a few questions…',
    emailMessages: [
      { id: 'm2', direction: 'inbound', body: 'Thanks for the estimate! I have a few questions about the timeline and materials you plan to use.', sentAt: new Date(Date.now() - 3600000).toISOString() },
      { id: 'm3', direction: 'outbound', body: 'Great questions! The project typically takes 2 days and we use top-tier materials only. Happy to discuss further.', sentAt: new Date(Date.now() - 1800000).toISOString() },
    ],
  },
  {
    id: '3', subject: 'Invoice #1042 received', fromAddress: 'billing@vendor.io',
    status: 'CLOSED', isRead: true, updatedAt: new Date(Date.now() - 86400000).toISOString(),
    snippet: 'Please find attached your invoice for last month services…',
    emailMessages: [],
  },
]

export default function TeamInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<Thread | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [closingId, setClosingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [threadsRes, statsRes] = await Promise.all([
        apiClient.get(`/team-inbox?status=${filter !== 'all' ? filter.toUpperCase() : ''}`) as any,
        apiClient.get('/team-inbox/stats') as any,
      ])
      setThreads(threadsRes.threads ?? [])
      setStats(statsRes)
    } catch {
      const filtered = filter === 'all' ? DEMO_THREADS : DEMO_THREADS.filter(t => t.status.toLowerCase() === filter)
      setThreads(filtered)
      setStats({ total: DEMO_THREADS.length, open: 2, closed: 1, unread: 1 })
    }
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const selectThread = async (t: Thread) => {
    try {
      const res = await apiClient.get(`/team-inbox/${t.id}`) as any
      setSelected(res.thread)
      apiClient.post(`/team-inbox/${t.id}/read`, {})
    } catch { setSelected(t) }
    setReplyBody('')
  }

  const getSuggestion = async () => {
    if (!selected) return
    setSuggesting(true)
    try {
      const res = await apiClient.get(`/team-inbox/${selected.id}/suggest-reply`) as any
      setReplyBody(res.suggestion ?? '')
      toast('AI suggestion applied', 'success')
    } catch { toast('Could not generate suggestion', 'error') }
    setSuggesting(false)
  }

  const sendReply = async () => {
    if (!selected || !replyBody.trim()) return
    setSending(true)
    try {
      await apiClient.post(`/team-inbox/${selected.id}/reply`, {
        body: replyBody,
        fromAddress: 'team@yourbusiness.com',
      })
      setReplyBody('')
      toast('Reply sent', 'success')
      load()
    } catch { toast('Failed to send reply', 'error') }
    setSending(false)
  }

  const closeThread = async (id: string) => {
    setClosingId(id)
    try {
      await apiClient.patch(`/team-inbox/${id}/status`, { status: 'CLOSED' })
      setSelected(null)
      toast('Thread closed', 'success')
      load()
    } catch { toast('Could not close thread', 'error') }
    setClosingId(null)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ background: 'hsl(var(--background))' }}>
      {/* Thread list sidebar */}
      <div
        className="w-80 flex flex-col shrink-0"
        style={{ borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
      >
        <div className="p-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2 mb-3">
            <Inbox className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-foreground text-sm">Team Inbox</h1>
            {stats && (
              <span
                className="ml-auto rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{ background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }}
              >
                {stats.open} open
              </span>
            )}
          </div>
          <div className="flex gap-1">
            {(['open', 'all', 'closed'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="flex-1 py-1.5 rounded-lg text-xs font-medium transition-colors"
                style={filter === f
                  ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4' }
                  : { color: 'hsl(var(--muted-foreground))' }
                }
              >
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--background))' }}>
                  <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
                  <div className="h-2.5 w-1/2 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
                </div>
              ))}
            </div>
          ) : threads.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No threads found.</p>
          ) : threads.map(t => (
            <button
              key={t.id}
              onClick={() => selectThread(t)}
              className="w-full text-left px-4 py-3 transition-colors"
              style={{
                borderBottom: '1px solid hsl(var(--border))',
                background: selected?.id === t.id ? 'rgba(6,182,212,0.08)' : 'transparent',
              }}
            >
              <div className="flex items-start justify-between gap-2 mb-0.5">
                <span className="text-sm font-medium text-foreground truncate">{t.subject}</span>
                {!t.isRead && (
                  <span className="h-2 w-2 rounded-full shrink-0 mt-1.5" style={{ background: '#06b6d4' }} />
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{t.fromAddress}</p>
              {t.snippet && <p className="text-xs truncate mt-0.5" style={{ color: 'hsl(var(--muted-foreground))', opacity: 0.65 }}>{t.snippet}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Thread detail */}
      <div className="flex-1 flex flex-col min-w-0">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Select a thread to read</p>
            </div>
          </div>
        ) : (
          <>
            <div
              className="px-5 py-3 flex items-center justify-between shrink-0"
              style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            >
              <div>
                <p className="font-semibold text-foreground text-sm">{selected.subject}</p>
                <p className="text-xs text-muted-foreground">{selected.fromAddress}</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={getSuggestion}
                  disabled={suggesting}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                  style={{ border: '1px solid rgba(6,182,212,0.25)' }}
                >
                  {suggesting
                    ? <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    : <Sparkles className="h-3.5 w-3.5" />}
                  AI Suggest
                </button>
                <button
                  onClick={() => closeThread(selected.id)}
                  disabled={closingId === selected.id}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50 transition-colors"
                  style={{ color: '#34d399', border: '1px solid rgba(52,211,153,0.25)', background: 'rgba(52,211,153,0.06)' }}
                >
                  <CheckCircle className="h-3.5 w-3.5" />
                  {closingId === selected.id ? 'Closing…' : 'Close'}
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(selected.emailMessages ?? []).map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-lg rounded-2xl px-4 py-3 text-sm"
                    style={msg.direction === 'outbound'
                      ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                      : { background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }
                    }
                  >
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className="text-[10px] mt-1" style={{ opacity: 0.6 }}>
                      {new Date(msg.sentAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              {(selected.emailMessages ?? []).length === 0 && (
                <p className="text-center text-xs text-muted-foreground py-8">No messages in this thread yet.</p>
              )}
            </div>

            <div
              className="p-4 shrink-0"
              style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            >
              <textarea
                rows={3}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Type a reply…"
                className="w-full rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={sendReply}
                  disabled={sending || !replyBody.trim()}
                  className="flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? 'Sending…' : 'Send Reply'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
