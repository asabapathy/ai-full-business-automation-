'use client'

import { useState, useEffect, useRef } from 'react'
import { PhoneCall, PhoneMissed, Phone, TrendingUp, Clock, MessageSquare, Settings, Copy, CheckCircle, Send, Bot, User, Zap } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface CallLog {
  id: string
  fromNumber: string
  toNumber: string
  direction: string
  status: string
  duration?: number
  summary?: string
  sentiment?: string
  createdAt: string
}

interface CallStats {
  total: number
  missed: number
  inbound: number
  outbound: number
  missedRate: number
  avgDuration: number
}

interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }

const DEMO_CALLS: CallLog[] = [
  { id: '1', fromNumber: '+1 (555) 012-3456', toNumber: '+1 (555) 987-6543', direction: 'inbound', status: 'completed', duration: 214, summary: 'Caller asked about HVAC tune-up pricing. AI quoted $150 and offered appointment slots.', sentiment: 'positive', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '2', fromNumber: '+1 (555) 234-5678', toNumber: '+1 (555) 987-6543', direction: 'inbound', status: 'no-answer', summary: 'Missed call — voicemail left', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '3', fromNumber: '+1 (555) 345-6789', toNumber: '+1 (555) 987-6543', direction: 'inbound', status: 'completed', duration: 87, summary: 'Caller booked an appointment for Tuesday 2pm. AC inspection.', sentiment: 'positive', createdAt: new Date(Date.now() - 86400000).toISOString() },
]

