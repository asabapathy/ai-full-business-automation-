'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Brain, Loader2, Sparkles, ChevronRight } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Button } from '../ui/button'
import { cn } from '../../lib/utils'
import { api } from '../../lib/api-client'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  isStreaming?: boolean
}

const SUGGESTED_GOALS = [
  'Get me 20 new customers this month',
  'Increase my revenue by 15%',
  'Improve my Google ranking',
  'Create a social media strategy',
  'Analyze my business health',
  'Collect overdue invoices',
]

interface ChatInterfaceProps {
  conversationId?: string
  placeholder?: string
}

export function ChatInterface({ conversationId: initialConvId, placeholder }: ChatInterfaceProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [convId, setConvId] = useState(initialConvId)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const autoResize = () => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`
    }
  }

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return

    const userMessage: Message = {
      id: crypto.randomUUID(),
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
    }

    const assistantMessage: Message = {
      id: crypto.randomUUID(),
      role: 'assistant',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
    }

    setMessages(prev => [...prev, userMessage, assistantMessage])
    setInput('')
    setIsLoading(true)

    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
    }

    try {
      const fullContent = await api.streamChat(
        content.trim(),
        convId,
        (chunk) => {
          setMessages(prev =>
            prev.map(m =>
              m.id === assistantMessage.id
                ? { ...m, content: m.content + chunk }
                : m,
            ),
          )
        },
      )

      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: fullContent, isStreaming: false }
            : m,
        ),
      )
    } catch (error) {
      setMessages(prev =>
        prev.map(m =>
          m.id === assistantMessage.id
            ? { ...m, content: 'Sorry, I encountered an error. Please try again.', isStreaming: false }
            : m,
        ),
      )
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-16">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-kanavu-500 to-kanavu-600 flex items-center justify-center mb-4 shadow-lg">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold mb-2">Business Brain</h2>
            <p className="text-muted-foreground max-w-md mb-8">
              I'm your AI business advisor. Tell me your goals and I'll create a plan to achieve them.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
              {SUGGESTED_GOALS.map(goal => (
                <button
                  key={goal}
                  onClick={() => sendMessage(goal)}
                  className="flex items-center gap-2 rounded-lg border border-border/60 bg-card px-3 py-2.5 text-sm text-left hover:bg-accent hover:border-primary/30 transition-all duration-150 group"
                >
                  <Sparkles className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="flex-1">{goal}</span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-primary transition-colors" />
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map(message => (
          <div
            key={message.id}
            className={cn('flex gap-3', message.role === 'user' && 'flex-row-reverse')}
          >
            {/* Avatar */}
            <div className={cn(
              'flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
              message.role === 'assistant'
                ? 'bg-gradient-to-br from-kanavu-500 to-kanavu-600 text-white'
                : 'bg-primary text-primary-foreground',
            )}>
              {message.role === 'assistant' ? <Brain className="h-4 w-4" /> : 'Y'}
            </div>

            {/* Content */}
            <div className={cn(
              'flex-1 max-w-[80%]',
              message.role === 'user' && 'flex flex-col items-end',
            )}>
              <div className={cn(
                'rounded-2xl px-4 py-3 text-sm',
                message.role === 'user'
                  ? 'bg-primary text-primary-foreground rounded-tr-sm'
                  : 'bg-muted rounded-tl-sm',
              )}>
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content || (message.isStreaming ? '▋' : '')}
                    </ReactMarkdown>
                    {message.isStreaming && message.content && (
                      <span className="animate-pulse">▋</span>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
              <span className="mt-1 text-[10px] text-muted-foreground px-1">
                {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          </div>
        ))}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t bg-background p-4">
        <div className="flex items-end gap-3 rounded-xl border bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring px-4 py-3">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={e => {
              setInput(e.target.value)
              autoResize()
            }}
            onKeyDown={handleKeyDown}
            placeholder={placeholder ?? 'Tell me your business goal or ask anything...'}
            rows={1}
            className="flex-1 resize-none bg-transparent text-sm outline-none placeholder:text-muted-foreground max-h-[200px]"
          />
          <Button
            onClick={() => sendMessage(input)}
            disabled={!input.trim() || isLoading}
            size="icon"
            variant="ai"
            className="h-8 w-8 shrink-0"
          >
            {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </div>
        <p className="mt-2 text-center text-[10px] text-muted-foreground">
          AI can make mistakes. Verify important decisions.
        </p>
      </div>
    </div>
  )
}
