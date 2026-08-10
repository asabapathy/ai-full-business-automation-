'use client'

import { useState, useEffect } from 'react'
import { MessageCircleDashed, Copy, Check, Settings, Users } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

interface ChatWidget {
  id?: string
  name: string
  greeting: string
  primaryColor: string
  position: string
  useKnowledgeBase: boolean
  isActive: boolean
  allowedDomains: string[]
}

export default function ChatWidgetPage() {
  const [widget, setWidget] = useState<ChatWidget>({
    name: 'Chat with us',
    greeting: 'Hi! How can I help you today?',
    primaryColor: '#2563eb',
    position: 'bottom-right',
    useKnowledgeBase: true,
    isActive: true,
    allowedDomains: [],
  })
  const [orgId, setOrgId] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [copied, setCopied] = useState(false)
  const [tab, setTab] = useState<'settings' | 'embed' | 'sessions'>('settings')
  const [sessions, setSessions] = useState<any[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res = await apiClient.get('/chat-widget') as any
        if (res.widget) setWidget(res.widget)
        const authRes = await apiClient.get('/org') as any
        setOrgId(authRes?.organization?.id ?? '')
        if (tab === 'sessions') {
          const sessRes = await apiClient.get('/chat-widget/sessions') as any
          setSessions(sessRes?.sessions ?? [])
        }
      } catch {}
      setLoading(false)
    }
    load()
  }, [tab])

  const save = async () => {
    setSaving(true)
    try {
      await apiClient.put('/chat-widget', widget)
    } catch {}
    setSaving(false)
  }

  const embedCode = orgId ? `<script src="${typeof window !== 'undefined' ? window.location.origin : ''}/chat-widget.js" data-org="${orgId}" async></script>` : ''

  const copyEmbed = () => {
    navigator.clipboard.writeText(embedCode)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">AI Chat Widget</h1>
        <p className="text-sm text-muted-foreground mt-1">Embed an AI-powered chat widget on your website</p>
      </div>

      <div className="flex gap-2 border-b">
        {(['settings', 'embed', 'sessions'] as const).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors capitalize ${tab === t ? '' : 'border-transparent text-muted-foreground'}`}
            style={tab === t ? { color: '#06b6d4', borderColor: '#06b6d4' } : {}}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'settings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="rounded-xl border p-6 space-y-4" style={{ background: 'hsl(var(--card))' }}>
            <h2 className="font-semibold text-foreground flex items-center gap-2">
              <Settings className="h-4 w-4" style={{ color: '#06b6d4' }} />
              Widget Settings
            </h2>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Widget Name</label>
              <input
                className="w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={widget.name}
                onChange={e => setWidget(w => ({ ...w, name: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">Greeting Message</label>
              <textarea
                rows={2}
                className="w-full rounded-lg px-3 py-2 text-sm resize-none text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                value={widget.greeting}
                onChange={e => setWidget(w => ({ ...w, greeting: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    className="h-9 w-16 rounded cursor-pointer"
                    style={{ border: '1px solid hsl(var(--border))' }}
                    value={widget.primaryColor}
                    onChange={e => setWidget(w => ({ ...w, primaryColor: e.target.value }))}
                  />
                  <span className="text-sm text-muted-foreground font-mono">{widget.primaryColor}</span>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">Position</label>
                <select
                  className="w-full rounded-lg px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}
                  value={widget.position}
                  onChange={e => setWidget(w => ({ ...w, position: e.target.value }))}
                >
                  <option value="bottom-right">Bottom Right</option>
                  <option value="bottom-left">Bottom Left</option>
                </select>
              </div>
            </div>
            <div className="flex items-center justify-between rounded-lg p-3" style={{ background: 'hsl(var(--muted))' }}>
              <div>
                <p className="text-sm font-medium text-foreground">Use Knowledge Base</p>
                <p className="text-xs text-muted-foreground">AI answers based on your KB articles</p>
              </div>
              <button
                onClick={() => setWidget(w => ({ ...w, useKnowledgeBase: !w.useKnowledgeBase }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: widget.useKnowledgeBase ? '#06b6d4' : 'rgba(0,0,0,0.2)' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${widget.useKnowledgeBase ? 'translate-x-6' : 'translate-x-1'}`}
                  style={{ background: 'white' }}
                />
              </button>
            </div>
            <div className="flex items-center justify-between rounded-lg p-3" style={{ background: 'hsl(var(--muted))' }}>
              <div>
                <p className="text-sm font-medium text-foreground">Active</p>
                <p className="text-xs text-muted-foreground">Show widget on your website</p>
              </div>
              <button
                onClick={() => setWidget(w => ({ ...w, isActive: !w.isActive }))}
                className="relative inline-flex h-6 w-11 items-center rounded-full transition-colors"
                style={{ background: widget.isActive ? '#06b6d4' : 'rgba(0,0,0,0.2)' }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full transition-transform ${widget.isActive ? 'translate-x-6' : 'translate-x-1'}`}
                  style={{ background: 'white' }}
                />
              </button>
            </div>
            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-lg py-2 text-sm font-medium disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>

          {/* Preview */}
          <div className="rounded-xl border p-6 relative min-h-[400px]" style={{ background: 'hsl(var(--muted))' }}>
            <p className="text-xs font-medium text-muted-foreground mb-2">Preview</p>
            <div className={`absolute ${widget.position === 'bottom-right' ? 'bottom-4 right-4' : 'bottom-4 left-4'} flex flex-col items-end gap-2`}>
              <div className="w-64 rounded-2xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
                <div className="px-4 py-3" style={{ backgroundColor: widget.primaryColor }}>
                  <p className="text-white font-medium text-sm">{widget.name}</p>
                </div>
                <div className="p-3 text-xs mx-3 mt-3 rounded-xl" style={{ color: 'hsl(var(--foreground))', background: 'hsl(var(--muted))' }}>
                  {widget.greeting}
                </div>
                <div className="p-3 flex gap-2">
                  <input
                    className="flex-1 rounded-full px-3 py-1.5 text-xs placeholder:text-muted-foreground"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--background))' }}
                    placeholder="Type a message..."
                    readOnly
                  />
                  <button className="h-7 w-7 rounded-full flex items-center justify-center text-white text-xs" style={{ backgroundColor: widget.primaryColor }}>→</button>
                </div>
              </div>
              <div className="h-12 w-12 rounded-full flex items-center justify-center text-white" style={{ backgroundColor: widget.primaryColor }}>
                <MessageCircleDashed className="h-5 w-5" />
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'embed' && (
        <div className="rounded-xl border p-6 space-y-4" style={{ background: 'hsl(var(--card))' }}>
          <h2 className="font-semibold text-foreground">Embed on Your Website</h2>
          <p className="text-sm text-muted-foreground">Add this script tag to your website's &lt;body&gt; to show the chat widget:</p>
          <div className="rounded-lg p-4" style={{ background: '#111827' }}>
            <code className="text-sm font-mono break-all" style={{ color: '#34d399' }}>{embedCode || 'Loading...'}</code>
          </div>
          <button onClick={copyEmbed} className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium text-muted-foreground">
            {copied ? <Check className="h-4 w-4" style={{ color: '#34d399' }} /> : <Copy className="h-4 w-4" />}
            {copied ? 'Copied!' : 'Copy Code'}
          </button>
        </div>
      )}

      {tab === 'sessions' && (
        <div className="rounded-xl border overflow-hidden" style={{ background: 'hsl(var(--card))' }}>
          <div className="p-4 border-b flex items-center gap-2">
            <Users className="h-4 w-4" style={{ color: '#06b6d4' }} />
            <h2 className="font-semibold text-foreground">Chat Sessions</h2>
          </div>
          {sessions.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">No sessions yet</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="border-b" style={{ background: 'hsl(var(--muted))' }}>
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Visitor</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Messages</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase">Started</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {sessions.map((s: any) => (
                  <tr key={s.id}>
                    <td className="px-4 py-3 text-muted-foreground font-mono text-xs">{s.visitorId.slice(0, 12)}...</td>
                    <td className="px-4 py-3 text-muted-foreground">{(s.messages as any[]).length}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{new Date(s.createdAt).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
