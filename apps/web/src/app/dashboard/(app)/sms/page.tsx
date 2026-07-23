'use client'

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, Send, Sparkles, Users } from 'lucide-react'
import { Button } from '../../../../components/ui/button'
import { apiClient } from '../../../../lib/api-client'

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
  const [sending, setSending] = useState(false)
  const [suggesting, setSuggesting] = useState(false)
  const [bulkMessage, setBulkMessage] = useState('')
  const [showBulk, setShowBulk] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => { fetchConversations() }, [])
  useEffect(() => { if (selected) fetchMessages(selected.id) }, [selected])
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [messages])

  async function fetchConversations() {
    const data = await apiClient.get('/sms/conversations')
    setConversations(data.conversations ?? [])
  }

  async function fetchMessages(id: string) {
    const data = await apiClient.get(`/sms/conversations/${id}/messages`)
    setMessages(data.messages ?? [])
  }

  async function handleSend() {
    if (!text.trim() || !selected) return
    setSending(true)
    try {
      await apiClient.post('/sms/send', { to: selected.phoneNumber, body: text })
      setText('')
      fetchMessages(selected.id)
      fetchConversations()
    } finally {
      setSending(false)
    }
  }

  async function handleSuggest() {
    if (!selected) return
    setSuggesting(true)
    try {
      const data = await apiClient.post(`/sms/conversations/${selected.id}/suggest-reply`, {})
      setText(data.suggestion ?? '')
    } finally {
      setSuggesting(false)
    }
  }

  async function handleBulkSend() {
    if (!bulkMessage.trim()) return
    await apiClient.post('/sms/bulk', { message: bulkMessage })
    setBulkMessage('')
    setShowBulk(false)
  }

  return (
    <div className="flex h-[calc(100vh-56px)]">
      {/* Sidebar */}
      <div className="w-72 border-r flex flex-col">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-primary" />
            <h1 className="font-semibold">SMS Inbox</h1>
          </div>
          <Button size="sm" variant="outline" onClick={() => setShowBulk(true)}>
            <Users className="h-3.5 w-3.5 mr-1" />
            Bulk
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto divide-y">
          {conversations.map(c => (
            <button
              key={c.id}
              onClick={() => setSelected(c)}
              className={`w-full text-left px-4 py-3 hover:bg-muted/40 transition-colors ${selected?.id === c.id ? 'bg-muted/60' : ''}`}
            >
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-sm font-medium truncate">{c.contactName ?? c.phoneNumber}</span>
                {c.unreadCount > 0 && (
                  <span className="flex-shrink-0 rounded-full bg-primary text-primary-foreground text-[10px] px-1.5 py-0.5 font-semibold">
                    {c.unreadCount}
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground truncate">{c.lastMessage ?? 'No messages yet'}</p>
            </button>
          ))}
          {conversations.length === 0 && (
            <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
          )}
        </div>
      </div>

      {/* Chat */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="border-b px-4 py-3">
              <p className="font-medium">{selected.contactName ?? selected.phoneNumber}</p>
              <p className="text-xs text-muted-foreground">{selected.phoneNumber}</p>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {messages.map(m => (
                <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-xs rounded-2xl px-4 py-2 text-sm ${
                    m.direction === 'outbound'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted'
                  }`}>
                    {m.body}
                    <p className="text-[10px] opacity-60 mt-1">{new Date(m.createdAt).toLocaleTimeString()}</p>
                  </div>
                </div>
              ))}
              <div ref={bottomRef} />
            </div>
            <div className="border-t p-3 flex gap-2 items-end">
              <textarea
                className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm resize-none min-h-[40px] max-h-[120px]"
                placeholder="Type a message..."
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend() } }}
                rows={1}
              />
              <Button size="sm" variant="outline" onClick={handleSuggest} disabled={suggesting}>
                <Sparkles className="h-4 w-4" />
              </Button>
              <Button size="sm" onClick={handleSend} disabled={sending || !text.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
              <p>Select a conversation</p>
            </div>
          </div>
        )}
      </div>

      {/* Bulk SMS Modal */}
      {showBulk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-xl bg-card border p-6 space-y-4">
            <h2 className="font-semibold text-lg">Send Bulk SMS</h2>
            <p className="text-sm text-muted-foreground">Send a message to all contacts (max 160 chars).</p>
            <textarea
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm min-h-[80px]"
              placeholder="Your message..."
              maxLength={160}
              value={bulkMessage}
              onChange={e => setBulkMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground text-right">{bulkMessage.length}/160</p>
            <div className="flex gap-2">
              <Button onClick={handleBulkSend} disabled={!bulkMessage.trim()}>Send to All Contacts</Button>
              <Button variant="outline" onClick={() => setShowBulk(false)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
