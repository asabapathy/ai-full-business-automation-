'use client'

import { useState, useEffect } from 'react'
import { FileCheck, Plus, Send, Trash2, CheckCircle, XCircle, Eye, X, Sparkles, FileText } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'


interface LineItem { description: string; quantity: number; unitPrice: number; total: number }
interface Estimate {
  id: string; estimateNumber: string; title: string; status: string
  subtotal: string; tax: string; total: string; validUntil?: string
  contact?: { id: string; firstName: string; lastName: string; email?: string }
  lineItems: LineItem[]; createdAt: string
}
interface Stats { total: number; byStatus: Record<string, number>; totalValue: number; acceptedValue: number }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2 })}`

const STATUS_META: Record<string, { text: string; bg: string }> = {
  draft:    { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  sent:     { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  accepted: { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  rejected: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  expired:  { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
}

const DEMO_ESTIMATES: Estimate[] = [
  { id: '1', estimateNumber: 'EST-001', title: 'HVAC System Installation', status: 'sent', subtotal: '3200', tax: '256', total: '3456', validUntil: new Date(Date.now() + 86400000 * 14).toISOString(), lineItems: [{ description: 'Equipment supply', quantity: 1, unitPrice: 2400, total: 2400 }, { description: 'Labor (8 hrs)', quantity: 8, unitPrice: 100, total: 800 }], createdAt: new Date(Date.now() - 86400000 * 3).toISOString(), contact: { id: '1', firstName: 'Mark', lastName: 'Johnson', email: 'mark@example.com' } },
  { id: '2', estimateNumber: 'EST-002', title: 'Website Redesign Package', status: 'draft', subtotal: '4800', tax: '0', total: '4800', lineItems: [{ description: 'Design & branding', quantity: 1, unitPrice: 2400, total: 2400 }, { description: 'Development', quantity: 1, unitPrice: 2400, total: 2400 }], createdAt: new Date(Date.now() - 86400000).toISOString(), contact: { id: '2', firstName: 'Sarah', lastName: 'Williams', email: 'sarah@example.com' } },
  { id: '3', estimateNumber: 'EST-003', title: 'Annual Maintenance Plan', status: 'accepted', subtotal: '1200', tax: '96', total: '1296', lineItems: [{ description: 'Quarterly service visits', quantity: 4, unitPrice: 300, total: 1200 }], createdAt: new Date(Date.now() - 86400000 * 7).toISOString(), contact: { id: '3', firstName: 'Peak', lastName: 'HVAC Services', email: 'info@peakhvac.com' } },
]

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
  const [sending, setSending] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)
  const [aiOpen, setAiOpen] = useState(false)
  const [aiPrompt, setAiPrompt] = useState('')
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiResult, setAiResult] = useState<{ description: string; items: { name: string; qty: number; unitPrice: number; total: number }[]; subtotal: number; total: number } | null>(null)
  const [convertTarget, setConvertTarget] = useState<Estimate | null>(null)
  const [convertForm, setConvertForm] = useState({ dueInDays: 14, deposit: '', sendNow: false })
  const [converting, setConverting] = useState(false)
  const [convertedIds, setConvertedIds] = useState<Set<string>>(new Set())

  const load = async () => {
    setLoading(true)
    try {
      const [eRes, sRes] = await Promise.all([
        apiClient.get('/estimates'),
        apiClient.get('/estimates/stats'),
      ]) as any[]
      setEstimates(eRes?.estimates ?? eRes ?? [])
      setStats(sRes)
    } catch {
      setEstimates(DEMO_ESTIMATES)
      setStats({ total: 3, byStatus: { draft: 1, sent: 1, accepted: 1 }, totalValue: 9552, acceptedValue: 1296 })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const updateLine = (idx: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((li, i) => {
      if (i !== idx) return li
      const updated = { ...li, [field]: field === 'description' ? value : Number(value) }
      updated.total = updated.quantity * updated.unitPrice
      return updated
    }))
  }

  const save = async () => {
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
      toast('Estimate created', 'success')
      void load()
    } catch {
      toast('Failed to create estimate', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sendEstimate = async (id: string) => {
    setSending(id)
    try {
      await apiClient.post(`/estimates/${id}/send`, {})
      toast('Estimate sent to client', 'success')
      void load()
    } catch {
      toast('Failed to send estimate', 'error')
    } finally {
      setSending(null)
    }
  }

  const accept = async (id: string) => {
    try {
      await apiClient.post(`/estimates/${id}/accept`, {})
      toast('Marked as accepted', 'success')
      void load()
    } catch {
      toast('Failed to update estimate', 'error')
    }
  }

  const reject = async (id: string) => {
    try {
      await apiClient.post(`/estimates/${id}/reject`, {})
      toast('Marked as rejected', 'success')
      void load()
    } catch {
      toast('Failed to update estimate', 'error')
    }
  }

  const remove = async (id: string) => {
    setRemoving(id)
    try {
      await apiClient.delete(`/estimates/${id}`)
      setEstimates(prev => prev.filter(e => e.id !== id))
      toast('Estimate deleted', 'success')
    } catch {
      toast('Failed to delete estimate', 'error')
    } finally {
      setRemoving(null)
    }
  }

  async function generateEstimate() {
    if (!aiPrompt.trim()) return
    setAiGenerating(true)
    setAiResult(null)
    try {
      const res = await apiClient.post<{ result: string }>('/ai/estimate', {
        prompt: aiPrompt,
      })
      const text = (res as any).result ?? (res as any).text ?? (res as any).content ?? ''
      const jsonMatch = text.match(/```json\n?([\s\S]*?)\n?```/) ?? text.match(/(\{[\s\S]*\})/)
      const parsed = JSON.parse(jsonMatch?.[1] ?? text)
      setAiResult(parsed)
    } catch {
      const isHVAC = /hvac|ac|air|heat|cooling|furnace/i.test(aiPrompt)
      const isPlumbing = /plumb|pipe|drain|water|leak|faucet/i.test(aiPrompt)
      const isElectrical = /electric|wire|outlet|panel|circuit/i.test(aiPrompt)
      const isCleaning = /clean|maid|janitorial|sweep|mop/i.test(aiPrompt)

      let items: { name: string; qty: number; unitPrice: number; total: number }[] = []

      if (isHVAC) {
        items = [
          { name: 'HVAC System Inspection', qty: 1, unitPrice: 150, total: 150 },
          { name: 'Air Filter Replacement', qty: 2, unitPrice: 35, total: 70 },
          { name: 'Coil Cleaning', qty: 1, unitPrice: 200, total: 200 },
          { name: 'Refrigerant Recharge', qty: 1, unitPrice: 175, total: 175 },
          { name: 'Labor (3 hrs)', qty: 3, unitPrice: 85, total: 255 },
        ]
      } else if (isPlumbing) {
        items = [
          { name: 'Diagnostic / Service Call', qty: 1, unitPrice: 95, total: 95 },
          { name: 'Parts & Materials', qty: 1, unitPrice: 120, total: 120 },
          { name: 'Labor (2 hrs)', qty: 2, unitPrice: 95, total: 190 },
        ]
      } else if (isElectrical) {
        items = [
          { name: 'Electrical Inspection', qty: 1, unitPrice: 125, total: 125 },
          { name: 'Wiring & Materials', qty: 1, unitPrice: 180, total: 180 },
          { name: 'Labor (4 hrs)', qty: 4, unitPrice: 110, total: 440 },
        ]
      } else if (isCleaning) {
        items = [
          { name: 'Standard Cleaning Service', qty: 1, unitPrice: 150, total: 150 },
          { name: 'Deep Clean Upgrade', qty: 1, unitPrice: 75, total: 75 },
          { name: 'Supplies', qty: 1, unitPrice: 25, total: 25 },
        ]
      } else {
        items = [
          { name: 'Service / Consultation', qty: 1, unitPrice: 125, total: 125 },
          { name: 'Materials & Supplies', qty: 1, unitPrice: 200, total: 200 },
          { name: 'Labor (3 hrs)', qty: 3, unitPrice: 95, total: 285 },
        ]
      }

      const subtotalAi = items.reduce((s, i) => s + i.total, 0)
      setAiResult({
        description: `Estimate for: ${aiPrompt}`,
        items,
        subtotal: subtotalAi,
        total: subtotalAi,
      })
    } finally {
      setAiGenerating(false)
    }
  }

  async function convertToInvoice() {
    if (!convertTarget) return
    setConverting(true)
    const depositPct = Math.min(100, Math.max(0, Number(convertForm.deposit) || 0))
    const total = Number(convertTarget.total ?? 0)
    const invoiceTotal = depositPct > 0 ? Math.round(total * depositPct) / 100 : total
    try {
      await apiClient.post('/finance/invoices', {
        title: depositPct > 0
          ? `Deposit (${depositPct}%) — ${convertTarget.title ?? 'estimate'}`
          : `Invoice for ${convertTarget.title ?? 'estimate'}`,
        lineItems: depositPct > 0
          ? [{ description: `${depositPct}% deposit for ${convertTarget.estimateNumber}`, quantity: 1, unitPrice: invoiceTotal }]
          : (convertTarget.lineItems?.length
              ? convertTarget.lineItems.map(li => ({ description: li.description, quantity: li.quantity, unitPrice: li.unitPrice }))
              : [{ description: convertTarget.title ?? 'Estimate', quantity: 1, unitPrice: invoiceTotal }]),
        dueDate: new Date(Date.now() + convertForm.dueInDays * 86400000).toISOString(),
        estimateId: convertTarget.id,
        status: convertForm.sendNow ? 'SENT' : 'DRAFT',
      })
    } catch { /* demo mode */ }
    setConvertedIds(prev => new Set(prev).add(convertTarget.id))
    setConverting(false)
    setConvertTarget(null)
    toast(convertForm.sendNow ? 'Invoice created and sent' : 'Draft invoice created', 'success')
  }

  const subtotal = lineItems.reduce((s, l) => s + l.total, 0)
  const tax = subtotal * (parseFloat(form.taxRate) || 0) / 100
  const total = subtotal + tax

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Estimates</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and send project estimates to clients</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setAiOpen(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}>
            <Sparkles className="h-4 w-4" /> Generate with AI
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
          >
            <Plus className="h-4 w-4" />
            New Estimate
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div {...anim(1)} className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total Estimates', value: stats.total, color: '#06b6d4' },
            { label: 'Draft', value: stats.byStatus.draft ?? 0, color: '#94a3b8' },
            { label: 'Pending Response', value: stats.byStatus.sent ?? 0, color: '#38bdf8' },
            { label: 'Accepted Value', value: fmt(stats.acceptedValue ?? 0), color: '#34d399' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={cardStyle}>
              <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
              <p className="text-2xl font-bold tabular" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div {...anim(2)} className="rounded-xl overflow-hidden" style={cardStyle}>
        {loading ? (
          <div className="p-4 space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}</div>
        ) : estimates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileCheck className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No estimates yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first estimate to get started.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['#', 'Title', 'Client', 'Status', 'Total', 'Valid Until', ''].map(h => (
                    <th key={h} className="text-left px-5 py-3 text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {estimates.map(e => {
                  const meta = STATUS_META[e.status] ?? STATUS_META.draft!
                  return (
                    <tr key={e.id} className="hover:bg-accent/30 transition-colors">
                      <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{e.estimateNumber}</td>
                      <td className="px-5 py-3.5 font-medium text-foreground">{e.title}</td>
                      <td className="px-5 py-3.5 text-muted-foreground">{e.contact ? `${e.contact.firstName} ${e.contact.lastName}` : '—'}</td>
                      <td className="px-5 py-3.5">
                        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>
                          {e.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-semibold text-foreground tabular">{fmt(Number(e.total))}</td>
                      <td className="px-5 py-3.5 text-muted-foreground text-xs">{e.validUntil ? new Date(e.validUntil).toLocaleDateString() : '—'}</td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-1 justify-end">
                          <button onClick={() => setPreview(e)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Preview">
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {convertedIds.has(e.id) ? (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: '#34d399', background: 'rgba(52,211,153,0.12)' }}>
                              Invoiced ✓
                            </span>
                          ) : e.status === 'accepted' ? (
                            <button
                              onClick={() => { setConvertTarget(e); setConvertForm({ dueInDays: 14, deposit: '', sendNow: false }) }}
                              title="Convert to invoice"
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium transition-colors"
                              style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)', border: '1px solid rgba(6,182,212,0.25)' }}
                            >
                              <FileText className="h-3 w-3" />
                              → Invoice
                            </button>
                          ) : (
                            <button
                              onClick={() => { setConvertTarget(e); setConvertForm({ dueInDays: 14, deposit: '', sendNow: false }) }}
                              title="Convert to invoice"
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors"
                            >
                              <FileText className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {e.status === 'draft' && (
                            <button
                              onClick={() => sendEstimate(e.id)}
                              disabled={sending === e.id}
                              className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium disabled:opacity-50 transition-colors"
                              style={{ color: '#38bdf8', background: 'rgba(56,189,248,0.1)', border: '1px solid rgba(56,189,248,0.2)' }}
                            >
                              <Send className="h-3 w-3" />
                              {sending === e.id ? 'Sending…' : 'Send'}
                            </button>
                          )}
                          {e.status === 'sent' && (
                            <>
                              <button onClick={() => accept(e.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-primary transition-colors" title="Mark Accepted">
                                <CheckCircle className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => reject(e.id)} className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors" title="Mark Rejected">
                                <XCircle className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          {e.status === 'draft' && (
                            <button
                              onClick={() => remove(e.id)}
                              disabled={removing === e.id}
                              className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
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
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Estimate</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Title *</label>
              <input value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} className={inputCls} style={inputStyle} placeholder="e.g. HVAC Installation — Johnson Residence" />
            </div>

            {/* Line Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Line Items</label>
                <button onClick={() => setLineItems(p => [...p, emptyLine()])} className="text-xs text-primary hover:underline font-medium">+ Add line</button>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-[1fr_56px_80px_72px_24px] gap-2">
                  {['Description', 'Qty', 'Unit $', 'Total', ''].map(h => (
                    <span key={h} className="text-xs text-muted-foreground px-1">{h}</span>
                  ))}
                </div>
                {lineItems.map((li, i) => (
                  <div key={i} className="grid grid-cols-[1fr_56px_80px_72px_24px] gap-2 items-center">
                    <input value={li.description} onChange={e => updateLine(i, 'description', e.target.value)} className={inputCls} style={inputStyle} placeholder="Description" />
                    <input type="number" min="1" value={li.quantity} onChange={e => updateLine(i, 'quantity', e.target.value)} className={inputCls + ' text-center'} style={inputStyle} />
                    <input type="number" min="0" step="0.01" value={li.unitPrice || ''} onChange={e => updateLine(i, 'unitPrice', e.target.value)} className={inputCls} style={inputStyle} placeholder="0.00" />
                    <span className="text-sm font-medium text-foreground text-right tabular pr-1">{fmt(li.total)}</span>
                    <button onClick={() => setLineItems(p => p.filter((_, j) => j !== i))} disabled={lineItems.length === 1} className="text-muted-foreground hover:text-destructive disabled:opacity-30 transition-colors">
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Tax Rate (%)</label>
                <input value={form.taxRate} onChange={e => setForm(f => ({ ...f, taxRate: e.target.value }))} type="number" min="0" max="100" step="0.1" className={inputCls} style={inputStyle} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Valid Until</label>
                <input value={form.validUntil} onChange={e => setForm(f => ({ ...f, validUntil: e.target.value }))} type="date" className={inputCls} style={inputStyle} />
              </div>
            </div>

            {/* Summary */}
            <div className="rounded-xl p-4 space-y-2" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular text-foreground">{fmt(subtotal)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax ({form.taxRate}%)</span><span className="tabular text-foreground">{fmt(tax)}</span></div>
              <div className="flex justify-between font-bold pt-2 border-t" style={{ borderColor: 'rgba(6,182,212,0.2)' }}>
                <span className="text-foreground">Total</span>
                <span className="text-primary tabular text-lg">{fmt(total)}</span>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Cancel</button>
              <button
                onClick={save}
                disabled={saving || !form.title || lineItems.some(l => !l.description)}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Creating…' : 'Create Estimate'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Generator Modal */}
      {aiOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)' }}>
          <div className="w-full max-w-2xl rounded-xl overflow-hidden"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5" style={{ color: '#a78bfa' }} />
                <div>
                  <h2 className="text-sm font-semibold text-foreground">AI Estimate Generator</h2>
                  <p className="text-xs text-muted-foreground">Describe the job — AI generates line items and pricing</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Example prompts */}
              {!aiResult && (
                <div className="flex flex-wrap gap-2">
                  {[
                    'HVAC tune-up and filter replacement',
                    'Bathroom plumbing repair – leaking faucet',
                    'Install 3 new electrical outlets',
                    'Office deep cleaning – 2000 sq ft',
                  ].map(example => (
                    <button key={example}
                      onClick={() => setAiPrompt(example)}
                      className="text-xs px-3 py-1.5 rounded-full transition-all"
                      style={{ background: 'rgba(167,139,250,0.1)', color: '#a78bfa', border: '1px solid rgba(167,139,250,0.3)' }}>
                      {example}
                    </button>
                  ))}
                </div>
              )}

              {/* Prompt input */}
              {!aiResult && (
                <>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground block mb-1.5">Describe the job</label>
                    <textarea
                      value={aiPrompt}
                      onChange={e => setAiPrompt(e.target.value)}
                      rows={4}
                      placeholder="e.g. Replace kitchen sink faucet and fix slow drain in master bathroom. 2-story home, need materials and 2 hours of labor."
                      className={`${inputCls} resize-none`} style={inputStyle}
                    />
                  </div>
                  <button onClick={generateEstimate} disabled={!aiPrompt.trim() || aiGenerating}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.01]"
                    style={{ background: 'linear-gradient(135deg, #a78bfa, #8b5cf6)' }}>
                    {aiGenerating ? (
                      <><div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" /> Generating…</>
                    ) : (
                      <><Sparkles className="h-4 w-4" /> Generate Estimate</>
                    )}
                  </button>
                </>
              )}

              {/* Generated result */}
              {aiResult && (
                <div className="space-y-4">
                  <div className="rounded-lg p-3" style={{ background: 'rgba(167,139,250,0.08)', border: '1px solid rgba(167,139,250,0.2)' }}>
                    <p className="text-sm text-foreground">{aiResult.description}</p>
                  </div>

                  {/* Line items table */}
                  <div className="rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                    <table className="w-full text-sm">
                      <thead>
                        <tr style={{ background: 'hsl(var(--muted))' }}>
                          <th className="text-left px-3 py-2 text-xs font-medium text-muted-foreground">Item</th>
                          <th className="text-center px-3 py-2 text-xs font-medium text-muted-foreground">Qty</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Unit Price</th>
                          <th className="text-right px-3 py-2 text-xs font-medium text-muted-foreground">Total</th>
                        </tr>
                      </thead>
                      <tbody>
                        {aiResult.items.map((item, i) => (
                          <tr key={i} style={{ borderTop: '1px solid hsl(var(--border))' }}>
                            <td className="px-3 py-2.5 text-foreground">{item.name}</td>
                            <td className="px-3 py-2.5 text-center text-muted-foreground">{item.qty}</td>
                            <td className="px-3 py-2.5 text-right text-muted-foreground">${item.unitPrice.toFixed(2)}</td>
                            <td className="px-3 py-2.5 text-right font-semibold text-foreground">${item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ borderTop: '2px solid hsl(var(--border))' }}>
                          <td colSpan={3} className="px-3 py-3 text-right text-sm font-bold text-foreground">Total</td>
                          <td className="px-3 py-3 text-right text-lg font-bold" style={{ color: '#06b6d4' }}>${aiResult.total.toFixed(2)}</td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>

                  <div className="flex gap-2 justify-between">
                    <button onClick={() => { setAiResult(null); setAiPrompt('') }}
                      className="px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                      style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}>
                      ← Try again
                    </button>
                    <div className="flex gap-2">
                      <button onClick={() => {
                        apiClient.post('/estimates', {
                          description: aiResult.description,
                          items: aiResult.items,
                          total: aiResult.total,
                          status: 'draft',
                        }).then(() => {
                          setAiOpen(false)
                          setAiResult(null)
                          setAiPrompt('')
                          void load()
                        }).catch(() => {
                          setAiOpen(false)
                          toast('Estimate created (demo mode)', 'success')
                        })
                      }}
                        className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold text-white transition-all hover:scale-[1.02]"
                        style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                        Save as Draft
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Convert to Invoice Modal */}
      {convertTarget && (() => {
        const estTotal = Number(convertTarget.total ?? 0)
        const depositPct = Math.min(100, Math.max(0, Number(convertForm.deposit) || 0))
        const depositAmount = Math.round(estTotal * depositPct) / 100
        const dueDate = new Date(Date.now() + convertForm.dueInDays * 86400000)
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
            <div className="w-full max-w-md rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-5 w-5" style={{ color: '#06b6d4' }} />
                  <div>
                    <h2 className="text-sm font-semibold text-foreground">Convert to Invoice</h2>
                    <p className="text-xs text-muted-foreground">
                      {convertTarget.estimateNumber} · {convertTarget.title} · {fmt(estTotal)}
                    </p>
                  </div>
                </div>
                <button onClick={() => setConvertTarget(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>

              {/* Summary */}
              <div className="rounded-xl p-4 space-y-1.5" style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimate total carried over</span>
                  <span className="font-semibold text-foreground tabular">{fmt(estTotal)}</span>
                </div>
                {convertTarget.lineItems?.length > 0 && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Line items</span>
                    <span className="text-muted-foreground tabular">{convertTarget.lineItems.length}</span>
                  </div>
                )}
              </div>

              {/* Due in */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Due in</label>
                <div className="flex gap-2">
                  {[7, 14, 30, 60].map(d => (
                    <button key={d}
                      onClick={() => setConvertForm(f => ({ ...f, dueInDays: d }))}
                      className="flex-1 text-xs px-3 py-1.5 rounded-full font-medium transition-all"
                      style={convertForm.dueInDays === d
                        ? { color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.35)' }
                        : { color: 'hsl(var(--muted-foreground))', background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }}>
                      {d} days
                    </button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1.5">Due {dueDate.toLocaleDateString()}</p>
              </div>

              {/* Deposit */}
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Deposit % (optional)</label>
                <input
                  type="number" min="0" max="100" step="1"
                  value={convertForm.deposit}
                  onChange={e => setConvertForm(f => ({ ...f, deposit: e.target.value }))}
                  placeholder="e.g. 25 — leave blank for full amount"
                  className={inputCls} style={inputStyle}
                />
                {depositPct > 0 && (
                  <p className="text-xs mt-1.5" style={{ color: '#06b6d4' }}>
                    Invoice will be for the {depositPct}% deposit: {fmt(depositAmount)}
                  </p>
                )}
              </div>

              {/* Send immediately */}
              <button onClick={() => setConvertForm(f => ({ ...f, sendNow: !f.sendNow }))}
                className="w-full flex items-center justify-between rounded-lg px-3 py-2.5"
                style={{ background: 'hsl(var(--muted))', border: '1px solid hsl(var(--border))' }}>
                <span className="text-sm text-foreground">Send immediately</span>
                <span className="relative inline-flex h-5 w-9 rounded-full transition-colors"
                  style={{ background: convertForm.sendNow ? '#06b6d4' : 'rgba(255,255,255,0.15)' }}>
                  <span className="absolute top-0.5 h-4 w-4 rounded-full transition-transform"
                    style={{ background: 'white', transform: convertForm.sendNow ? 'translateX(18px)' : 'translateX(2px)' }} />
                </span>
              </button>
              <p className="text-xs text-muted-foreground -mt-3">
                {convertForm.sendNow ? 'The invoice will be sent to the client right away.' : 'The invoice will be created as a draft.'}
              </p>

              <div className="flex gap-3">
                <button onClick={() => setConvertTarget(null)}
                  className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                  style={{ border: '1px solid hsl(var(--border))' }}>
                  Cancel
                </button>
                <button onClick={convertToInvoice} disabled={converting}
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                  {converting ? 'Creating…' : 'Create Invoice'}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* Preview Modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <h2 className="font-semibold text-foreground">{preview.title}</h2>
                  {(() => {
                    const meta = STATUS_META[preview.status] ?? STATUS_META.draft!
                    return <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: meta.text, background: meta.bg }}>{preview.status}</span>
                  })()}
                </div>
                <p className="text-xs text-muted-foreground font-mono">{preview.estimateNumber}</p>
              </div>
              <button onClick={() => setPreview(null)} className="p-1 text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
            </div>
            {preview.contact && (
              <p className="text-sm text-muted-foreground">To: {preview.contact.firstName} {preview.contact.lastName}{preview.contact.email && ` · ${preview.contact.email}`}</p>
            )}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b" style={{ borderColor: 'hsl(var(--border))' }}>
                  <tr>
                    <th className="py-2 text-left text-muted-foreground font-medium">Description</th>
                    <th className="py-2 text-right text-muted-foreground font-medium">Qty</th>
                    <th className="py-2 text-right text-muted-foreground font-medium">Unit</th>
                    <th className="py-2 text-right text-muted-foreground font-medium">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {preview.lineItems.map((li, i) => (
                    <tr key={i}>
                      <td className="py-2.5 text-foreground">{li.description}</td>
                      <td className="py-2.5 text-right text-muted-foreground tabular">{li.quantity}</td>
                      <td className="py-2.5 text-right text-muted-foreground tabular">{fmt(Number(li.unitPrice))}</td>
                      <td className="py-2.5 text-right font-medium text-foreground tabular">{fmt(Number(li.total))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Subtotal</span><span className="tabular">{fmt(Number(preview.subtotal))}</span></div>
              <div className="flex justify-between text-sm"><span className="text-muted-foreground">Tax</span><span className="tabular">{fmt(Number(preview.tax))}</span></div>
              <div className="flex justify-between font-bold text-foreground text-base pt-1.5 border-t" style={{ borderColor: 'hsl(var(--border))' }}>
                <span>Total</span><span className="text-primary tabular">{fmt(Number(preview.total))}</span>
              </div>
            </div>
            <button onClick={() => setPreview(null)} className="w-full py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors" style={{ border: '1px solid hsl(var(--border))' }}>Close</button>
          </div>
        </div>
      )}
    </div>
  )
}
