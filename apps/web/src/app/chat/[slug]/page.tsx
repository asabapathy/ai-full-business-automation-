'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams } from 'next/navigation'
import { MessageSquare, Send, X, User, Bot } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

function genVisitorId() {
  const stored = sessionStorage.getItem('kanavu_visitor_id')
  if (stored) return stored
  const id = crypto.randomUUID()
  sessionStorage.setItem('kanavu_visitor_id', id)
  return id
}

interface Message {
  role: 'user' | 'assistant'
  content: string
  id: string
}

export default function ChatWidgetPage() {
  const { slug } = useParams<{ slug: string }>()
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [captureMode, setCaptureMode] = useState(false)
  const [visitorForm, setVisitorForm] = useState({ name: '', email: '' })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const visitorId = genVisitorId()
    fetch(`${API_BASE}/chat/${slug}/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visitorId, channel: 'widget' }),
    })
      .then(r => r.json())
      .then(data => {
        setSessionId(data.sessionId)
        if (data.messages?.length > 0) {
          setMessages(data.messages.map((m: any) => ({ ...m, id: m.id ?? crypto.randomUUID() })))
        } else {
          setMessages([{
            id: crypto.randomUUID(),
            role: 'assistant',
            content: 'Hi there! How can I help you today?',
          }])
        }
      })
      .catch(() => {})
  }, [slug])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const sendMessage = useCallback(async () => {
    if (!input.trim() || !sessionId || streaming) return
    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: input }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setStreaming(true)

    const assistantId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: assistantId, role: 'assistant', content: '' }])

    try {
      const res = await fetch(`${API_BASE}/chat/${slug}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, message: userMsg.content }),
      })

      const reader = res.body?.getReader()
      const decoder = new TextDecoder()
      if (!reader) throw new Error('No stream')

      let buffer = ''
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const parsed = JSON.parse(line.slice(6))
            if (parsed.chunk) {
              setMessages(prev => prev.map(m =>
                m.id === assistantId ? { ...m, content: m.content + parsed.chunk } : m
              ))
            }
          } catch {}
        }
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === assistantId ? { ...m, content: "Sorry, I couldn't process that. Please try again." } : m
      ))
    } finally {
      setStreaming(false)
    }
  }, [input, sessionId, streaming, slug])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
  }

  const submitVisitorInfo = async () => {
    if (!sessionId || !visitorForm.name) return
    await fetch(`${API_BASE}/chat/${slug}/visitor`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId, ...visitorForm }),
    }).catch(() => {})
    setCaptureMode(false)
    setMessages(prev => [...prev, {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: `Thanks, ${visitorForm.name}! Is there anything else I can help you with?`,
    }])
  }

  return (
    <div className="flex flex-col h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 bg-gray-900 border-b border-gray-800">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center">
          <MessageSquare className="w-4 h-4" />
        </div>
        <div>
          <p className="text-sm font-semibold">AI Assistant</p>
          <p className="text-xs text-green-400">Online</p>
        </div>
        <button
          className="ml-auto text-gray-400 hover:text-white"
          onClick={() => window.parent.postMessage('kanavu:close', '*')}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map(msg => (
          <div key={msg.id} className={`flex gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
              {msg.role === 'user' ? <User className="w-3.5 h-3.5" /> : <Bot className="w-3.5 h-3.5" />}
            </div>
            <div className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm ${msg.role === 'user' ? 'bg-indigo-600 rounded-tr-sm' : 'bg-gray-800 rounded-tl-sm'}`}>
              {msg.content || (streaming && msg.role === 'assistant' ? <span className="animate-pulse">...</span> : '')}
            </div>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Capture info prompt */}
      {captureMode && (
        <div className="px-4 pb-2 bg-gray-900 border-t border-gray-800 pt-3">
          <p className="text-xs text-gray-400 mb-2">Share your details so we can follow up:</p>
          <input
            className="w-full mb-2 px-3 py-1.5 rounded-lg bg-gray-800 text-sm border border-gray-700 focus:outline-none"
            placeholder="Your name"
            value={visitorForm.name}
            onChange={e => setVisitorForm(p => ({ ...p, name: e.target.value }))}
          />
          <input
            className="w-full mb-2 px-3 py-1.5 rounded-lg bg-gray-800 text-sm border border-gray-700 focus:outline-none"
            placeholder="Email (optional)"
            value={visitorForm.email}
            onChange={e => setVisitorForm(p => ({ ...p, email: e.target.value }))}
          />
          <button onClick={submitVisitorInfo} className="w-full py-1.5 bg-indigo-600 rounded-lg text-sm font-medium">Submit</button>
        </div>
      )}

      {/* Input */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gray-900 border-t border-gray-800">
        <input
          className="flex-1 px-3 py-2 rounded-xl bg-gray-800 text-sm border border-gray-700 focus:outline-none focus:border-indigo-500"
          placeholder="Type a message..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={streaming}
        />
        <button
          onClick={sendMessage}
          disabled={!input.trim() || streaming}
          className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center disabled:opacity-40"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
