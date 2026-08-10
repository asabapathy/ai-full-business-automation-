'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { X, Send, Brain, RefreshCw, Sparkles, Trash2 } from 'lucide-react'
import { apiClient } from '../../lib/api-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
}

const SUGGESTIONS = [
  "Summarize today's activity",
  'Which leads need follow-up?',
  'Show me overdue invoices',
  'Generate a follow-up email template',
]

interface Props {
  open: boolean
  onClose: () => void
}

export function AIChatPanel({ open, onClose }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [streamingContent, setStreamingContent] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50)
  }, [open])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingContent])

  const send = useCallback(async (text?: string) => {
    const content = (text ?? input).trim()
    if (!content || streaming) return
    setInput('')

    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content }
    setMessages(prev => [...prev, userMsg])
    setStreaming(true)
    setStreamingContent('')

    let full = ''
    try {
      await apiClient.streamChat(content, undefined, chunk => {
        full += chunk
        setStreamingContent(full)
      })
    } catch {
      full = "I'm having trouble connecting right now. Please try again in a moment."
    } finally {
      setMessages(prev => [...prev, { id: `a-${Date.now()}`, role: 'assistant', content: full || "I'm here to help with your business." }])
      setStreaming(false)
      setStreamingContent('')
    }
  }, [input, streaming])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div
        className="relative w-full max-w-sm flex flex-col h-full shadow-2xl"
        style={{ background: 'hsl(var(--card))', borderLeft: '1px solid hsl(var(--border))' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
          <div className="flex items-center gap-2.5">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Brain className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">Kanavu AI</p>
              <p className="text-xs text-muted-foreground">Business intelligence</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            {messages.length > 0 && (
              <button onClick={() => { setMessages([]); setStreamingContent('') }}
                className="p-1.5 rounded-lg hover:bg-muted transition-colors" title="Clear chat">
                <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted transition-colors">
              <X className="h-4 w-4 text-muted-foreground" />
            </button>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !streaming && (
            <div className="space-y-4">
              <div className="text-center py-6">
                <div className="h-14 w-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.15), rgba(14,165,233,0.08))', border: '1px solid rgba(6,182,212,0.2)' }}>
                  <Sparkles className="h-6 w-6" style={{ color: '#06b6d4' }} />
                </div>
                <p className="text-sm font-semibold text-foreground">How can I help?</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Ask about your contacts, invoices, revenue,<br />or let me draft content for you.</p>
              </div>
              <div className="space-y-2">
                {SUGGESTIONS.map(s => (
                  <button key={s} onClick={() => send(s)}
                    className="w-full text-left px-3 py-2.5 rounded-xl text-sm text-foreground/80 hover:text-foreground transition-all hover:scale-[1.01]"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map(msg => (
            <div key={msg.id} className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'assistant' && (
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  <Brain className="h-3.5 w-3.5 text-white" />
                </div>
              )}
              <div
                className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed whitespace-pre-wrap"
                style={msg.role === 'user'
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}

          {streaming && (
            <div className="flex gap-2.5 justify-start">
              <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                <Brain className="h-3.5 w-3.5 text-white" />
              </div>
              <div className="max-w-[82%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}>
                {streamingContent
                  ? <span className="whitespace-pre-wrap">{streamingContent}<span className="inline-block w-0.5 h-3.5 ml-0.5 align-middle animate-pulse rounded" style={{ background: '#06b6d4' }} /></span>
                  : <RefreshCw className="h-3.5 w-3.5 animate-spin" style={{ color: '#06b6d4' }} />
                }
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="p-4 shrink-0" style={{ borderTop: '1px solid hsl(var(--border))' }}>
          <div className="flex gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
              placeholder="Ask anything about your business…"
              disabled={streaming}
              className="flex-1 rounded-xl px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-50"
              style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
            />
            <button
              onClick={() => send()}
              disabled={!input.trim() || streaming}
              className="p-2.5 rounded-xl text-white disabled:opacity-40 transition-all hover:scale-[1.05] active:scale-95"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="text-[10px] text-muted-foreground mt-2 text-center">Press Enter to send · Shift+Enter for new line</p>
        </div>
      </div>
    </div>
  )
}
