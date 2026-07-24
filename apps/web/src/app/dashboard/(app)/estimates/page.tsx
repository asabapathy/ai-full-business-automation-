'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { FileCheck, Plus, Trash2, Send, CheckCircle, XCircle, Eye } from 'lucide-react'

interface LineItem { description: string; quantity: number; unitPrice: number; total: number }

interface Estimate {
  id: string
  estimateNumber: string
  title: string
  status: string
  subtotal: string
  tax: string
  total: string
  validUntil?: string
  contact?: { id: string; firstName: string; lastName: string; email?: string }
  lineItems: LineItem[]
  createdAt: string
}

interface Stats { total: number; byStatus: Record<string, number>; totalValue: number; acceptedValue: number }

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
  sent: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  accepted: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  rejected: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  expired: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
}

const emptyLine = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0, total: 0 })

export default function EstimatesPage() {
  const [estimates, setEstimates] = useState<Estimate[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState<Estimate | null>(null)
  const [form, setForm] = useState({ title: '', taxRate: '0', validUntil: '', notes: '' })
  const [lineItems, setLineItems] = useState<LineItem[]>([emptyLine()])
  const [saving, setSaving] = useState(false)

  useEffect(() => { load() }, [])

  async function load() {
    setLoading(true)
    try {
      const [eRes, sRes] = await Promise.all([
        apiClient.get<{ estimates: Estimate[] }>('/estimates'),
        apiClient.get<Stats>('/estimates/stats'),
      ])
      setEstimates(eRes.estimates)
      setStats(sRes)
    } finally { setLoading(false) }
  }

  function updateLine(idx: number, field: keyof LineItem, value: string | number) {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li
      const updated = { ...li, [field]: field === 'description' ? value : Number(value) }
      updated.total = updated.quantity * updated.unitPrice
      return updated
    }))
  }

  async function save() {
    if (!form.title || lineItems.some(l => !l.description)) return
    setSaving(true)
    try {
      await apiClient.post('/estimates', {
        title: form.title,
        lineItems,
        taxRate: parseFloat(form.taxRate) || 0,
        validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : undefined,
        notes: form.notes || undefined,
      })
      setShowCreate(false)
      setForm({ title: '', taxRate: '0', validUntil: '', notes: '' })
      setLineItems([emptyLine()])
      load()
    } catch (e: any) { alert(e.message) } finally { setSaving(false) }
  }

  async function sendEstimate(id: string) {
    if (!confirm('Send this estimate to the client?')) return
    await apiClient.post(`/estimates/${id}/send`, {})
    load()
  }

  async function accept(id: string) {
    await apiClient.post(`/estimates/${id}/accept`, {})
    load()
  }

  async function reject(id: string) {
    await apiClient.post(`/estimates/${id}/reject`, {})
    load()
  }

  async function remove(id: string) {
    if (!confirm('Delete this estimate?')) return
    await apiClient.delete(`/estimates/${id}`)
    load()
  }

  const subtotal = lineItems.reduce((s, l) => s + l.total, 0)
  const tax = subtotal * (parseFloat(form.taxRate) || 0) / 100
  const total = subtotal + tax

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Estimates</h1>
          <p className="text-muted-foreground text-sm mt-1">Create and send project estimates</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:opacity-90">
          <Plus className="h-4 w-4" /> New Estimate
        </button>
      </div>

      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Total</p>
            <p className="text-2xl font-bold">{stats.total}</p>
          </div>
          {Object.entries(stats.byStatus).map(([status, count]) => (
            <div key={status} className="bg-card border rounded-xl p-4">
              <p className="text-sm text-muted-foreground mb-1 capitalize">{status}</p>
              <p className="text-2xl font-bold">{count}</p>
            </div>
          ))}
          <div className="bg-card border rounded-xl p-4">
            <p className="text-sm text-muted-foreground mb-1">Accepted Value</p>
            <p className="text-2xl font-bold">${stats.acceptedValue.toLocaleString(undefined, { minimumFractionDigits: 0 })}</p>
          </div>
        </div>
      )}

      <div className="bg-card border rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading…</div>
        ) : estimates.length === 0 ? (
          <div className="p-12 text-center">
            <FileCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground">No estimates yet</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/30">
              <tr>
                {['#', 'Title', 'Client', 'Status', 'Total', 'Valid Until', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left font-medium text-muted-foreground">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {estimates.map(e => (
                <tr key={e.id} className="border-b last:border-0 hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{e.estimateNumber}</td>
                  <td className="px-4 py-3 font-medium">{e.title}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.contact ? `${e.contact.firstName} ${e.contact.lastName}` : '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[e.status] ?? ''}`}>{e.status}</span>
                  </td>
                  <td className="px-4 py-3 font-semibold">${Number(e.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                  <td className="px-4 py-3 text-muted-foreground">{e.validUntil ? new Date(e.validUntil).toLocaleDateString() : '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPreview(e)} className="p-1.5 rounded hover:bg-muted" title="Preview">
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                      </button>
                      {e.status === 'draft' && (
                        <button onClick={() => sendEstimate(e.id)} className="p-1.5 rounded hover:bg-muted" title="Send">
                          <Send className="h-3.5 w-3.5 text-blue-400" />
                        </button>
                      )}
                      {e.status === 'sent' && (
                        <>
                          <button onClick={() => accept(e.id)} className="p-1.5 rounded hover:bg-muted" title="Mark Accepted">
                            <CheckCircle className="h-3.5 w-3.5 text-green-400" />
                          </button>
                          <button onClick={() => reject(e.id)} className="p-1.5 rounded hover:bg-muted" title="Mark Rejected">
                            <XCircle className="h-3.5 w-3.5 text-red-400" />
                          </button>
                        </>
                      )}
                      {e.status === 'draft' && (
                        <button onClick={() => remove(e.id)} className="p-1.5 rounded hover:bg-muted">
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
            <h2 className="text-lg font-bold">New Estimate</h2>
            <div>
              <label className="text-sm font-medium block mb-1">Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="Website redesign, etc."
                className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-2">Line Items</label>
              <div className="space-y-2">
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-12 gap-2 items-center">
                    <input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)}
                      placeholder="Description" className="col-span-5 border rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input value={li.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)}
                      type="number" min="1" placeholder="Qty" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                    <input value={li.unitPrice} onChange={e => updateLine(i, 'unitPrice', e.target.value)}
                      type="number" min="0" step="0.01" placeholder="Unit $" className="col-span-2 border rounded-lg px-2 py-1.5 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
                    <span className="col-span-2 text-sm font-medium text-right">${li.total.toFixed(2)}</span>
                    <button onClick={() => setLineItems(prev => prev.filter((_, j) => j !== i))}
                      disabled={lineItems.length === 1} className="col-span-1 text-red-400 hover:text-red-500 disabled:opacity-30 text-center">×</button>
                  </div>
                ))}
                <button onClick={() => setLineItems(prev => [...prev, emptyLine()])}
                  className="text-xs text-primary hover:underline">+ Add line</button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium block mb-1">Tax Rate (%)</label>
                <input value={form.taxRate} onChange={e => setForm({ ...form, taxRate: e.target.value })}
                  type="number" min="0" max="100" step="0.1"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="text-sm font-medium block mb-1">Valid Until</label>
                <input value={form.validUntil} onChange={e => setForm({ ...form, validUntil: e.target.value })}
                  type="date"
                  className="w-full border rounded-lg px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div className="bg-muted/40 rounded-lg p-3 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax ({form.taxRate}%)</span><span>${tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold border-t pt-1 mt-1"><span>Total</span><span>${total.toFixed(2)}</span></div>
            </div>
            <div className="flex gap-3 pt-2">
              <button onClick={() => setShowCreate(false)} className="flex-1 border rounded-lg py-2 text-sm hover:bg-muted">Cancel</button>
              <button onClick={save} disabled={saving || !form.title}
                className="flex-1 bg-primary text-primary-foreground rounded-lg py-2 text-sm font-medium disabled:opacity-50">
                {saving ? 'Saving…' : 'Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {preview && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card border rounded-2xl p-6 w-full max-w-lg space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold">{preview.estimateNumber}</h2>
                <p className="text-sm text-muted-foreground">{preview.title}</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[preview.status] ?? ''}`}>{preview.status}</span>
            </div>
            {preview.contact && <p className="text-sm">To: {preview.contact.firstName} {preview.contact.lastName} {preview.contact.email && `(${preview.contact.email})`}</p>}
            <table className="w-full text-sm">
              <thead className="border-b">
                <tr className="text-muted-foreground">
                  <th className="py-2 text-left">Description</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Unit</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {preview.lineItems.map((li, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="py-2">{li.description}</td>
                    <td className="py-2 text-right">{li.quantity}</td>
                    <td className="py-2 text-right">${Number(li.unitPrice).toFixed(2)}</td>
                    <td className="py-2 text-right font-medium">${Number(li.total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="text-sm space-y-1 text-right">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>${Number(preview.subtotal).toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Tax</span><span>${Number(preview.tax).toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>${Number(preview.total).toFixed(2)}</span></div>
            </div>
            <button onClick={() => setPreview(null)} className="w-full border rounded-lg py-2 text-sm hover:bg-muted">Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
