'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { ScrollText, Plus, Trash2, Send, PenLine, Eye } from 'lucide-react'

interface Contract {
  id: string
  title: string
  status: string
  value?: string
  startDate?: string
  endDate?: string
  content: string
  contact?: { id: string; firstName: string; lastName: string; email?: string }
  createdAt: string
}

interface Stats { total: number; byStatus: Record<string, number>; signedValue: number }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  signed: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  cancelled: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState<Contract | null>(null)
  const [form, setForm] = useState({ title: '', content: '', value: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        apiClient.get<{ contracts: Contract[] }>('/contracts'),
        apiClient.get<Stats>('/contracts/stats'),
      ])
      setContracts(cRes.contracts)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  async function save() {
    if (!form.title || !form.content) return
    setSaving(true)
    try {
      await apiClient.post('/contracts', {
        title: form.title,
        content: form.content,
        value: form.value ? parseFloat(form.value) : undefined,
        startDate: form.startDate ? new Date(form.startDate).toISOString() : undefined,
        endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
      })
      setShowCreate(false)
      setForm({ title: '', content: '', value: '', startDate: '', endDate: '' })
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function sendContract(id: string) {
    if (!confirm('Send this contract to the client?')) return
    await apiClient.post(`/contracts/${id}/send`, {})
    load()
  }

  async function markSigned(id: string) {
    if (!confirm('Mark this contract as signed?')) return
    await apiClient.post(`/contracts/${id}/sign`, {})
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this contract?')) return
    await apiClient.delete(`/contracts/${id}`)
    load()
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and manage client contracts</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Contract
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          {Object.entries(stats.byStatus).slice(0, 2).map(([status, count]) => (
            <div key={status} className="bg-card border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1 capitalize">{status}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Signed Value</p>
            <p className="text-2xl font-bold">${stats.signedValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : contracts.length === 0 ? (
          <div className="p-12 text-center">
            <ScrollText className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No contracts yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['Title', 'Client', 'Status', 'Value', 'Start', 'End', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map(c => (
                <tr key={c.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-medium">{c.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[c.status] ?? ''}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">{c.value ? `$${Number(c.value).toLocaleString(undefined, { minimumFractionDigits: 0 })}` : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3 text-muted-foreground">{c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreview(c)} className="p-1.5 rounded hover:bg-muted" title="Preview">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {c.status === 'draft' && (
                        <button onClick={() => sendContract(c.id)} className="p-1.5 rounded hover:bg-muted" title="Send">
                          <Send className="h-3.5 w-3.5 text-blue-400" />
                        </button>
                      )}
                      {c.status === 'sent' && (
                        <button onClick={() => markSigned(c.id)} className="p-1.5 rounded hover:bg-muted" title="Mark Signed">
                          <PenLine className="h-3.5 w-3.5 text-green-400" />
                        </button>
                      )}
                      {c.status === 'draft' && (
                        <button onClick={() => remove(c.id)} className="p-1.5 rounded hover:bg-muted">
                          <Trash2 className="h-3.5 w-3.5 text-red-400" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold">New Contract</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Service Agreement, NDA, etc."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Contract Content *</label>
              <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })}
                rows={8} placeholder="Paste or type contract content here…"
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary resize-none font-mono" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Value ($)</label>
                <input value={form.value} onChange={e => setForm({ ...form, value: e.target.value })}
                  type="number" min="0" step="0.01" placeholder="0.00"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Start Date</label>
                <input value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">End Date</label>
                <input value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.title || !form.content}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">{preview.title}</h2>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[preview.status] ?? ''}`}>{preview.status}</span>
            </div>
            {preview.contact && <p className="text-sm text-muted-foreground">Parties: {preview.contact.firstName} {preview.contact.lastName}</p>}
            {(preview.startDate || preview.endDate) && (
              <p className="text-sm text-muted-foreground">
                {preview.startDate && `From: ${new Date(preview.startDate).toLocaleDateString()}`}
                {preview.startDate && preview.endDate && ' → '}
                {preview.endDate && `To: ${new Date(preview.endDate).toLocaleDateString()}`}
              </p>
            )}
            <div className="bg-muted/30 rounded-lg p-4 text-sm font-mono whitespace-pre-wrap max-h-60 overflow-y-auto">
              {preview.content}
            </div>
            <button onClick={() => setPreview(null)} className="w-full border rounded-lg py-2 text-sm hover:bg-muted">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
