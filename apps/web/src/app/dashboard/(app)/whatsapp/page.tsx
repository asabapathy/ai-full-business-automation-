'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { MessageCircle, Send, Phone, ArrowUpRight, ArrowDownLeft } from 'lucide-react'

interface Message {
  id: string
  direction: string
  from: string
  to: string
  body: string
  status: string
  createdAt: string
  contact?: { firstName: string; lastName: string }
}

interface Stats { total: number; inbound: number; outbound: number; contacts: number }

interface Conversation {
  phone: string
  name: string
  messages: Message[]
}

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [sendForm, setSendForm] = useState({ to: '', body: '' })
  const [sending, setSending] = useState(false)
  const [page, setPage] = useState(1)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => { load() }, [page])
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [conversation?.messages])

  async function load() {
    setLoading(true)
    try {
      const [mRes, sRes] = await Promise.all([
        apiClient.get<{ messages: Message[]; total: number }>(`/whatsapp/messages?page=${page}&limit=30`),
        apiClient.get<Stats>('/whatsapp/stats'),
      ])
      setMessages(mRes.messages)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function openConversation(phone: string, name: string) {
    const res = await apiClient.get<{ messages: Message[] }>(`/whatsapp/conversation/${encodeURIComponent(phone)}`)
    setConversation({ phone, name, messages: res.messages })
  }

  async function send() {
    if (!sendForm.to || !sendForm.body) return
    setSending(true)
    try {
      await apiClient.post('/whatsapp/send', sendForm)
      setSendForm({ ...sendForm, body: '' })
      if (conversation && conversation.phone === sendForm.to) {
        openConversation(conversation.phone, conversation.name)
      }
      load()
    } catch (e: any) { alert(e.message) } finally { setSending(false) }
  }

  const uniqueContacts = Array.from(
    messages.reduce((map, m) => {
      const phone = m.direction === 'inbound' ? m.from : m.to
      if (!map.has(phone)) {
        const name = m.contact ? `${m.contact.firstName} ${m.contact.lastName}` : phone
        map.set(phone, name)
      }
      return map
    }, new Map<string, string>())
  )

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Send and receive WhatsApp messages via Twilio</p>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Messages', value: stats.total, color: 'text-purple-500' },
            { label: 'Inbound', value: stats.inbound, color: 'text-green-500' },
            { label: 'Outbound', value: stats.outbound, color: 'text-blue-500' },
            { label: 'Contacts', value: stats.contacts, color: 'text-orange-500' },
          ].map(s => (
            <div key={s.label} className="bg-card border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="p-4 border-b font-medium">Conversations</div>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
          ) : uniqueContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No messages yet</div>
          ) : (
            <div className="divide-y">
              {uniqueContacts.map(([phone, name]) => (
                <button key={phone} onClick={() => openConversation(phone, name)}
                  className={`w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors ${conversation?.phone === phone ? 'bg-primary/10' : ''}`}>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                      <MessageCircle className="h-4 w-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">{name}</p>
                      <p className="text-xs text-muted-foreground">{phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 bg-card border rounded-xl flex flex-col h-[500px]">
          {conversation ? (
            <>
              <div className="p-4 border-b flex items-center gap-3">
                <div className="h-9 w-9 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                  <Phone className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">{conversation.name}</p>
                  <p className="text-xs text-muted-foreground">{conversation.phone}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-xs rounded-xl px-4 py-2 text-sm ${m.direction === 'outbound'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted rounded-bl-sm'}`}>
                      <div className="flex items-center gap-1 mb-1">
                        {m.direction === 'inbound'
                          ? <ArrowDownLeft className="h-3 w-3 text-green-500" />
                          : <ArrowUpRight className="h-3 w-3 opacity-70" />}
                      </div>
                      <p>{m.body}</p>
                      <p className={`text-xs mt-1 ${m.direction === 'outbound' ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 border-t flex gap-2">
                <input value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value, to: conversation.phone })}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Type a message…"
                  className="flex-1 border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <button onClick={send} disabled={sending || !sendForm.body}
                  className="bg-green-500 text-white rounded-lg p-2.5 disabled:opacity-50 hover:bg-green-600">
                  <Send className="h-4 w-4" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
              <MessageCircle className="h-12 w-12 text-muted-foreground opacity-40" />
              <p className="text-muted-foreground text-sm">Select a conversation or send a new message</p>
              <div className="w-full max-w-sm space-y-3">
                <input value={sendForm.to} onChange={e => setSendForm({ ...sendForm, to: e.target.value })}
                  placeholder="+1 555 000 0000"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                <textarea value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value })}
                  rows={3} placeholder="Message…"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none" />
                <button onClick={send} disabled={sending || !sendForm.to || !sendForm.body}
                  className="w-full flex items-center justify-center gap-2 bg-green-500 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-50 hover:bg-green-600">
                  <Send className="h-4 w-4" />
                  {sending ? 'Sending…' : 'Send Message'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
