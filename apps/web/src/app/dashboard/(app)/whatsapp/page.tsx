'use client'

import { useState, useEffect, useRef } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const STATS_META = [
  { label: 'Total Messages', key: 'total' as const, color: '#a78bfa' },
  { label: 'Inbound', key: 'inbound' as const, color: '#34d399' },
  { label: 'Outbound', key: 'outbound' as const, color: '#60a5fa' },
  { label: 'Contacts', key: 'contacts' as const, color: '#fb923c' },
]

export default function WhatsAppPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [conversation, setConversation] = useState<Conversation | null>(null)
  const [sendForm, setSendForm] = useState({ to: '', body: '' })
  const [sending, setSending] = useState(false)
  const [page] = useState(1)
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
    } catch {
      setMessages([])
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
    } catch (e: any) {
      toast(e.message || 'Failed to send message', 'error')
    } finally { setSending(false) }
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
    <div className="p-6 space-y-6 max-w-6xl">
      <div {...anim(0)} className="kv-anim">
        <h1 className="text-2xl font-bold text-foreground">WhatsApp</h1>
        <p className="text-muted-foreground text-sm mt-1">Send and receive WhatsApp messages via Twilio</p>
      </div>

      {stats && (
        <div {...anim(1)} className="kv-anim grid grid-cols-2 md:grid-cols-4 gap-4">
          {STATS_META.map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-sm text-muted-foreground mb-1">{s.label}</p>
              <p className="text-2xl font-bold" style={{ color: s.color }}>{stats[s.key]}</p>
            </div>
          ))}
        </div>
      )}

      <div {...anim(2)} className="kv-anim grid md:grid-cols-3 gap-6">
        <div className="rounded-xl overflow-hidden" style={cardStyle}>
          <div className="px-4 py-3 font-medium text-foreground" style={{ borderBottom: '1px solid hsl(var(--border))' }}>Conversations</div>
          {loading ? (
            <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
          ) : uniqueContacts.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No messages yet</div>
          ) : (
            <div>
              {uniqueContacts.map(([phone, name]) => (
                <button key={phone} onClick={() => openConversation(phone, name)}
                  className="w-full px-4 py-3 text-left transition-colors"
                  style={conversation?.phone === phone
                    ? { background: 'rgba(6,182,212,0.08)', borderBottom: '1px solid hsl(var(--border))' }
                    : { borderBottom: '1px solid hsl(var(--border))' }
                  }>
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                      <MessageCircle className="h-4 w-4" style={{ color: '#34d399' }} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground">{name}</p>
                      <p className="text-xs text-muted-foreground">{phone}</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="md:col-span-2 rounded-xl flex flex-col" style={{ ...cardStyle, height: '500px' }}>
          {conversation ? (
            <>
              <div className="p-4 flex items-center gap-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="h-9 w-9 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
                  <Phone className="h-4 w-4" style={{ color: '#34d399' }} />
                </div>
                <div>
                  <p className="font-medium text-foreground">{conversation.name}</p>
                  <p className="text-xs text-muted-foreground">{conversation.phone}</p>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {conversation.messages.map(m => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className="max-w-xs rounded-xl px-4 py-2 text-sm"
                      style={m.direction === 'outbound'
                        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white', borderBottomRightRadius: '2px' }
                        : { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))', borderBottomLeftRadius: '2px' }
                      }>
                      <div className="flex items-center gap-1 mb-1">
                        {m.direction === 'inbound'
                          ? <ArrowDownLeft className="h-3 w-3 text-emerald-400" />
                          : <ArrowUpRight className="h-3 w-3 opacity-70" />}
                      </div>
                      <p>{m.body}</p>
                      <p className="text-xs mt-1 opacity-60">
                        {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div className="p-4 flex gap-2" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <input value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value, to: conversation.phone })}
                  onKeyDown={e => e.key === 'Enter' && send()}
                  placeholder="Type a message…"
                  className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={inputStyle} />
                <button onClick={send} disabled={sending || !sendForm.body}
                  className="rounded-lg p-2.5 text-white disabled:opacity-50 transition-all hover:scale-[1.05]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
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
                  className={inputCls} style={inputStyle} />
                <textarea value={sendForm.body} onChange={e => setSendForm({ ...sendForm, body: e.target.value })}
                  rows={3} placeholder="Message…"
                  className={`${inputCls} resize-none`} style={inputStyle} />
                <button onClick={send} disabled={sending || !sendForm.to || !sendForm.body}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
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
