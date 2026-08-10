'use client'

import { useState, useEffect } from 'react'
import { FileSignature, Plus, Send, Eye, Trash2, CheckCircle, Clock, File, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

interface DocumentTemplate {
  id: string
  name: string
  description?: string
  content: string
  fields: any[]
  isActive: boolean
  createdAt: string
}

interface SignedDocument {
  id: string
  templateId: string
  template?: { name: string }
  contactId: string
  contact?: { firstName: string; lastName: string; email: string }
  status: string
  signedAt?: string
  expiresAt?: string
  createdAt: string
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  pending:  { text: '#fbbf24', bg: 'rgba(251,191,36,0.12)' },
  signed:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  expired:  { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  voided:   { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function DocumentsPage() {
  const [templates, setTemplates] = useState<DocumentTemplate[]>([])
  const [signedDocs, setSignedDocs] = useState<SignedDocument[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'templates' | 'signed'>('templates')
  const [showCreate, setShowCreate] = useState(false)
  const [showSend, setShowSend] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', description: '', content: '', fields: '[]' })
  const [sendForm, setSendForm] = useState({ contactId: '' })
  const [preview, setPreview] = useState<DocumentTemplate | null>(null)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [tplRes, signRes] = await Promise.all([
        apiClient.get('/documents') as any,
        apiClient.get('/documents/signed') as any,
      ])
      setTemplates(tplRes?.templates ?? [])
      setSignedDocs(signRes?.documents ?? [])
    } catch {}
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const create = async () => {
    if (!form.name || !form.content) return
    setCreating(true)
    try {
      let fields = []
      try { fields = JSON.parse(form.fields) } catch {}
      await apiClient.post('/documents', { ...form, fields })
      setShowCreate(false)
      setForm({ name: '', description: '', content: '', fields: '[]' })
      toast('Template created', 'success')
      load()
    } catch { toast('Failed to create template', 'error') }
    setCreating(false)
  }

  const send = async () => {
    if (!showSend || !sendForm.contactId) return
    setSending(true)
    try {
      await apiClient.post(`/documents/${showSend}/send`, sendForm)
      toast('Document sent for signature', 'success')
      setShowSend(null)
      setSendForm({ contactId: '' })
      load()
    } catch { toast('Failed to send document', 'error') }
    setSending(false)
  }

  const deleteTemplate = async (id: string) => {
    setDeletingId(id)
    setTemplates(prev => prev.filter(t => t.id !== id))
    try { await apiClient.delete(`/documents/${id}`) } catch {}
    setDeletingId(null)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Document Templates</h1>
          <p className="text-sm text-muted-foreground mt-1">Create and send documents for e-signature</p>
        </div>
        {tab === 'templates' && (
          <button onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}>
            <Plus className="h-4 w-4" />
            New Template
          </button>
        )}
      </div>

      {/* Tabs */}
      <div {...anim(1)} className="kv-anim flex gap-1 rounded-xl p-1" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
        {(['templates', 'signed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-lg text-sm font-medium transition-all"
            style={tab === t
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { color: 'hsl(var(--muted-foreground))' }
            }>
            {t === 'templates' ? 'Templates' : 'Signed Documents'}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div {...anim(2)} className="kv-anim space-y-3">
          {loading ? (
            [0, 1, 2].map(i => <div key={i} className="rounded-xl h-20 animate-pulse" style={{ background: 'hsl(var(--card))' }} />)
          ) : templates.length === 0 ? (
            <div className="rounded-xl p-10 text-center" style={cardStyle}>
              <FileSignature className="h-10 w-10 mx-auto mb-3 text-muted-foreground opacity-30" />
              <p className="text-muted-foreground text-sm">No templates yet</p>
            </div>
          ) : templates.map(t => (
            <div key={t.id} className="rounded-xl p-5 flex items-start justify-between gap-4" style={cardStyle}>
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl" style={{ background: 'rgba(6,182,212,0.1)' }}>
                  <File className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">{t.name}</p>
                  {t.description && <p className="text-sm text-muted-foreground mt-0.5">{t.description}</p>}
                  <p className="text-xs text-muted-foreground mt-1">
                    {t.fields.length} field{t.fields.length !== 1 ? 's' : ''} · Created {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setPreview(t)}
                  className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground rounded-lg px-3 py-1.5 transition-colors"
                  style={{ border: '1px solid hsl(var(--border))' }}>
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button onClick={() => setShowSend(t.id)}
                  className="flex items-center gap-1.5 text-sm font-semibold text-white rounded-lg px-3 py-1.5 transition-all hover:scale-[1.02]"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
                <button onClick={() => deleteTemplate(t.id)} disabled={deletingId === t.id}
                  className="p-1.5 text-muted-foreground hover:text-red-400 transition-colors disabled:opacity-40">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'signed' && (
        <div {...anim(2)} className="kv-anim rounded-xl overflow-hidden" style={cardStyle}>
          {loading ? (
            <div className="p-8 text-center text-muted-foreground text-sm">Loading…</div>
          ) : signedDocs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground text-sm">No signed documents</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: '1px solid hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                    {['Document', 'Contact', 'Status', 'Signed', 'Expires'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {signedDocs.map((d, i) => {
                    const m = STATUS_META[d.status] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                    return (
                      <tr key={d.id} style={{ borderBottom: i < signedDocs.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                        <td className="px-4 py-3 font-medium text-foreground">{d.template?.name ?? 'Document'}</td>
                        <td className="px-4 py-3">
                          {d.contact
                            ? <><p className="font-medium text-foreground">{d.contact.firstName} {d.contact.lastName}</p><p className="text-xs text-muted-foreground">{d.contact.email}</p></>
                            : <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold" style={{ color: m.text, background: m.bg }}>
                            {d.status === 'signed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{d.signedAt ? new Date(d.signedAt).toLocaleDateString() : '—'}</td>
                        <td className="px-4 py-3 text-muted-foreground text-xs">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">New Document Template</h2>
              <button onClick={() => setShowCreate(false)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Template Name *</label>
                <input className={inputCls} style={inputStyle} placeholder="Service Agreement" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Description</label>
                <input className={inputCls} style={inputStyle} placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Content (HTML or text) *</label>
                <textarea rows={8} className={inputCls + ' resize-none font-mono'} style={inputStyle} placeholder="<h1>Service Agreement</h1><p>This agreement is between...</p>" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Fields (JSON array)</label>
                <textarea rows={3} className={inputCls + ' resize-none font-mono'} style={inputStyle} placeholder='[{"name":"clientName","label":"Client Name","type":"text","required":true}]' value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} />
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={create} disabled={creating || !form.name || !form.content}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-md rounded-2xl p-6 space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground text-lg">Send for Signature</h2>
              <button onClick={() => setShowSend(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact ID</label>
              <input className={inputCls} style={inputStyle} placeholder="Contact UUID" value={sendForm.contactId} onChange={e => setSendForm({ contactId: e.target.value })} />
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowSend(null)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={send} disabled={sending || !sendForm.contactId}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                {sending ? 'Sending…' : 'Send'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 max-h-[90vh] overflow-y-auto space-y-4" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-foreground">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="p-1.5 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="prose prose-sm dark:prose-invert max-w-none rounded-xl p-4" style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }} dangerouslySetInnerHTML={{ __html: preview.content }} />
          </div>
        </div>
      )}
    </div>
  )
}
