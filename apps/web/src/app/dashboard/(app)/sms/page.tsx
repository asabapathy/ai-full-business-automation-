'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

const DEMO_CONVERSATIONS: Conversation[] = [
  { id: '1', phoneNumber: '+15551234567', contactName: 'Alice Johnson', lastMessage: 'Sounds good, see you then!', lastMessageAt: new Date(Date.now() - 600000).toISOString(), unreadCount: 1 },
  { id: '2', phoneNumber: '+15559876543', contactName: 'Bob Martinez', lastMessage: 'Can we reschedule?', lastMessageAt: new Date(Date.now() - 3600000).toISOString(), unreadCount: 0 },
  { id: '3', phoneNumber: '+15554445555', contactName: 'Carol White', lastMessage: 'Thank you for the quick response!', lastMessageAt: new Date(Date.now() - 86400000).toISOString(), unreadCount: 0 },
]

interface Conversation {
  id: string
  phoneNumber: string
  contactName?: string
  lastMessage?: string
  lastMessageAt?: string
  unreadCount: number
}

interface Message {
  id: string
  direction: 'inbound' | 'outbound'
  body: string
  createdAt: string
}

export default function SmsInboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selected, setSelected] = useState<Conversation | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [text, setText] = useState('')
  const [loadingConvs, setLoadingConvs] = useState(true)
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [bulkSending, setBulkSending] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchConversations() }, [])
  useEffect(() => { if (selected) fetchMessages(selected.id) }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchConversations() {
    setLoadingConvs(true)
    try {
      const data = await apiClient.get('/sms/conversations')
      setConversations(data.conversations ?? [])
    } catch {
      setConversations(DEMO_CONVERSATIONS)
    }
    setLoadingConvs(false)
  }

  async function fetchMessages(id: string) {
    try {
      const data = await apiClient.get(`/sms/conversations/${id}/messages`)
      setMessages(data.messages ?? [])
    } catch {}
  }

  async function handleSend() {
    if (!text.trim() || !selected) return
    setSending(true)
    try {
      await apiClient.post('/sms/send', { to: selected.phoneNumber, body: text })
      setText('')
      toast('Message sent', 'success')
      fetchMessages(selected.id)
      fetchConversations()
    } catch { toast('Failed to send message', 'error') }
    setSending(false)
  }

  async function handleSuggest() {
    if (!selected) return
    setSuggesting(true)
    try {
      const data = await apiClient.post(`/sms/conversations/${selected.id}/suggest-reply`, {})
      setText(data.suggestion ?? '')
    } catch { toast('Could not generate suggestion', 'error') }
    setSuggesting(false)
  }

  async function handleBulkSend() {
    if (!bulkMessage.trim()) return
    setBulkSending(true)
    try {
      await apiClient.post('/sms/bulk', { message: bulkMessage })
      setBulkMessage('')
      setShowBulk(false)
      toast('Bulk SMS sent to all contacts', 'success')
    } catch { toast('Failed to send bulk SMS', 'error') }
    setBulkSending(false)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]" style={{ background: 'hsl(var(--background))' }}>
      {/* Sidebar */}
      <div
        className="w-72 flex flex-col shrink-0"
        style={{ borderRight: '1px solid hsl(var(--border))', background: 'hsl(var(--sidebar))' }}
      >
        <div
          className="flex items-center justify-between p-4"
          style={{ borderBottom: '1px solid hsl(var(--border))' }}
        >
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="font-semibold text-foreground text-sm">SMS Inbox</h1>
          </div>
          <button
            onClick={() => setShowBulk(true)}
            className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium text-primary transition-colors hover:bg-primary/10"
            style={{ border: '1px solid rgba(6,182,212,0.25)' }}
          >
            <Users className="h-3.5 w-3.5" />
            Bulk
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {loadingConvs ? (
            <div className="p-3 space-y-2">
              {[0, 1, 2].map(i => (
                <div key={i} className="rounded-lg p-3 space-y-2" style={{ background: 'hsl(var(--background))' }}>
                  <div className="h-3 w-3/4 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
                  <div className="h-2.5 w-1/2 rounded animate-pulse" style={{ background: 'hsl(var(--border))' }} />
                </div>
              ))}
            </div>
          ) : conversations.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
          ) : (
            conversations.map(c => (
              <button
                key={c.id}
                onClick={() => setSelected(c)}
                className="w-full text-left px-4 py-3 transition-colors"
                style={{
                  borderBottom: '1px solid hsl(var(--border))',
                  background: selected?.id === c.id ? 'rgba(6,182,212,0.08)' : 'transparent',
                }}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-sm font-medium text-foreground truncate">{c.contactName ?? c.phoneNumber}</span>
                  {c.unreadCount > 0 && (
                    <span
                      className="flex-shrink-0 rounded-full text-[10px] px-1.5 py-0.5 font-semibold text-white"
                      style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                    >
                      {c.unreadCount}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{c.lastMessage ?? 'No messages yet'}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {selected ? (
          <>
            <div
              className="px-5 py-3 shrink-0"
              style={{ borderBottom: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            >
              <p className="font-semibold text-sm text-foreground">{selected.contactName ?? selected.phoneNumber}</p>
              <p className="text-xs text-muted-foreground">{selected.phoneNumber}</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div
                    className="max-w-xs rounded-2xl px-4 py-2 text-sm"
                    style={m.direction === 'outbound'
                      ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                      : { background: 'hsl(var(--card))', color: 'hsl(var(--foreground))', border: '1px solid hsl(var(--border))' }
                    }
                  >
                    {m.body}
                    <p
                      className="text-[10px] mt-1"
                      style={{ opacity: 0.6 }}
                    >
                      {new Date(m.createdAt).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>

            <div
              className="p-3 flex gap-2 items-end shrink-0"
              style={{ borderTop: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
            >
              <textarea
                className="flex-1 rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground resize-none min-h-[40px] max-h-[120px] focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                placeholder="Type a message…"
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                rows={1}
              />
              <button
                onClick={handleSuggest}
                disabled={suggesting}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-primary transition-colors hover:bg-primary/10 disabled:opacity-50"
                style={{ border: '1px solid rgba(6,182,212,0.25)' }}
                title="AI suggest reply"
              >
                <Sparkles className="h-4 w-4" />
              </button>
              <button
                onClick={handleSend}
                disabled={sending || !text.trim()}
                className="h-9 w-9 flex items-center justify-center rounded-xl text-white disabled:opacity-50 transition-all hover:scale-[1.05]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 text-muted-foreground/30" />
              <p className="text-muted-foreground text-sm">Select a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk SMS Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div
            className="w-full max-w-md rounded-2xl p-6 space-y-4"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <h2 className="font-semibold text-lg text-foreground">Send Bulk SMS</h2>
            <p className="text-sm text-muted-foreground">Send a message to all contacts (max 160 chars).</p>
            <textarea
              className="w-full rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
              style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', minHeight: 80 }}
              placeholder="Your message…"
              maxLength={160}
              value={bulkMessage}
              onChange={e => setBulkMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{bulkMessage.length}/160</p>
            <div className="flex gap-2">
              <button
                onClick={handleBulkSend}
                disabled={!bulkMessage.trim() || bulkSending}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {bulkSending ? 'Sending…' : 'Send to All Contacts'}
              </button>
              <button
                onClick={() => setShowBulk(false)}
                className="px-4 py-2.5 rounded-xl text-sm text-muted-foreground transition-colors hover:text-foreground"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