export default function ReceptionistPage() {
  const [tab, setTab] = useState<'calls' | 'chat' | 'setup'>('calls')
  const [calls, setCalls] = useState<CallLog[]>(DEMO_CALLS)
  const [stats, setStats] = useState<CallStats | null>(null)
  const [filter, setFilter] = useState<'all' | 'missed' | 'inbound' | 'outbound'>('all')
  const [loading, setLoading] = useState(true)

  // Chat
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: 'Hi! I\'m your AI receptionist. Tell me about a booking request and I\'ll check availability and help schedule it.', ts: Date.now() },
  ])
  const [chatInput, setChatInput] = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)

  // Setup
  const [webhookUrls, setWebhookUrls] = useState<Record<string, string> | null>(null)
  const [voiceConfig, setVoiceConfig] = useState({ twilioAccountSid: '', twilioAuthToken: '', twilioPhoneNumber: '', elevenLabsApiKey: '', elevenLabsVoiceId: 'Rachel', useElevenLabs: false })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [callsRes, statsRes] = await Promise.all([
          apiClient.get(`/call-log${filter !== 'all' ? `?${filter === 'missed' ? 'status=no-answer' : `direction=${filter}`}` : ''}`),
          apiClient.get('/call-log/stats'),
        ])
        const callList = (callsRes as any).calls
        if (callList?.length) setCalls(callList)
        setStats(statsRes as CallStats)
      } catch {
        setStats({ total: 47, missed: 6, inbound: 41, outbound: 6, missedRate: 13, avgDuration: 148 })
      }
      setLoading(false)
    }
    load()
  }, [filter])

  useEffect(() => {
    if (tab !== 'setup') return
    apiClient.get('/voice/settings').then((res: any) => {
      if (res?.slug) {
        apiClient.get(`/voice/${res.slug}/webhook-urls`).then((urls: any) => setWebhookUrls(urls)).catch(() => {})
      }
      if (res?.config) setVoiceConfig(prev => ({ ...prev, ...res.config }))
    }).catch(() => {})
  }, [tab])

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatMessages])

  async function sendChatMessage() {
    if (!chatInput.trim() || chatLoading) return
    const content = chatInput.trim()
    setChatInput('')
    setChatMessages(prev => [...prev, { role: 'user', content, ts: Date.now() }])
    setChatLoading(true)

    try {
      const [namePart] = content.match(/(?:from|for)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/i) ?? []
      const contactName = namePart?.replace(/^(?:from|for)\s+/i, '') ?? 'Guest'
      const res = await apiClient.post('/receptionist/book', {
        contactName,
        serviceType: content,
        notes: content,
      }) as any
      const reply = res?.response ?? res?.data?.response ?? 'I\'ve noted your request. Let me check availability for you — I\'ll suggest some time slots shortly.'
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply, ts: Date.now() }])
    } catch {
      setChatMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I couldn\'t process that booking right now. Please try again or call us directly.', ts: Date.now() }])
    }
    setChatLoading(false)
  }

  const saveConfig = async () => {
    setSaving(true)
    try {
      await apiClient.post('/voice/settings', voiceConfig)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch {}
    setSaving(false)
  }

  const copyUrl = (url: string, key: string) => {
    navigator.clipboard.writeText(url)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '—'
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
  }

  const TABS = [
    { key: 'calls', label: 'Call Log' },
    { key: 'chat', label: 'AI Book' },
    { key: 'setup', label: 'Setup' },
  ] as const

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Phone Receptionist</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Answer calls 24/7 with AI · never miss a lead</p>
        </div>
        <div className="flex rounded-xl p-1 gap-0.5" style={cardStyle}>
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all"
              style={tab === t.key
                ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                : { color: 'hsl(var(--muted-foreground))' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div {...anim(1)} className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Total Calls', value: stats.total, icon: Phone, color: '#06b6d4' },
            { label: 'Missed', value: stats.missed, icon: PhoneMissed, color: '#f87171' },
            { label: 'Miss Rate', value: `${stats.missedRate}%`, icon: TrendingUp, color: '#fbbf24' },
            { label: 'Avg Duration', value: formatDuration(stats.avgDuration), icon: Clock, color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <div className="flex items-center gap-2 mb-1">
                <s.icon className="h-4 w-4" style={{ color: s.color }} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold text-foreground tabular">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Call log tab */}
      {tab === 'calls' && (
        <div {...anim(2)} className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            {(['all', 'missed', 'inbound', 'outbound'] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="px-3 py-1.5 rounded-full text-xs font-medium transition-all capitalize"
                style={filter === f
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
                }
              >
                {f}
              </button>
            ))}
          </div>

          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            {loading ? (
              <div className="p-8 text-center text-muted-foreground">Loading…</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                      {['From', 'Direction', 'Status', 'Duration', 'Summary', 'Time'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {calls.filter(c => {
                      if (filter === 'missed') return c.status === 'no-answer'
                      if (filter === 'inbound') return c.direction === 'inbound'
                      if (filter === 'outbound') return c.direction === 'outbound'
                      return true
                    }).map((call, i, arr) => (
                      <tr key={call.id} className="transition-colors hover:bg-white/2" style={{ borderBottom: i < arr.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                        <td className="px-4 py-3 font-medium text-foreground font-mono text-xs">{call.fromNumber}</td>
                        <td className="px-4 py-3">
                          <span className="flex items-center gap-1 text-xs font-medium" style={{ color: call.direction === 'inbound' ? '#06b6d4' : '#a855f7' }}>
                            <PhoneCall className="h-3 w-3" />
                            {call.direction}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={
                            call.status === 'no-answer' || call.status === 'missed'
                              ? { color: '#f87171', background: 'rgba(248,113,113,0.1)' }
                              : { color: '#34d399', background: 'rgba(52,211,153,0.1)' }
                          }>
                            {call.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground tabular text-xs">{formatDuration(call.duration)}</td>
                        <td className="px-4 py-3 max-w-xs">
                          {call.summary ? (
                            <div>
                              <p className="text-xs text-muted-foreground truncate">{call.summary}</p>
                              {call.sentiment && (
                                <span className="text-[10px]" style={{ color: call.sentiment === 'positive' ? '#34d399' : call.sentiment === 'negative' ? '#f87171' : '#94a3b8' }}>
                                  {call.sentiment}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="flex items-center gap-1 text-xs text-muted-foreground/50">
                              <MessageSquare className="h-3 w-3" />
                              No summary
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(call.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {calls.length === 0 && <div className="py-10 text-center text-muted-foreground text-sm">No calls recorded yet</div>}
              </div>
            )}
          </div>
        </div>
      )}

      {/* AI chat booking tab */}
      {tab === 'chat' && (
        <div {...anim(2)} className="flex flex-col rounded-xl overflow-hidden" style={{ ...cardStyle, height: '560px' }}>
          <div className="flex items-center gap-3 px-5 py-3" style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(6,182,212,0.04)' }}>
            <div className="h-8 w-8 rounded-lg flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
              <Zap className="h-4 w-4 text-white" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">AI Booking Assistant</p>
              <p className="text-xs text-muted-foreground">Describe a booking request to schedule it</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex items-start gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                <div className="h-7 w-7 rounded-full flex items-center justify-center shrink-0" style={
                  msg.role === 'assistant'
                    ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }
                    : { background: 'rgba(255,255,255,0.1)' }
                }>
                  {msg.role === 'assistant' ? <Bot className="h-3.5 w-3.5 text-white" /> : <User className="h-3.5 w-3.5 text-muted-foreground" />}
                </div>
                <div
                  className="max-w-[80%] rounded-2xl px-4 py-3 text-sm"
                  style={msg.role === 'assistant'
                    ? { background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)', color: 'hsl(var(--foreground))' }
                    : { background: 'rgba(255,255,255,0.06)', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }
                  }
                >
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex items-start gap-3">
                <div className="h-7 w-7 rounded-full flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  <Bot className="h-3.5 w-3.5 text-white" />
                </div>
                <div className="rounded-2xl px-4 py-3" style={{ background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <div className="flex gap-1">
                    {[0, 1, 2].map(i => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ background: '#06b6d4', animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          <div className="p-4" style={{ borderTop: '1px solid hsl(var(--border))' }}>
            <form onSubmit={e => { e.preventDefault(); sendChatMessage() }} className="flex gap-2">
              <input
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                placeholder="e.g. Book a 1-hour AC service for Sarah on Tuesday afternoon…"
                className="flex-1 rounded-xl px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
              />
              <button
                type="submit"
                disabled={chatLoading || !chatInput.trim()}
                className="h-10 w-10 rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:scale-[1.05]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
            <p className="text-[10px] text-muted-foreground/50 mt-1.5 text-center">AI will suggest time slots and can create appointments automatically</p>
          </div>
        </div>
      )}

      {/* Setup tab */}
      {tab === 'setup' && (
        <div {...anim(2)} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
              <div>
                <h2 className="text-sm font-semibold text-foreground mb-0.5">Twilio Configuration</h2>
                <p className="text-xs text-muted-foreground">Connect Twilio to route calls to the AI receptionist</p>
              </div>
              {[
                { key: 'twilioAccountSid', label: 'Account SID', placeholder: 'ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', type: 'text' },
                { key: 'twilioAuthToken', label: 'Auth Token', placeholder: '••••••••••••••••••••••••••••••••', type: 'password' },
                { key: 'twilioPhoneNumber', label: 'Phone Number', placeholder: '+15551234567', type: 'text' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    placeholder={field.placeholder}
                    value={(voiceConfig as any)[field.key]}
                    onChange={e => setVoiceConfig(p => ({ ...p, [field.key]: e.target.value }))}
                    className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  />
                </div>
              ))}
            </div>

            <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-semibold text-foreground">ElevenLabs Voice</h2>
                  <p className="text-xs text-muted-foreground">Ultra-realistic AI voice (optional)</p>
                </div>
                <div
                  onClick={() => setVoiceConfig(p => ({ ...p, useElevenLabs: !p.useElevenLabs }))}
                  className="relative cursor-pointer w-9 h-5 rounded-full transition-all"
                  style={voiceConfig.useElevenLabs ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' } : { background: 'rgba(255,255,255,0.1)' }}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full transition-transform ${voiceConfig.useElevenLabs ? 'translate-x-4' : 'translate-x-0.5'}`} style={{ background: 'white' }} />
                </div>
              </div>
              {voiceConfig.useElevenLabs && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">API Key</label>
                    <input type="password" placeholder="sk-..." value={voiceConfig.elevenLabsApiKey} onChange={e => setVoiceConfig(p => ({ ...p, elevenLabsApiKey: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Voice</label>
                    <select value={voiceConfig.elevenLabsVoiceId} onChange={e => setVoiceConfig(p => ({ ...p, elevenLabsVoiceId: e.target.value }))} className="w-full rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                      {['Rachel', 'Drew', 'Bella', 'Antoni', 'Clyde'].map(v => <option key={v} value={v}>{v}</option>)}
                    </select>
                  </div>
                </div>
              )}
            </div>

            <button
              onClick={saveConfig}
              disabled={saving}
              className="w-full py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02] flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
            >
              {saving ? 'Saving…' : saved ? <><CheckCircle className="h-4 w-4" />Saved!</> : 'Save Configuration'}
            </button>
          </div>

          <div className="rounded-xl p-5 space-y-4" style={cardStyle}>
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-0.5">Twilio Webhook URLs</h2>
              <p className="text-xs text-muted-foreground">Configure these in your Twilio phone number settings</p>
            </div>
            {webhookUrls ? (
              <div className="space-y-3">
                {[
                  { label: 'Incoming Call (Voice URL)', key: 'inbound', url: webhookUrls.inbound },
                  { label: 'Speech Response', key: 'respond', url: webhookUrls.respond },
                  { label: 'Voicemail / Recording', key: 'voicemail', url: webhookUrls.voicemail },
                  { label: 'Call Status Callback', key: 'status', url: webhookUrls.status },
                ].map(item => (
                  <div key={item.key} className="rounded-lg p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))' }}>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
                      <button onClick={() => copyUrl(item.url, item.key)} className="p-0.5 text-muted-foreground hover:text-foreground transition-colors">
                        {copied === item.key ? <CheckCircle className="h-3.5 w-3.5" style={{ color: '#34d399' }} /> : <Copy className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                    <code className="text-xs font-mono text-primary break-all">{item.url}</code>
                  </div>
                ))}
              </div>
            ) : (
              <div className="rounded-xl p-4 text-sm" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.2)', color: '#06b6d4' }}>
                Save your Twilio credentials to see your webhook URLs.
              </div>
            )}

            <div className="rounded-xl p-4" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid hsl(var(--border))' }}>
              <h3 className="text-xs font-semibold text-foreground mb-2">Quick Setup</h3>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>Save Twilio credentials above</li>
                <li>Go to Twilio Console → Phone Numbers → Active Numbers</li>
                <li>Set Voice URL to the Incoming Call webhook</li>
                <li>Test by calling your Twilio number</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
