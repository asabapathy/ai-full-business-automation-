'use client'

import { useState, useEffect } from 'react'
import { Mail, Plus, Send, Trash2, Sparkles, Edit2, Clock, CheckCircle2 } from 'lucide-react'

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1'

interface Campaign {
  id: string
  name: string
  subject: string
  status: string
  recipientCount: number
  openCount: number
  clickCount: number
  scheduledAt: string | null
  sentAt: string | null
  createdAt: string
}

const statusColor: Record<string, string> = {
  DRAFT: 'bg-gray-500/20 text-gray-400',
  SCHEDULED: 'bg-yellow-500/20 text-yellow-400',
  SENT: 'bg-green-500/20 text-green-400',
}

export default function CampaignsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [showGenerate, setShowGenerate] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', subject: '', previewText: '', htmlBody: '' })
  const [generatePrompt, setGeneratePrompt] = useState('')
  const [generateTone, setGenerateTone] = useState('professional')

  const token = typeof window !== 'undefined' ? localStorage.getItem('kanavu_token') : null
  const headers = { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }

  const load = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/campaigns`, { headers })
      const data = await res.json() as { campaigns: Campaign[] }
      setCampaigns(data.campaigns ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const handleCreate = async () => {
    if (!form.name || !form.subject || !form.htmlBody) return
    await fetch(`${API_BASE}/campaigns`, {
      method: 'POST', headers,
      body: JSON.stringify(form),
    })
    setForm({ name: '', subject: '', previewText: '', htmlBody: '' })
    setShowCreate(false)
    void load()
  }

  const handleGenerate = async () => {
    if (!generatePrompt) return
    setGenerating(true)
    try {
      const res = await fetch(`${API_BASE}/campaigns/generate`, {
        method: 'POST', headers,
        body: JSON.stringify({ prompt: generatePrompt, tone: generateTone }),
      })
      const data = await res.json() as { content: { subject: string; html: string } }
      setForm(p => ({ ...p, subject: data.content.subject, htmlBody: data.content.html }))
      setShowGenerate(false)
      setShowCreate(true)
    } finally {
      setGenerating(false)
    }
  }

  const handleSend = async (id: string) => {
    if (!confirm('Send this campaign to all contacts with an email address?')) return
    setSending(id)
    try {
      const res = await fetch(`${API_BASE}/campaigns/${id}/send`, { method: 'POST', headers })
      const data = await res.json() as { sent: number; failed: number }
      alert(`Sent to ${data.sent} contacts. Failed: ${data.failed}`)
      void load()
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this campaign?')) return
    await fetch(`${API_BASE}/campaigns/${id}`, { method: 'DELETE', headers })
    void load()
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2"><Mail className="w-6 h-6 text-indigo-400" /> Email Campaigns</h1>
          <p className="text-gray-400 text-sm mt-1">Create and send AI-powered email campaigns</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowGenerate(true)} className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
            <Sparkles className="w-4 h-4" /> AI Generate
          </button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> New Campaign
          </button>
        </div>
      </div>

      {/* Campaigns list */}
      {loading ? (
        <div className="text-center text-gray-500 py-16">Loading...</div>
      ) : campaigns.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Mail className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p>No campaigns yet. Create your first email campaign.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campaigns.map(c => (
            <div key={c.id} className="bg-gray-900 border border-gray-800 rounded-xl p-4 flex items-center gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-white">{c.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${statusColor[c.status] ?? 'bg-gray-500/20 text-gray-400'}`}>{c.status}</span>
                </div>
                <p className="text-sm text-gray-400">{c.subject}</p>
                <div className="flex gap-4 mt-2 text-xs text-gray-500">
                  {c.status === 'SENT' && (
                    <>
                      <span>{c.recipientCount} sent</span>
                      <span>{c.openCount} opens</span>
                      <span>{c.clickCount} clicks</span>
                      {c.recipientCount > 0 && <span>{Math.round(c.openCount / c.recipientCount * 100)}% open rate</span>}
                    </>
                  )}
                  {c.scheduledAt && <span><Clock className="w-3 h-3 inline mr-1" />{new Date(c.scheduledAt).toLocaleString()}</span>}
                  {c.sentAt && <span><CheckCircle2 className="w-3 h-3 inline mr-1" />{new Date(c.sentAt).toLocaleDateString()}</span>}
                </div>
              </div>
              <div className="flex gap-2">
                {c.status === 'DRAFT' && (
                  <button
                    onClick={() => handleSend(c.id)}
                    disabled={sending === c.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600/20 text-green-400 hover:bg-green-600/30 rounded-lg text-sm disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" /> {sending === c.id ? 'Sending...' : 'Send'}
                  </button>
                )}
                <button onClick={() => handleDelete(c.id)} className="p-1.5 text-gray-500 hover:text-red-400 rounded-lg">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* AI Generate modal */}
      {showGenerate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-lg p-6">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-400" /> AI Email Generator</h2>
            <div className="space-y-3">
              <div>
                <label className="text-sm text-gray-400 block mb-1">What should this email be about?</label>
                <textarea
                  value={generatePrompt}
                  onChange={e => setGeneratePrompt(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none focus:border-indigo-500"
                  placeholder="e.g. Promote our spring sale with 20% off all services this weekend"
                />
              </div>
              <div>
                <label className="text-sm text-gray-400 block mb-1">Tone</label>
                <select value={generateTone} onChange={e => setGenerateTone(e.target.value)} className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none">
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="urgent">Urgent</option>
                  <option value="casual">Casual</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowGenerate(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleGenerate} disabled={generating || !generatePrompt} className="flex-1 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium disabled:opacity-50">
                {generating ? 'Generating...' : 'Generate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 border border-gray-700 rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2"><Edit2 className="w-5 h-5 text-indigo-400" /> New Campaign</h2>
            <div className="space-y-3">
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Campaign name" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.subject} onChange={e => setForm(p => ({ ...p, subject: e.target.value }))} placeholder="Email subject line" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <input value={form.previewText} onChange={e => setForm(p => ({ ...p, previewText: e.target.value }))} placeholder="Preview text (optional)" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm focus:outline-none" />
              <textarea value={form.htmlBody} onChange={e => setForm(p => ({ ...p, htmlBody: e.target.value }))} rows={10} placeholder="HTML email body" className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white text-sm font-mono focus:outline-none" />
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2 border border-gray-700 text-gray-400 rounded-lg text-sm">Cancel</button>
              <button onClick={handleCreate} className="flex-1 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium">Save Draft</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
