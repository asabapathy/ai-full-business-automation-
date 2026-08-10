'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Brain } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

interface Conversation {
  id: string
  title: string
  updatedAt: string
  _count?: { messages: number }
}

interface BrainContext {
  revenue30d: number
  newContacts30d: number
  pipelineValue: number
  activeDeals: number
  appointmentsToday: number
  avgRating: number
  totalReviews: number
  alerts: Array<{ type: string; message: string }>
}

const SUGGESTED_PROMPTS = [
  { icon: '📊', text: 'How is my business performing this month?' },
  { icon: '💰', text: 'Which invoices are overdue and what should I do?' },
  { icon: '🎯', text: 'How can I get 10 more customers this month?' },
  { icon: '⭐', text: 'Analyze my reviews and how to improve ratings' },
  { icon: '📅', text: "What does today's schedule look like?" },
  { icon: '🚀', text: 'Build me a marketing plan for next month' },
]

function formatMarkdown(text: string): React.ReactNode[] {
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]!
    if (line.startsWith('## ')) {
      elements.push(<h3 key={i} className="text-foreground font-bold mt-4 mb-1 text-sm">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-foreground font-bold mt-4 mb-2">{line.slice(2)}</h2>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} className="text-foreground/80 text-sm ml-4 list-disc">{formatInline(line.slice(2))}</li>)
    } else if (/^\d+\. /.test(line)) {
      elements.push(<li key={i} className="text-foreground/80 text-sm ml-4 list-decimal">{formatInline(line.replace(/^\d+\. /, ''))}</li>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="text-foreground font-semibold text-sm mt-2">{line.slice(2, -2)}</p>)
    } else if (line === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="text-foreground/80 text-sm leading-relaxed">{formatInline(line)}</p>)
    }
    i++
  }
  return elements
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-foreground font-semibold">{part.slice(2, -2)}</strong>
      : part
  )
}

