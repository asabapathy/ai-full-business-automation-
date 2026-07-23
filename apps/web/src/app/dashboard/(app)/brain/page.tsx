'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

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
      elements.push(<h3 key={i} className="text-white font-bold mt-4 mb-1 text-sm">{line.slice(3)}</h3>)
    } else if (line.startsWith('# ')) {
      elements.push(<h2 key={i} className="text-white font-bold mt-4 mb-2">{line.slice(2)}</h2>)
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      elements.push(<li key={i} className="text-gray-200 text-sm ml-4 list-disc">{formatInline(line.slice(2))}</li>)
    } else if (/^\d+\. /.test(line)) {
      elements.push(<li key={i} className="text-gray-200 text-sm ml-4 list-decimal">{formatInline(line.replace(/^\d+\. /, ''))}</li>)
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(<p key={i} className="text-white font-semibold text-sm mt-2">{line.slice(2, -2)}</p>)
    } else if (line === '') {
      elements.push(<div key={i} className="h-2" />)
    } else {
      elements.push(<p key={i} className="text-gray-200 text-sm leading-relaxed">{formatInline(line)}</p>)
    }
    i++
  }
  return elements
}

function formatInline(text: string): React.ReactNode {
  const parts = text.split(/(\*\*[^*]+\*\*)/g)
  return parts.map((part, i) =>
    part.startsWith('**') && part.endsWith('**')
      ? <strong key={i} className="text-white font-semibold">{part.slice(2, -2)}</strong>
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
  const router = useRouter()

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    // Load conversations and context
    Promise.all([
      fetch('/api/ai/conversations').then(r => r.json()).catch(() => null),
      fetch('/api/ai/context').then(r => r.json()).catch(() => null),
    ]).then(([convData, ctxData]) => {
      if (convData?.data?.conversations) setConversations(convData.data.conversations)
      if (ctxData?.data) setContext(ctxData.data)
    })
  }, [])

  async function loadConversation(id: string) {
    setConvId(id)
    setMessages([])
    try {
      const res = await fetch(`/api/ai/conversations/${id}/messages`)
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

      // Refresh conversations list
      fetch('/api/ai/conversations').then(r => r.json()).then(d => {
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
        <div className="w-56 border-r border-white/10 flex flex-col bg-[#0f0f1e] shrink-0">
          <div className="p-3 border-b border-white/10">
            <button
              onClick={newConversation}
              className="w-full flex items-center gap-2 px-3 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded-lg text-sm text-purple-300 transition-colors"
            >
              <span className="text-lg">✏️</span> New chat
            </button>
          </div>
          <div className="flex-1 overflow-y-auto py-2">
            {conversations.length === 0 ? (
              <p className="text-xs text-gray-600 px-4 py-3">No conversations yet</p>
            ) : (
              conversations.map(conv => (
                <button
                  key={conv.id}
                  onClick={() => loadConversation(conv.id)}
                  className={`w-full text-left px-4 py-2.5 hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${convId === conv.id ? 'bg-purple-600/10' : ''}`}
                >
                  <p className="text-xs text-gray-300 font-medium truncate">{conv.title}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">{new Date(conv.updatedAt).toLocaleDateString()}</p>
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Main chat area */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="h-14 border-b border-white/10 flex items-center justify-between px-4 shrink-0">
          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen(o => !o)} className="p-1.5 hover:bg-white/5 rounded-lg text-gray-400 hover:text-white transition-colors">
              ☰
            </button>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-sm">🧠</span>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">AI Business Brain</p>
                <p className="text-xs text-gray-400">Always on · Always learning</p>
              </div>
            </div>
          </div>
          {context && context.alerts.length > 0 && (
            <div className="flex gap-2">
              {context.alerts.map((alert, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${alert.type === 'warning' ? 'bg-amber-500/20 text-amber-300' : 'bg-blue-500/20 text-blue-300'}`}>
                  {alert.type === 'warning' ? '⚠️' : 'ℹ️'} {alert.message}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <span className="text-3xl">🧠</span>
                </div>
                <h2 className="text-xl font-bold text-white mb-2">Your AI Business Advisor</h2>
                <p className="text-sm text-gray-400 max-w-md mb-8">
                  I have real-time access to your business data — revenue, contacts, deals, appointments, and more. Ask me anything.
                </p>
                <div className="grid grid-cols-2 gap-2 w-full max-w-lg">
                  {SUGGESTED_PROMPTS.map(p => (
                    <button
                      key={p.text}
                      onClick={() => sendMessage(p.text)}
                      className="flex items-center gap-2 p-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-purple-500/40 rounded-xl text-sm text-gray-300 hover:text-white text-left transition-all"
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
                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold ${msg.role === 'assistant' ? 'bg-gradient-to-br from-purple-500 to-indigo-600' : 'bg-white/10'}`}>
                      {msg.role === 'assistant' ? '🧠' : '?'}
                    </div>
                    <div className={`max-w-[80%] ${msg.role === 'user' ? 'items-end' : ''} flex flex-col`}>
                      <div className={`rounded-2xl px-4 py-3 ${msg.role === 'user' ? 'bg-purple-600 text-white rounded-tr-sm' : 'bg-white/5 border border-white/10 rounded-tl-sm'}`}>
                        {msg.role === 'assistant' ? (
                          <div>
                            {formatMarkdown(msg.content || (msg.isStreaming ? '▋' : ''))}
                            {msg.isStreaming && msg.content && <span className="animate-pulse text-gray-400">▋</span>}
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                        )}
                      </div>
                      <span className="text-[10px] text-gray-600 mt-1 px-1">
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
            <div className="w-52 border-l border-white/10 p-4 shrink-0 overflow-y-auto bg-[#0f0f1e]">
              <p className="text-xs text-gray-500 font-medium mb-3 uppercase tracking-wide">Live Data</p>
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
                      <span className="text-xs text-gray-400">{stat.label}</span>
                    </div>
                    <span className="text-xs font-semibold text-white">{stat.value}</span>
                  </div>
                ))}
              </div>

              {context.alerts.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Alerts</p>
                  {context.alerts.map((alert, i) => (
                    <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${alert.type === 'warning' ? 'bg-amber-500/10 text-amber-300' : 'bg-blue-500/10 text-blue-300'}`}>
                      {alert.message}
                    </div>
                  ))}
                </div>
              )}

              <div className="mt-4 pt-4 border-t border-white/10">
                <p className="text-[10px] text-gray-600">Data refreshes each conversation</p>
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-white/10 p-4">
          <div className="flex items-end gap-3 bg-white/5 border border-white/10 focus-within:border-purple-500/50 rounded-xl px-4 py-3 transition-colors">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={e => { setInput(e.target.value); autoResize() }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(input) } }}
              placeholder="Ask anything about your business... (Enter to send, Shift+Enter for newline)"
              rows={1}
              className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 resize-none focus:outline-none max-h-40"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || isLoading}
              className="w-8 h-8 shrink-0 bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-lg flex items-center justify-center transition-colors"
            >
              {isLoading
                ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                : <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
              }
            </button>
          </div>
          <p className="text-center text-[10px] text-gray-600 mt-2">AI has access to your live business data. Verify important decisions.</p>
        </div>
      </div>
    </div>
  )
}
