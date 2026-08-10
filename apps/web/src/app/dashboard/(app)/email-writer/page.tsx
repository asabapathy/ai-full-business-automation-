'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { PenTool, Sparkles, Trash2, RefreshCw, ChevronRight } from 'lucide-react'

interface Draft {
  id: string
  subject: string
  htmlContent: string
  prompt: string
  tone?: string
  createdAt: string
}

const inputCls = 'w-full rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary'
const inputStyle = { border: '1px solid hsl(var(--border))' }

export default function EmailWriterPage() {
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Draft | null>(null)
  const [form, setForm] = useState({ prompt: '', tone: 'professional', subject: '' })
  const [generating, setGenerating] = useState(false)
  const [refineText, setRefineText] = useState('')
  const [refining, setRefining] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const res = await apiClient.get<{ drafts: Draft[] }>('/email-writer')
      setDrafts(res.drafts)
    } finally { setLoading(false) }
  }

  async function generate() {
    if (!form.prompt) return
    setGenerating(true)
    try {
      const res = await apiClient.post<{ draft: Draft }>('/email-writer/generate', form)
      setDrafts(prev => [res.draft, ...prev])
      setSelected(res.draft)
      setForm({ prompt: '', tone: 'professional', subject: '' })
    } catch (e: any) { toast(e.message || 'Failed to generate email', 'error') } finally { setGenerating(false) }
  }

  async function refine() {
    if (!selected || !refineText) return
    setRefining(true)
    try {
      const res = await apiClient.post<{ draft: Draft }>(`/email-writer/${selected.id}/refine`, { instruction: refineText })
      setSelected(res.draft)
      setDrafts(prev => prev.map(d => d.id === res.draft.id ? res.draft : d))
      setRefineText('')
    } catch (e: any) { toast(e.message || 'Failed to refine email', 'error') } finally { setRefining(false) }
  }

  async function remove(id: string) {
    await apiClient.delete(`/email-writer/${id}`)
    if (selected?.id === id) setSelected(null)
    setDrafts(prev => prev.filter(d => d.id !== id))
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AI Email Writer</h1>
        <p className="text-muted-foreground text-sm mt-1">Generate professional emails with AI assistance</p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="space-y-4">
          <div className="bg-card border rounded-xl p-4 space-y-3">
            <h2 className="font-semibold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" /> Generate New Email
            </h2>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">PROMPT</label>
              <textarea value={form.prompt} onChange={e => setForm({ ...form, prompt: e.target.value })}
                rows={4} placeholder="Write a follow-up email to a client who requested a quote last week…"
                className={inputCls + ' resize-none'} style={inputStyle} />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">TONE</label>
              <select value={form.tone} onChange={e => setForm({ ...form, tone: e.target.value })}
                className={inputCls} style={inputStyle}>
                {['professional', 'friendly', 'formal', 'casual', 'persuasive'].map(t => (
                  <option key={t} value={t} className="capitalize">{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground block mb-1">SUBJECT (optional)</label>
              <input value={form.subject} onChange={e => setForm({ ...form, subject: e.target.value })}
                placeholder="Override AI-generated subject"
                className={inputCls} style={inputStyle} />
            </div>
            <button onClick={generate} disabled={generating || !form.prompt}
              className="w-full flex items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-medium disabled:opacity-50 hover:opacity-90"
              style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>
              <Sparkles className="h-4 w-4" />
              {generating ? 'Generating…' : 'Generate Email'}
            </button>
          </div>

          <div className="bg-card border rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b font-medium text-sm">Saved Drafts ({drafts.length})</div>
            {loading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">Loading…</div>
            ) : drafts.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground text-sm">No drafts yet</div>
            ) : (
              <div className="divide-y max-h-64 overflow-y-auto">
                {drafts.map(d => (
                  <div key={d.id}
                    className={`px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors group ${selected?.id === d.id ? 'bg-primary/10' : ''}`}
                    onClick={() => setSelected(d)}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate">{d.subject}</p>
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{d.prompt}</p>
                      </div>
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={e => { e.stopPropagation(); remove(d.id) }}
                          className="p-1 rounded hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
                        </button>
                        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          {selected ? (
            <div className="bg-card border rounded-xl h-full flex flex-col">
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold">{selected.subject}</p>
                    <p className="text-xs text-muted-foreground mt-0.5 capitalize">Tone: {selected.tone ?? 'professional'}</p>
                  </div>
                  <span className="text-xs text-muted-foreground">{new Date(selected.createdAt).toLocaleDateString()}</span>
                </div>
              </div>
              <div className="flex-1 p-4 overflow-auto">
                <div className="prose max-w-none text-sm"
                  dangerouslySetInnerHTML={{ __html: selected.htmlContent }} />
              </div>
              <div className="p-4 border-t space-y-2">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Refine with AI</p>
                <div className="flex gap-2">
                  <input value={refineText} onChange={e => setRefineText(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && refine()}
                    placeholder="Make it shorter, add a P.S., change the CTA…"
                    className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-background focus:outline-none focus:ring-2 focus:ring-primary"
                    style={{ border: '1px solid hsl(var(--border))' }} />
                  <button onClick={refine} disabled={refining || !refineText}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium disabled:opacity-50 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }}>
                    <RefreshCw className={`h-4 w-4 ${refining ? 'animate-spin' : ''}`} />
                    Refine
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-card border rounded-xl h-full flex items-center justify-center p-12">
              <div className="text-center">
                <PenTool className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
                <p className="text-muted-foreground">Generate an email or select a draft to preview</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
