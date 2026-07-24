'use client'

import { useState, useEffect } from 'react'
import { FileSignature, Plus, Send, Eye, Trash2, CheckCircle, Clock, File } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'

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
    try {
      let fields = []
      try { fields = JSON.parse(form.fields) } catch {}
      await apiClient.post('/documents', { ...form, fields })
      setShowCreate(false)
      setForm({ name: '', description: '', content: '', fields: '[]' })
      load()
    } catch {}
  }

  const send = async () => {
    if (!showSend || !sendForm.contactId) return
    try {
      await apiClient.post(`/documents/${showSend}/send`, sendForm)
      alert('Document sent for signature!')
      setShowSend(null)
      setSendForm({ contactId: '' })
      load()
    } catch {}
  }

  const deleteTemplate = async (id: string) => {
    if (!confirm('Delete this template?')) return
    try {
      await apiClient.delete(`/documents/${id}`)
      load()
    } catch {}
  }

  const statusColor: Record<string, string> = {
    pending: 'bg-yellow-100 text-yellow-700',
    signed: 'bg-green-100 text-green-700',
    expired: 'bg-red-100 text-red-600',
    voided: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Document Templates</h1>
          <p className="text-sm text-gray-500 mt-1">Create and send documents for e-signature</p>
        </div>
        {tab === 'templates' && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
            <Plus className="h-4 w-4" />
            New Template
          </button>
        )}
      </div>

      <div className="flex gap-2 border-b">
        {(['templates', 'signed'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {t === 'templates' ? 'Templates' : 'Signed Documents'}
          </button>
        ))}
      </div>

      {tab === 'templates' && (
        <div className="grid gap-4">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : templates.length === 0 ? (
            <div className="rounded-xl border bg-white p-8 text-center text-gray-400">No templates yet</div>
          ) : templates.map(t => (
            <div key={t.id} className="rounded-xl border bg-white p-5 shadow-sm flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
                  <File className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">{t.name}</p>
                  {t.description && <p className="text-sm text-gray-500 mt-0.5">{t.description}</p>}
                  <p className="text-xs text-gray-400 mt-1">
                    {t.fields.length} field{t.fields.length !== 1 ? 's' : ''} · Created {new Date(t.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button onClick={() => setPreview(t)} className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-gray-900 border rounded-lg px-3 py-1.5">
                  <Eye className="h-3.5 w-3.5" />
                  Preview
                </button>
                <button onClick={() => setShowSend(t.id)} className="flex items-center gap-1.5 text-sm bg-blue-600 text-white rounded-lg px-3 py-1.5 hover:bg-blue-700">
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
                <button onClick={() => deleteTemplate(t.id)} className="text-gray-400 hover:text-red-500 p-1.5">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'signed' && (
        <div className="rounded-xl border bg-white shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : signedDocs.length === 0 ? (
            <div className="p-8 text-center text-gray-400">No signed documents</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Document</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Contact</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Signed</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Expires</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {signedDocs.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{d.template?.name ?? 'Document'}</td>
                    <td className="px-4 py-3">
                      {d.contact ? <><p className="font-medium text-gray-900">{d.contact.firstName} {d.contact.lastName}</p><p className="text-xs text-gray-500">{d.contact.email}</p></> : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${statusColor[d.status] ?? 'bg-gray-100 text-gray-600'}`}>
                        {d.status === 'signed' ? <CheckCircle className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                        {d.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.signedAt ? new Date(d.signedAt).toLocaleDateString() : '—'}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{d.expiresAt ? new Date(d.expiresAt).toLocaleDateString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Create Template Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="font-semibold text-gray-900">New Document Template</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Template Name</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Service Agreement" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Brief description" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Content (HTML or text)</label>
              <textarea rows={8} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono resize-none" placeholder="<h1>Service Agreement</h1><p>This agreement is between...</p>" value={form.content} onChange={e => setForm(f => ({ ...f, content: e.target.value }))} />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Fields (JSON array)</label>
              <textarea rows={3} className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono resize-none" placeholder='[{"name":"clientName","label":"Client Name","type":"text","required":true}]' value={form.fields} onChange={e => setForm(f => ({ ...f, fields: e.target.value }))} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowCreate(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={create} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create Template</button>
            </div>
          </div>
        </div>
      )}

      {/* Send Modal */}
      {showSend && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md space-y-4">
            <h2 className="font-semibold text-gray-900">Send for Signature</h2>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Contact ID</label>
              <input className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm" placeholder="Contact UUID" value={sendForm.contactId} onChange={e => setSendForm({ contactId: e.target.value })} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setShowSend(null)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
              <button onClick={send} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">Send</button>
            </div>
          </div>
        </div>
      )}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-gray-900">{preview.name}</h2>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>
            <div className="prose prose-sm max-w-none rounded-lg border p-4" dangerouslySetInnerHTML={{ __html: preview.content }} />
          </div>
        </div>
      )}
    </div>
  )
}
