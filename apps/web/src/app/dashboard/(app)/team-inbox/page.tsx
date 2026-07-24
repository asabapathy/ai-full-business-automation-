'use client'

import { useState, useEffect } from 'react'
import { Inbox, Mail, User, CheckCircle, Circle, Sparkles, Send } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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

export default function TeamInboxPage() {
  const [threads, setThreads] = useState<Thread[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [selected, setSelected] = useState<Thread | null>(null)
  const [replyBody, setReplyBody] = useState('')
  const [suggestion, setSuggestion] = useState('')
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('open')
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const [threadsRes, statsRes] = await Promise.all([
        apiClient.get(`/team-inbox?status=${filter !== 'all' ? filter.toUpperCase() : ''}`) as any,
        apiClient.get('/team-inbox/stats') as any,
      ])
      setThreads(threadsRes.threads ?? [])
      setStats(statsRes)
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [filter])

  const selectThread = async (t: Thread) => {
    try {
      const res = await apiClient.get(`/team-inbox/${t.id}`) as any
      setSelected(res.thread)
      apiClient.post(`/team-inbox/${t.id}/read`, {})
    } catch { setSelected(t) }
    setSuggestion('')
    setReplyBody('')
  }

  const getSuggestion = async () => {
    if (!selected) return
    try {
      const res = await apiClient.get(`/team-inbox/${selected.id}/suggest-reply`) as any
      setSuggestion(res.suggestion ?? '')
      setReplyBody(res.suggestion ?? '')
    } catch {}
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
      setSuggestion('')
      load()
    } catch {}
    setSending(false)
  }

  const closeThread = async (id: string) => {
    try {
      await apiClient.patch(`/team-inbox/${id}/status`, { status: 'CLOSED' })
      setSelected(null)
      load()
    } catch {}
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      {/* Thread list */}
      <div className="w-80 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
        <div className="p-4 border-b">
          <h1 className="font-bold text-gray-900 flex items-center gap-2">
            <Inbox className="h-5 w-5 text-blue-600" />
            Team Inbox
          </h1>
          {stats && (
            <div className="flex gap-3 mt-2 text-xs text-gray-500">
              <span>{stats.open} open</span>
              <span>{stats.unread} unread</span>
            </div>
          )}
          <div className="flex gap-1 mt-3">
            {(['open', 'all', 'closed'] as const).map(f => (
              <button key={f} onClick={() => setFilter(f)} className={`flex-1 py-1 rounded text-xs font-medium transition-colors ${filter === f ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}>
                {f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {loading ? (
            <div className="p-4 text-center text-sm text-gray-400">Loading...</div>
          ) : threads.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-400">No threads</div>
          ) : threads.map(t => (
            <button
              key={t.id}
              onClick={() => selectThread(t)}
              className={`w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors ${selected?.id === t.id ? 'bg-blue-50' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={`text-sm font-medium truncate ${!t.isRead ? 'text-gray-900' : 'text-gray-600'}`}>{t.subject}</span>
                {!t.isRead && <Circle className="h-2 w-2 fill-blue-600 text-blue-600 shrink-0 mt-1.5" />}
              </div>
              <p className="text-xs text-gray-500 truncate mt-0.5">{t.fromAddress}</p>
              {t.snippet && <p className="text-xs text-gray-400 truncate mt-0.5">{t.snippet}</p>}
            </button>
          ))}
        </div>
      </div>

      {/* Thread detail */}
      <div className="flex-1 flex flex-col rounded-xl border bg-white shadow-sm overflow-hidden">
        {!selected ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Mail className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a thread to read</p>
            </div>
          </div>
        ) : (
          <>
            <div className="p-4 border-b flex items-center justify-between">
              <div>
                <h2 className="font-semibold text-gray-900">{selected.subject}</h2>
                <p className="text-xs text-gray-500">{selected.fromAddress}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={getSuggestion} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-purple-700 border-purple-200 hover:bg-purple-50">
                  <Sparkles className="h-3.5 w-3.5" />
                  AI Suggest
                </button>
                <button onClick={() => closeThread(selected.id)} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium text-green-700 border-green-200 hover:bg-green-50">
                  <CheckCircle className="h-3.5 w-3.5" />
                  Close
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {(selected.emailMessages ?? []).map(msg => (
                <div key={msg.id} className={`flex ${msg.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-lg rounded-2xl px-4 py-3 text-sm ${msg.direction === 'outbound' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    <p className="whitespace-pre-wrap">{msg.body}</p>
                    <p className={`text-xs mt-1 ${msg.direction === 'outbound' ? 'text-blue-200' : 'text-gray-400'}`}>
                      {new Date(msg.sentAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t">
              <textarea
                rows={3}
                value={replyBody}
                onChange={e => setReplyBody(e.target.value)}
                placeholder="Type a reply..."
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-end mt-2">
                <button
                  onClick={sendReply}
                  disabled={sending || !replyBody.trim()}
                  className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  {sending ? 'Sending...' : 'Send'}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
