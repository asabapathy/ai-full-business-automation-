'use client'

import { useState, useEffect } from 'react'
import { ClipboardList, Plus, Send, Trash2, FileSignature, X } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'


interface LineItem {
  description: string
  quantity: number
  unitPrice: number
}

interface Proposal {
  id: string
  title: string
  status: 'DRAFT' | 'SENT' | 'SIGNED' | 'DECLINED'
  totalAmount: number
  createdAt: string
  signedAt?: string
  contact?: { id: string; firstName: string; lastName: string; email: string }
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const STATUS_META: Record<string, { text: string; bg: string }> = {
  DRAFT:    { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  SENT:     { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  SIGNED:   { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  DECLINED: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const DEMO_PROPOSALS: Proposal[] = [
  { id: '1', title: 'Website Redesign & SEO Package', status: 'SENT', totalAmount: 4800, createdAt: new Date(Date.now() - 86400000 * 5).toISOString(), contact: { id: '1', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@example.com' } },
  { id: '2', title: 'Monthly Maintenance Agreement', status: 'SIGNED', totalAmount: 1200, createdAt: new Date(Date.now() - 86400000 * 12).toISOString(), signedAt: new Date(Date.now() - 86400000 * 10).toISOString(), contact: { id: '2', firstName: 'Mark', lastName: 'Johnson', email: 'mark@example.com' } },
  { id: '3', title: 'HVAC System Inspection Bundle', status: 'DRAFT', totalAmount: 2500, createdAt: new Date(Date.now() - 86400000).toISOString(), contact: { id: '3', firstName: 'Peak', lastName: 'HVAC Services', email: 'info@peakhvac.com' } },
]

const emptyItem = (): LineItem => ({ description: '', quantity: 1, unitPrice: 0 })

export default function ProposalsPage() {
  const [proposals, setProposals] = useState<Proposal[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({ contactId: '', title: '', context: '', items: [emptyItem()] })

  const load = async () => {
    setLoading(true)
    try {
      const data = await apiClient.get('/proposals') as any
      setProposals(data?.proposals ?? data ?? [])
    } catch {
      setProposals(DEMO_PROPOSALS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const lineTotal = form.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)

  const handleCreate = async () => {
    if (!form.contactId || !form.title) return
    setCreating(true)
    try {
      await apiClient.post('/proposals', {
        contactId: form.contactId,
        title: form.title,
        context: form.context,
        items: form.items.filter(i => i.description),
      })
      resetForm()
      toast('Proposal created', 'success')
      void load()
    } catch {
      toast('Failed to create proposal', 'error')
    } finally {
      setCreating(false)
    }
  }

  const handleSend = async (id: string) => {
    setSending(id)
    try {
      await apiClient.post(`/proposals/${id}/send`, {})
      toast('Proposal sent to client', 'success')
      void load()
    } catch {
      toast('Failed to send proposal', 'error')
    } finally {
      setSending(null)
    }
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)
    try {
      await apiClient.delete(`/proposals/${id}`)
      setProposals(prev => prev.filter(p => p.id !== id))
      toast('Proposal deleted', 'success')
    } catch {
      toast('Failed to delete proposal', 'error')
    } finally {
      setDeleting(null)
    }
  }

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setForm(p => {
      const items = [...p.items]
      items[i] = { ...items[i]!, [field]: value }
      return { ...p, items }
    })
  }

  const addItem = () => setForm(p => ({ ...p, items: [...p.items, emptyItem()] }))
  const removeItem = (i: number) => setForm(p => ({ ...p, items: p.items.filter((_, idx) => idx !== i) }))

  const resetForm = () => {
    setForm({ contactId: '', title: '', context: '', items: [emptyItem()] })
    setShowCreate(false)
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Proposals</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and send AI-powered proposals to clients</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Proposal
        </button>
      </div>

      {/* Table */}
      <div {...anim(1)} className="rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}</div>
        ) : proposals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ClipboardList className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No proposals yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first AI-powered proposal.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Title</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Client</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Amount</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Status</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">Created</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {proposals.map(p => {
                  const meta = STATUS_META[p.status] ?? STATUS_META.DRAFT!
                  return (
                    <tr key={p.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          {p.status === 'SIGNED' && <FileSignature className="h-3.5 w-3.5 shrink-0" style={{ color: '#34d399' }} />}
                          <span className="font-medium text-foreground">{p.title}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground">
                        {p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : '—'}
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground tabular">{fmt(p.totalAmount ?? 0)}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{new Date(p.createdAt).toLocaleDateString()}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          {p.status === 'DRAFT' && (
                            <button
                              onClick={() => handleSend(p.id)}
                              disabled={sending === p.id}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-colors disabled:opacity-50"
                              style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
                            >
                              <Send className="h-3 w-3" />
                              {sending === p.id ? 'Sending…' : 'Send'}
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id)}
                            disabled={deleting === p.id}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Proposal</h2>
              <button onClick={resetForm} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contact ID *</label>
                <input value={form.contactId} onChange={e => setForm(p => ({ ...p, contactId: e.target.value }))} className={inputCls} style={inputStyle} placeholder="Contact UUID" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Title *</label>
                <input value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. Website Redesign Package" />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Context for AI</label>
                <textarea
                  rows={2}
                  value={form.context}
                  onChange={e => setForm(p => ({ ...p, context: e.target.value }))}
                  className={inputCls + ' resize-none'}
                  style={inputStyle}
                  placeholder="Describe the work for AI to generate proposal language…"
                />
              </div>
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</label>
                <button onClick={addItem} className="text-xs text-primary hover:underline font-medium">+ Add line</button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_56px_80px_24px] gap-2">
                  <span className="text-xs text-muted-foreground px-1">Description</span>
                  <span className="text-xs text-muted-foreground text-center">Qty</span>
                  <span className="text-xs text-muted-foreground">Price</span>
                  <span />
                </div>
                {form.items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[1fr_56px_80px_24px] gap-2 items-center">
                    <input
                      value={item.description}
                      onChange={e => updateItem(i, 'description', e.target.value)}
                      className={inputCls}
                      style={inputStyle}
                      placeholder="Description"
                    />
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={e => updateItem(i, 'quantity', Number(e.target.value))}
                      className={inputCls + ' text-center'}
                      style={inputStyle}
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unitPrice || ''}
                      onChange={e => updateItem(i, 'unitPrice', Number(e.target.value))}
                      className={inputCls}
                      style={inputStyle}
                      placeholder="0.00"
                    />
                    <button
                      onClick={() => removeItem(i)}
                      disabled={form.items.length === 1}
                      className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex justify-end mt-3 pt-3 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <span className="text-sm text-muted-foreground mr-3">Total</span>
                <span className="text-sm font-bold text-foreground tabular">{fmt(lineTotal)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={resetForm} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={handleCreate}
                disabled={creating || !form.contactId || !form.title}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {creating ? 'Creating…' : 'Create Proposal'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
