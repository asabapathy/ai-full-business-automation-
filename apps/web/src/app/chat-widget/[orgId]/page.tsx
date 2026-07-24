'use client'

import { useState, useEffect, useRef } from 'react'
import { Send } from 'lucide-react'
import { apiClient } from '../../../lib/api-client'

interface Message {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface WidgetConfig {
  name: string
  greeting: string
  primaryColor: string
}

export default function ChatWidgetPage({ params }: { params: { orgId: string } }) {
  const [config, setConfig] = useState<WidgetConfig>({ name: 'Chat with us', greeting: 'Hi! How can I help you today?', primaryColor: '#2563eb' })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [initialized, setInitialized] = useState(false)
  const [visitorId] = useState(() => {
    if (typeof window === 'undefined') return 'visitor-' + Math.random().toString(36).slice(2)
    const stored = localStorage.getItem('kanavu_visitor_id')
    if (stored) return stored
    const id = 'visitor-' + Math.random().toString(36).slice(2)
    localStorage.setItem('kanavu_visitor_id', id)
    return id
  })
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const loadConfig = async () => {
      try {
        const data = await apiClient.get(`/chat-widget/public/${params.orgId}`) as any
        if (data.widget) setConfig(data.widget)
      } catch {}
      setInitialized(true)
    }
    loadConfig()
  }, [params.orgId])

  useEffect(() => {
    if (initialized && messages.length === 0) {
      setMessages([{ role: 'assistant', content: config.greeting, timestamp: new Date() }])
    }
  }, [initialized, config.greeting])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async () => {
    const text = input.trim()
    if (!text || chatLoading) return
    setInput('')
    setMessages(m => [...m, { role: 'user', content: text, timestamp: new Date() }])
    setChatLoading(true)
    try {
      const data = await apiClient.post(`/chat-widget/public/${params.orgId}/chat`, { message: text, visitorId }) as any
      setMessages(m => [...m, { role: 'assistant', content: data.reply ?? "I'm sorry, I couldn't process that.", timestamp: new Date() }])
    } catch {
      setMessages(m => [...m, { role: 'assistant', content: "I'm having trouble connecting. Please try again.", timestamp: new Date() }])
    }
    setChatLoading(false)
  }

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() }
  }

  return (
    <div className="flex flex-col h-screen bg-white font-sans">
      {/* Header */}
      <div className="px-4 py-3 flex items-center gap-3" style={{ backgroundColor: config.primaryColor }}>
        <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4 text-white">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        </div>
        <div>
          <p className="text-white font-semibold text-sm">{config.name}</p>
          <div className="flex items-center gap-1">
            <div className="h-1.5 w-1.5 rounded-full bg-green-300" />
            <p className="text-white/75 text-xs">Online</p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            {msg.role === 'assistant' && (
              <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2 mt-1" style={{ backgroundColor: config.primaryColor }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-white">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
              </div>
            )}
            <div className={`max-w-[80%] rounded-2xl px-4 py-2.5 ${msg.role === 'user' ? 'rounded-tr-sm text-white' : 'rounded-tl-sm bg-gray-100 text-gray-800'}`} style={msg.role === 'user' ? { backgroundColor: config.primaryColor } : {}}>
              <p className="text-sm leading-relaxed">{msg.content}</p>
              <p className={`text-[10px] mt-1 ${msg.role === 'user' ? 'text-white/60' : 'text-gray-400'}`}>
                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>
        ))}
        {chatLoading && (
          <div className="flex justify-start">
            <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mr-2" style={{ backgroundColor: config.primaryColor }}>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 text-white">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
              <div className="flex gap-1">
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="h-2 w-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t bg-white">
        <div className="flex items-center gap-2 rounded-full border border-gray-200 px-3 py-1.5 focus-within:border-blue-300 focus-within:ring-1 focus-within:ring-blue-100">
          <input
            className="flex-1 text-sm outline-none bg-transparent placeholder:text-gray-400"
            placeholder="Type a message..."
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            disabled={chatLoading}
          />
          <button
            onClick={send}
            disabled={!input.trim() || chatLoading}
            className="h-7 w-7 rounded-full flex items-center justify-center text-white transition-opacity disabled:opacity-40"
            style={{ backgroundColor: config.primaryColor }}
          >
            <Send className="h-3.5 w-3.5" />
          </button>
        </div>
        <p className="text-center text-[10px] text-gray-300 mt-2">Powered by Kanavu AI</p>
      </div>
    </div>
  )
}