export default function BrainPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [context, setContext] = useState<BrainContext | null>(null)
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [convId, setConvId] = useState<string | undefined>()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_access_token') : null
    const authHeaders: HeadersInit = token ? { Authorization: `Bearer ${token}` } : {}
    Promise.all([
      fetch('/api/ai/conversations', { headers: authHeaders }).then(r => r.json()).catch(() => null),
      fetch('/api/ai/context', { headers: authHeaders }).then(r => r.json()).catch(() => null),
    ]).then(([convData, ctxData]) => {
      if (convData?.data?.conversations) setConversations(convData.data.conversations)
      if (ctxData?.data) setContext(ctxData.data)
    })
  }, [])

  async function loadConversation(id: string) {
    setConvId(id)
    setMessages([])
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_access_token') : null
      const res = await fetch(`/api/ai/conversations/${id}/messages`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      const data = await res.json()
      if (data?.data?.messages) {
        setMessages(data.data.messages.map((m: { id: string; role: string; content: string; createdAt: string }) => ({
          id: m.id,
          role: m.role.toLowerCase() as 'user' | 'assistant',
          content: m.content,
          timestamp: new Date(m.createdAt),
        })))
      }
    } catch {}
  }

  function newConversation() {
    setConvId(undefined)
    setMessages([])
  }

  function autoResize() {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`
    }
  }

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: content.trim(), timestamp: new Date() }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', timestamp: new Date(), isStreaming: true }
    setMessages(prev => [...prev, userMsg, assistantMsg])
    setInput('')
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsLoading(true)

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_access_token') : null
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token ?? ''}` },
        body: JSON.stringify({ message: content.trim(), conversationId: convId, stream: true }),
      })

      const reader = res.body?.getReader()
      if (!reader) throw new Error('No stream')

      const decoder = new TextDecoder()
      let full = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value)
        for (const line of chunk.split('\n').filter(l => l.startsWith('data: '))) {
          try {
            const parsed = JSON.parse(line.slice(6)) as { type: string; content?: string; conversationId?: string }
            if (parsed.type === 'text' && parsed.content) {
              full += parsed.content
              setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: full } : m))
            }
          } catch {}
        }
      }

      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: full, isStreaming: false } : m))

      fetch('/api/ai/conversations', { headers: { Authorization: `Bearer ${token ?? ''}` } }).then(r => r.json()).then(d => {
        if (d?.data?.conversations) setConversations(d.data.conversations)
      }).catch(() => {})
    } catch {
      setMessages(prev => prev.map(m => m.id === assistantMsg.id ? { ...m, content: 'Something went wrong. Please try again.', isStreaming: false } : m))
    } finally {
      setIsLoading(false)
    }
  }, [convId, isLoading])

  return (
    <div className="flex h-full overflow-hidden">
      {/* Conversation history sidebar */}
      {sidebarOpen && (
        <div
          className="w-56 border-r flex flex-col shrink-0"
          style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--sidebar))' }}
        >
          <div className="p-3 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary transition-colors hover:bg-primary/20"
              style={{ background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
            >
              <span className="text-lg">✏️</span> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2 scrollbar-hide">
            {conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground px-4 py-3">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${convId === conv.id ? 'bg-primary/10' : ''}`}
                >
                  <p className="text-xs text-foreground/80 font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(conv.updatedAt).toLocaleDateString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b flex items-center justify-between px-4 shrink-0" style={{ borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(o => !o)}
              className="p-1.5 hover:bg-white/5 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
            >
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 12px rgba(6,182,212,0.3)' }}
              >
                <Brain className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-foreground font-semibold text-sm">AI Business Brain</p>
                <p className="text-xs text-muted-foreground">Always on · Always learning</p>
              </div>
            </div>
          </div>
          {context && context.alerts.length > 0 && (
            <div className="flex gap-2">
              {context.alerts.map((alert, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-1 rounded-full"
                  style={alert.type === 'warning'
                    ? { background: 'rgba(251,191,36,0.2)', color: '#fbbf24' }
                    : { background: 'rgba(6,182,212,0.2)', color: 'hsl(var(--primary))' }
                  }
                >
                  {alert.type === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-hide">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div
                  className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)',
                    boxShadow: '0 0 30px rgba(6,182,212,0.3)',
                  }}
                >
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h2 className="text-xl font-bold text-foreground mb-2">Your AI Business Advisor</h2>
                <p className="text-sm text-muted-foreground max-w-md mb-8">
                  I have real-time access to your business data — revenue, contacts, deals, appointments, and more. Ask me anything.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map(p => (
                    <button
                      key={p.text}
                      onClick={() => sendMessage(p.text)}
                      className="flex items-center gap-2 p-3 rounded-xl text-sm text-foreground/80 hover:text-foreground text-left transition-all hover:bg-primary/10"
                      style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                    >
                      <span className="text-lg shrink-0">{p.icon}</span>
                      <span>{p.text}</span>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <>
                {messages.map(msg => (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                    <div
                      className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold"
                      style={msg.role === 'assistant'
                        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 10px rgba(6,182,212,0.3)' }
                        : { background: 'rgba(255,255,255,0.1)' }
                      }
                    >
                      {msg.role === 'assistant' ? <Brain className="h-3.5 w-3.5 text-white" /> : '?'}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''} flex flex-col`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'rounded-tr-sm' : 'rounded-tl-sm'}`}
                        style={msg.role === 'user'
                          ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                          : { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
                        }
                      >
                        {msg.role === 'assistant' ? (
                          <div>
                            {formatMarkdown(msg.content || (msg.isStreaming ? '▋' : ''))}
                            {msg.isStreaming && msg.content && <span className="animate-pulse text-muted-foreground">▋</span>}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground mt-1 px-1">
                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Live context panel */}
          {context && (
            <div
              className="w-52 border-l p-4 shrink-0 overflow-y-auto scrollbar-hide"
              style={{ borderColor: 'hsl(var(--border))', background: 'hsl(var(--sidebar))' }}
            >
              <p className="text-xs text-muted-foreground font-medium mb-3 uppercase tracking-wide">Live Data</p>
              <div className="space-y-3">
                {[
                  { label: 'Revenue (30d)', value: `$${(context.revenue30d / 1000).toFixed(0)}k`, icon: '💰' },
                  { label: 'New contacts', value: context.newContacts30d.toString(), icon: '👥' },
                  { label: 'Pipeline', value: `$${(context.pipelineValue / 1000).toFixed(0)}k`, icon: '📈' },
                  { label: 'Active deals', value: context.activeDeals.toString(), icon: '🤝' },
                  { label: "Today's appts", value: context.appointmentsToday.toString(), icon: '📅' },
                  { label: 'Avg rating', value: `${context.avgRating}★`, icon: '⭐' },
                ].map(stat => (
                  <div key={stat.label} className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{stat.icon}</span>
                      <span className="text-xs text-muted-foreground">{stat.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-foreground tabular">{stat.value}</span>
                  </div>
                ))}
              </div>

              {context.alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wide">Alerts</p>
                  {context.alerts.map((alert, i) => (
                    <div
                      key={i}
                      className="text-xs px-2 py-1.5 rounded-lg"
                      style={alert.type === 'warning'
                        ? { background: 'rgba(251,191,36,0.1)', color: '#fbbf24' }
                        : { background: 'rgba(6,182,212,0.1)', color: 'hsl(var(--primary))' }
                      }
                    >
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <p className="text-[10px] text-muted-foreground">Data refreshes each conversation</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t p-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <div
            className="flex items-end gap-3 rounded-xl px-4 py-3 transition-colors focus-within:border-primary/50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Ask anything about your business… (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground resize-none focus:outline-none max-h-40"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 shrink-0 rounded-lg flex items-center justify-center transition-all hover:scale-105 disabled:opacity-30"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-muted-foreground mt-2">AI has access to your live business data. Verify important decisions.</p>
        </div>
      </div>
    </div>
  )
}
