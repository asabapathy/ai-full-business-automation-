'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import { Inbox as InboxIcon, Mail, MessageSquare, MessagesSquare, Send, ExternalLink } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

type Channel = 'sms' | 'email' | 'chat'

interface Message {
  id: string
  from: 'them' | 'us'
  channel: Channel
  body: string
  at: string
}

interface Conversation {
  id: string
  contactName: string
  channel: Channel
  unread: boolean
  lastAt: string
  messages: Message[]
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const CHANNEL_META: Record<Channel, { label: string; color: string; icon: React.ElementType }> = {
  sms: { label: 'SMS', color: '#34d399', icon: MessageSquare },
  email: { label: 'Email', color: '#60a5fa', icon: Mail },
  chat: { label: 'Chat', color: '#a78bfa', icon: MessagesSquare },
}

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4, #0ea5e9)',
  'linear-gradient(135deg, #34d399, #10b981)',
  'linear-gradient(135deg, #a78bfa, #7c3aed)',
  'linear-gradient(135deg, #60a5fa, #3b82f6)',
  'linear-gradient(135deg, #fbbf24, #f59e0b)',
  'linear-gradient(135deg, #f87171, #ef4444)',
]

const h = 3600000
const now = Date.now()

const DEMO_CONVERSATIONS: Conversation[] = [
  {
    id: 'c1', contactName: 'Sarah Mitchell', channel: 'sms', unread: true, lastAt: new Date(now - 0.4 * h).toISOString(),
    messages: [
      { id: 'm1', from: 'them', channel: 'sms', body: 'Hi! I got your quote for the kitchen remodel. Does the $4,200 include materials?', at: new Date(now - 5 * h).toISOString() },
      { id: 'm2', from: 'us', channel: 'sms', body: 'Hi Sarah! Yes, that covers both labor and materials. Fixtures are billed separately if you pick premium options.', at: new Date(now - 4.5 * h).toISOString() },
      { id: 'm3', from: 'them', channel: 'sms', body: 'Great. One more thing — how long would the whole job take?', at: new Date(now - 0.4 * h).toISOString() },
    ],
  },
  {
    id: 'c2', contactName: 'David Okafor', channel: 'email', unread: true, lastAt: new Date(now - 2 * h).toISOString(),
    messages: [
      { id: 'm4', from: 'them', channel: 'email', body: 'Hello, I would like to confirm my appointment for Tuesday at 10am. Also, is there parking available at your location?', at: new Date(now - 26 * h).toISOString() },
      { id: 'm5', from: 'us', channel: 'email', body: 'Hi David, you are confirmed for Tuesday 10am. Yes — free parking right out front. See you then!', at: new Date(now - 24 * h).toISOString() },
      { id: 'm6', from: 'them', channel: 'email', body: 'Perfect, thank you. Could you also send over the intake form beforehand so I can fill it out?', at: new Date(now - 2 * h).toISOString() },
    ],
  },
  {
    id: 'c3', contactName: 'Emma Rodriguez', channel: 'chat', unread: false, lastAt: new Date(now - 6 * h).toISOString(),
    messages: [
      { id: 'm7', from: 'them', channel: 'chat', body: 'Hey, do you offer weekend appointments? Your booking page only shows weekdays.', at: new Date(now - 7 * h).toISOString() },
      { id: 'm8', from: 'us', channel: 'chat', body: 'Hi Emma! We do Saturday mornings, 8am–12pm. I can open a slot for you this Saturday if that works?', at: new Date(now - 6.5 * h).toISOString() },
      { id: 'm9', from: 'them', channel: 'chat', body: 'Saturday 9am would be perfect!', at: new Date(now - 6 * h).toISOString() },
    ],
  },
  {
    id: 'c4', contactName: 'James Chen', channel: 'email', unread: false, lastAt: new Date(now - 20 * h).toISOString(),
    messages: [
      { id: 'm10', from: 'them', channel: 'email', body: 'I left you a 5-star review on Google — the team did a fantastic job on our backyard. Thank you!', at: new Date(now - 22 * h).toISOString() },
      { id: 'm11', from: 'us', channel: 'email', body: 'James, thank you so much for the kind words and the review! It was a pleasure working on your project. Do not hesitate to reach out if you need anything down the line.', at: new Date(now - 20 * h).toISOString() },
    ],
  },
  {
    id: 'c5', contactName: 'Priya Patel', channel: 'sms', unread: false, lastAt: new Date(now - 30 * h).toISOString(),
    messages: [
      { id: 'm12', from: 'us', channel: 'sms', body: 'Hi Priya, just a reminder about your appointment tomorrow at 2pm. Reply C to confirm or R to reschedule.', at: new Date(now - 32 * h).toISOString() },
      { id: 'm13', from: 'them', channel: 'sms', body: 'C — see you tomorrow!', at: new Date(now - 30 * h).toISOString() },
    ],
  },
  {
    id: 'c6', contactName: 'Michael Torres', channel: 'chat', unread: false, lastAt: new Date(now - 44 * h).toISOString(),
    messages: [
      { id: 'm14', from: 'them', channel: 'chat', body: 'Hi, I saw your ad — can you send me a rough estimate for a two-story exterior paint job?', at: new Date(now - 46 * h).toISOString() },
      { id: 'm15', from: 'us', channel: 'chat', body: 'Hi Michael! For a typical two-story home you are looking at $3,800–$5,500 depending on square footage and prep work. Want me to schedule a free on-site estimate?', at: new Date(now - 45 * h).toISOString() },
      { id: 'm16', from: 'them', channel: 'chat', body: 'Yes please, sometime next week would be great.', at: new Date(now - 44 * h).toISOString() },
    ],
  },
]

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'now'
  if (mins < 60) return `${mins}m`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function dayLabel(iso: string): string {
  const d = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (d.toDateString() === today.toDateString()) return 'Today'
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function InboxPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [filter, setFilter] = useState<'all' | Channel>('all')
  const [draft, setDraft] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const data = await apiClient.get<{ conversations: Conversation[] }>('/inbox/conversations') as any
        const convos = data?.conversations ?? data
        if (!cancelled && Array.isArray(convos) && convos.length > 0) {
          setConversations(convos)
        } else if (!cancelled) {
          setConversations(DEMO_CONVERSATIONS)
        }
      } catch {
        if (!cancelled) setConversations(DEMO_CONVERSATIONS)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => { cancelled = true }
  }, [])

  const selected = conversations.find(c => c.id === selectedId) ?? null

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'auto' })
  }, [selectedId])

  const filtered = useMemo(() => {
    const list = filter === 'all' ? conversations : conversations.filter(c => c.channel === filter)
    return [...list].sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime())
  }, [conversations, filter])

  const unreadCount = conversations.filter(c => c.unread).length

  function selectConversation(id: string) {
    setSelectedId(id)
    setDraft('')
    setConversations(prev => prev.map(c => c.id === id ? { ...c, unread: false } : c))
  }

  async function sendMessage() {
    if (!selected || !draft.trim()) return
    const body = draft.trim()
    const msg: Message = {
      id: `local-${Date.now()}`,
      from: 'us',
      channel: selected.channel,
      body,
      at: new Date().toISOString(),
    }
    setConversations(prev => prev.map(c =>
      c.id === selected.id
        ? { ...c, messages: [...c.messages, msg], lastAt: msg.at }
        : c
    ))
    setDraft('')
    try {
      await apiClient.post(`/inbox/conversations/${selected.id}/messages`, { body, channel: selected.channel })
    } catch {
      // optimistic — keep the message locally even if the API is unavailable
    }
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void sendMessage()
    }
  }

  const filterChips: { key: 'all' | Channel; label: string; color: string }[] = [
    { key: 'all', label: 'All', color: '#06b6d4' },
    { key: 'sms', label: 'SMS', color: '#34d399' },
    { key: 'email', label: 'Email', color: '#60a5fa' },
    { key: 'chat', label: 'Chat', color: '#a78bfa' },
  ]

  return (
    <div className="p-6 max-w-[1200px]">
      <div {...anim(0)} className="flex h-[calc(100vh-8rem)] rounded-xl overflow-hidden" style={cardStyle}>
        {/* Left pane */}
        <div className="w-80 shrink-0 flex flex-col" style={{ borderRight: '1px solid hsl(var(--border))' }}>
          <div className="px-4 pt-4 pb-3" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center gap-2 mb-3">
              <InboxIcon className="h-5 w-5" style={{ color: '#06b6d4' }} />
              <h1 className="text-lg font-bold text-foreground">Inbox</h1>
              {unreadCount > 0 && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                  {unreadCount} unread
                </span>
              )}
            </div>
            <div className="flex gap-1.5">
              {filterChips.map(chip => (
                <button
                  key={chip.key}
                  onClick={() => setFilter(chip.key)}
                  className="px-2.5 py-1 rounded-full text-xs font-medium transition-all"
                  style={filter === chip.key
                    ? { background: `${chip.color}22`, border: `1px solid ${chip.color}66`, color: chip.color }
                    : { background: 'transparent', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-3 space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 text-center px-4">
                <InboxIcon className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No conversations</p>
              </div>
            ) : (
              filtered.map((c, i) => {
                const meta = CHANNEL_META[c.channel]
                const ChannelIcon = meta.icon
                const lastMsg = c.messages[c.messages.length - 1]
                const isSelected = c.id === selectedId
                return (
                  <button
                    key={c.id}
                    onClick={() => selectConversation(c.id)}
                    className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-accent/30"
                    style={{
                      borderBottom: '1px solid hsl(var(--border))',
                      background: isSelected
                        ? 'rgba(6,182,212,0.08)'
                        : c.unread
                        ? 'rgba(6,182,212,0.05)'
                        : 'transparent',
                    }}
                  >
                    <div
                      className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-xs font-bold text-white mt-0.5"
                      style={{ background: AVATAR_GRADIENTS[i % AVATAR_GRADIENTS.length] }}
                    >
                      {c.contactName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className={`flex-1 truncate text-sm text-foreground ${c.unread ? 'font-bold' : 'font-medium'}`}>
                          {c.contactName}
                        </p>
                        <span className="text-[10px] text-muted-foreground shrink-0">{relativeTime(c.lastAt)}</span>
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ChannelIcon className="h-3 w-3 shrink-0" style={{ color: meta.color }} />
                        <p className="flex-1 truncate text-xs text-muted-foreground">
                          {lastMsg ? `${lastMsg.from === 'us' ? 'You: ' : ''}${lastMsg.body}` : ''}
                        </p>
                        {c.unread && (
                          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: '#06b6d4' }} />
                        )}
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Right pane */}
        <div className="flex-1 flex flex-col min-w-0">
          {!selected ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
              <div className="h-14 w-14 rounded-full flex items-center justify-center mb-3" style={{ background: 'rgba(6,182,212,0.1)' }}>
                <MessagesSquare className="h-7 w-7" style={{ color: '#06b6d4' }} />
              </div>
              <p className="font-medium text-foreground">Select a conversation</p>
              <p className="text-sm text-muted-foreground mt-1">SMS, email, and chat threads in one place.</p>
            </div>
          ) : (
            <>
              {/* Thread header */}
              <div className="flex items-center gap-3 px-5 py-3.5 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
                <div className="flex-1 min-w-0 flex items-center gap-2.5">
                  <p className="font-semibold text-foreground truncate">{selected.contactName}</p>
                  <span
                    className="text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wide shrink-0"
                    style={{ background: `${CHANNEL_META[selected.channel].color}1a`, color: CHANNEL_META[selected.channel].color }}
                  >
                    {CHANNEL_META[selected.channel].label}
                  </span>
                </div>
                <a
                  href="/dashboard/crm"
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors shrink-0"
                >
                  <ExternalLink className="h-3 w-3" />
                  View contact
                </a>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
                {selected.messages.map((m, i) => {
                  const prev = selected.messages[i - 1]
                  const showDay = !prev || new Date(prev.at).toDateString() !== new Date(m.at).toDateString()
                  return (
                    <div key={m.id}>
                      {showDay && (
                        <div className="flex items-center gap-3 my-4">
                          <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
                          <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">{dayLabel(m.at)}</span>
                          <div className="flex-1 h-px" style={{ background: 'hsl(var(--border))' }} />
                        </div>
                      )}
                      <div className={`flex ${m.from === 'us' ? 'justify-end' : 'justify-start'}`}>
                        <div className="max-w-[70%]">
                          <div
                            className="rounded-2xl px-4 py-2.5 text-sm"
                            style={m.from === 'us'
                              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: '#ffffff' }
                              : { background: 'hsl(var(--muted))', color: 'hsl(var(--foreground))' }}
                          >
                            {m.body}
                          </div>
                          <p className={`text-[10px] text-muted-foreground mt-1 ${m.from === 'us' ? 'text-right' : ''}`}>
                            {new Date(m.at).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  )
                })}
                <div ref={bottomRef} />
              </div>

              {/* Composer */}
              <div className="px-4 py-3 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-1.5 mb-1.5">
                      {(() => {
                        const meta = CHANNEL_META[selected.channel]
                        const ChannelIcon = meta.icon
                        return (
                          <>
                            <ChannelIcon className="h-3 w-3" style={{ color: meta.color }} />
                            <span className="text-[10px] font-medium uppercase tracking-wide" style={{ color: meta.color }}>
                              Reply via {meta.label}
                            </span>
                          </>
                        )
                      })()}
                    </div>
                    <textarea
                      value={draft}
                      onChange={e => setDraft(e.target.value)}
                      onKeyDown={handleKeyDown}
                      rows={draft.includes('\n') ? 2 : 1}
                      placeholder={`Message ${selected.contactName}…`}
                      className={inputCls + ' resize-none'}
                      style={inputStyle}
                    />
                  </div>
                  <button
                    onClick={() => void sendMessage()}
                    disabled={!draft.trim()}
                    className="flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02] shrink-0"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 16px rgba(6,182,212,0.2)' }}
                  >
                    <Send className="h-3.5 w-3.5" />
                    Send
                  </button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-1.5">Enter to send · Shift+Enter for a new line</p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
