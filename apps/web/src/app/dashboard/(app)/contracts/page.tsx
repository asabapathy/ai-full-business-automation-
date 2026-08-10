'use client'

import { useState, useEffect } from 'react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

import { ScrollText, Plus, Trash2, Send, PenLine, Eye, X } from 'lucide-react'

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

const STATUS_META: Record<string, { text: string; bg: string }> = {
  draft:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  sent:      { text: '#38bdf8', bg: 'rgba(56,189,248,0.12)' },
  signed:    { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  expired:   { text: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  cancelled: { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
}

const DEMO_CONTRACTS: Contract[] = [
  {
    id: '1',
    title: 'Annual HVAC Service Agreement',
    status: 'signed',
    value: '4800',
    startDate: new Date(Date.now() - 45 * 86400000).toISOString(),
    endDate: new Date(Date.now() + 320 * 86400000).toISOString(),
    content: 'ANNUAL HVAC SERVICE AGREEMENT\n\nThis Agreement is between [Your Business] ("Service Provider") and Mark Johnson ("Client").\n\nScope of Work:\n- Bi-annual inspection and tune-up\n- Priority emergency service response\n- 15% discount on replacement parts\n\nCompensation:\n$400/month, billed on the 1st of each month.\n\nTerm: One (1) year, auto-renewing with 30-day notice to cancel.',
    contact: { id: 'c1', firstName: 'Mark', lastName: 'Johnson', email: 'mark@example.com' },
    createdAt: new Date(Date.now() - 50 * 86400000).toISOString(),
  },
  {
    id: '2',
    title: 'Web Development NDA',
    status: 'sent',
    value: '0',
    content: 'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement is made between the parties identified below.\n\n1. Confidential Information\nEach party may disclose confidential information solely for evaluating a potential business relationship.\n\n2. Obligations\nRecipient shall keep confidential information strictly confidential and not disclose to any third party.\n\n3. Term\nThis Agreement remains in effect for two (2) years from the date of signing.',
    contact: { id: 'c2', firstName: 'Sarah', lastName: 'Williams' },
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
  {
    id: '3',
    title: 'Monthly Retainer — Digital Marketing',
    status: 'draft',
    value: '2500',
    startDate: new Date(Date.now() + 15 * 86400000).toISOString(),
    content: 'MONTHLY RETAINER AGREEMENT\n\nServices: Social media management, email campaigns, monthly analytics reporting\n\nRetainer Fee: $2,500/month\nTerm: 6 months with 30-day termination notice.\nAdditional hours billed at $125/hr.',
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
]

const DEMO_STATS: Stats = { total: 3, byStatus: { draft: 1, sent: 1, signed: 1 }, signedValue: 4800 }

const TEMPLATES = [
  {
    name: 'NDA',
    content: 'NON-DISCLOSURE AGREEMENT\n\nThis Non-Disclosure Agreement ("Agreement") is entered into between [Your Business Name] and the Client.\n\n1. CONFIDENTIAL INFORMATION\nEach party may disclose confidential information to the other solely for evaluating a potential business relationship.\n\n2. OBLIGATIONS\nRecipient shall keep confidential information strictly confidential and shall not disclose it to any third party without prior written consent.\n\n3. TERM\nThis Agreement shall remain in effect for two (2) years from the date of signing.\n\n4. GOVERNING LAW\nThis Agreement shall be governed by applicable state law.\n\n_________________________\nAuthorized Signature\nDate: ____________',
  },
  {
    name: 'Service Agreement',
    content: 'SERVICE AGREEMENT\n\nThis Service Agreement is entered into between [Your Business Name] ("Service Provider") and the Client.\n\n1. SERVICES\nService Provider agrees to perform the following services:\n[Describe services here]\n\n2. COMPENSATION\nClient agrees to pay the amount specified in the attached proposal within 30 days of invoice.\n\n3. TIMELINE\nServices will be completed by the agreed-upon date unless otherwise modified in writing.\n\n4. INTELLECTUAL PROPERTY\nUpon full payment, all deliverables become the property of Client.\n\n5. TERMINATION\nEither party may terminate with 30 days written notice.\n\n_________________________\nAuthorized Signature\nDate: ____________',
  },
  {
    name: 'Monthly Retainer',
    content: 'MONTHLY RETAINER AGREEMENT\n\nThis Retainer Agreement is between [Your Business Name] ("Contractor") and the Client.\n\n1. SERVICES\nContractor will provide ongoing services as mutually agreed each month.\n\n2. RETAINER FEE\nClient agrees to pay $[Amount] per month, due on the 1st of each month.\n\n3. SCOPE\nRetainer covers up to [X] hours per month. Additional hours billed at $[rate]/hr.\n\n4. TERM\nThis agreement continues month-to-month until terminated.\n\n5. TERMINATION\n30 days written notice required from either party.\n\n_________________________\nAuthorized Signature\nDate: ____________',
  },
]

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function ContractsPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [stats, setStats] = useState<Stats>(DEMO_STATS)
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [preview, setPreview] = useState<Contract | null>(null)
  const [form, setForm] = useState({ title: '', content: '', value: '', startDate: '', endDate: '' })
  const [saving, setSaving] = useState(false)
  const [sending, setSending] = useState<string | null>(null)
  const [signing, setSigning] = useState<string | null>(null)
  const [removing, setRemoving] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [cRes, sRes] = await Promise.all([
        apiClient.get('/contracts'),
        apiClient.get('/contracts/stats'),
      ]) as any[]
      setContracts(cRes?.contracts ?? [])
      if (sRes?.total !== undefined) setStats(sRes)
    } catch {
      setContracts(DEMO_CONTRACTS)
      setStats(DEMO_STATS)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { void load() }, [])

  const save = async () => {
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
      toast('Contract created', 'success')
      void load()
    } catch {
      toast('Failed to create contract', 'error')
    } finally {
      setSaving(false)
    }
  }

  const sendContract = async (id: string) => {
    setSending(id)
    try {
      await apiClient.post(`/contracts/${id}/send`, {})
      toast('Contract sent to client', 'success')
      void load()
    } catch {
      toast('Failed to send contract', 'error')
    } finally {
      setSending(null)
    }
  }

  const markSigned = async (id: string) => {
    setSigning(id)
    try {
      await apiClient.post(`/contracts/${id}/sign`, {})
      toast('Contract marked as signed', 'success')
      void load()
    } catch {
      toast('Failed to update contract', 'error')
    } finally {
      setSigning(null)
    }
  }

  const remove = async (id: string) => {
    setRemoving(id)
    try {
      await apiClient.delete(`/contracts/${id}`)
      setContracts(prev => prev.filter(c => c.id !== id))
      toast('Contract deleted', 'success')
    } catch {
      toast('Failed to delete contract', 'error')
    } finally {
      setRemoving(null)
    }
  }

  const applyTemplate = (tpl: typeof TEMPLATES[number]) => {
    setForm(p => ({ ...p, content: tpl.content, title: p.title || tpl.name }))
  }

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Contracts</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Create and manage client contracts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
        >
          <Plus className="h-4 w-4" />
          New Contract
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Total', value: stats.total, colorStyle: { color: 'hsl(var(--foreground))' } },
          { label: 'Draft', value: stats.byStatus.draft ?? 0, colorStyle: { color: 'hsl(var(--muted-foreground))' } },
          { label: 'Sent', value: stats.byStatus.sent ?? 0, colorStyle: { color: 'hsl(var(--primary))' } },
          { label: 'Signed Value', value: `$${(stats.signedValue / 1000).toFixed(1)}k`, colorStyle: { color: '#34d399' } },
        ].map((s, i) => (
          <div
            key={s.label}
            className="kv-anim rounded-xl border p-4"
            style={{ ...cardStyle, animationDelay: `${0.11 + i * 0.07}s` }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide mb-1">{s.label}</p>
            <p className="text-2xl font-bold tabular" style={s.colorStyle}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div
        className="kv-anim rounded-xl overflow-hidden"
        style={{ ...cardStyle, animationDelay: '0.46s' }}
      >
        {loading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-14 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)}
          </div>
        ) : contracts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <ScrollText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No contracts yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first contract or use a template.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b" style={{ borderColor: 'hsl(var(--border))', background: 'rgba(255,255,255,0.02)' }}>
                  {['Title', 'Client', 'Status', 'Value', 'Start', 'End', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {contracts.map(c => {
                  const meta = STATUS_META[c.status] ?? STATUS_META['draft']!
                  return (
                    <tr key={c.id} className="border-b last:border-0 hover:bg-accent/5 transition-colors" style={{ borderColor: 'hsl(var(--border))' }}>
                      <td className="px-4 py-3 font-medium text-foreground">{c.title}</td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.contact ? `${c.contact.firstName} ${c.contact.lastName}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                          style={{ color: meta.text, background: meta.bg }}
                        >
                          {c.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-foreground/80 tabular">
                        {c.value ? `$${Number(c.value).toLocaleString()}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.startDate ? new Date(c.startDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        {c.endDate ? new Date(c.endDate).toLocaleDateString() : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setPreview(c)}
                            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent/20 transition-colors"
                            title="Preview"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          {c.status === 'draft' && (
                            <button
                              onClick={() => sendContract(c.id)}
                              disabled={sending === c.id}
                              className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                              title="Send to client"
                            >
                              <Send className="h-3.5 w-3.5" style={{ color: '#38bdf8' }} />
                            </button>
                          )}
                          {c.status === 'sent' && (
                            <button
                              onClick={() => markSigned(c.id)}
                              disabled={signing === c.id}
                              className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                              title="Mark as signed"
                            >
                              <PenLine className="h-3.5 w-3.5" style={{ color: '#34d399' }} />
                            </button>
                          )}
                          {c.status === 'draft' && (
                            <button
                              onClick={() => remove(c.id)}
                              disabled={removing === c.id}
                              className="p-1.5 rounded-lg hover:bg-accent/20 transition-colors disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" style={{ color: '#f87171' }} />
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

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-5 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Contract</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Template picker */}
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Start from template</label>
              <div className="flex gap-2 flex-wrap">
                {TEMPLATES.map(tpl => (
                  <button
                    key={tpl.name}
                    onClick={() => applyTemplate(tpl)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all hover:scale-[1.02]"
                    style={{ background: 'rgba(6,182,212,0.1)', color: '#38bdf8', border: '1px solid rgba(56,189,248,0.2)' }}
                  >
                    {tpl.name}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Title *</label>
              <input
                value={form.title}
                onChange={e => setForm(p => ({ ...p, title: e.target.value }))}
                className={inputCls}
                style={inputStyle}
                placeholder="Service Agreement, NDA, etc."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Contract Content *</label>
              <textarea
                value={form.content}
                onChange={e => setForm(p => ({ ...p, content: e.target.value }))}
                rows={8}
                className={inputCls + ' font-mono resize-none'}
                style={inputStyle}
                placeholder="Paste or type contract content here…"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Value ($)</label>
                <input
                  type="number" min="0" step="0.01"
                  value={form.value}
                  onChange={e => setForm(p => ({ ...p, value: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Start Date</label>
                <input
                  type="date"
                  value={form.startDate}
                  onChange={e => setForm(p => ({ ...p, startDate: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">End Date</label>
                <input
                  type="date"
                  value={form.endDate}
                  onChange={e => setForm(p => ({ ...p, endDate: e.target.value }))}
                  className={inputCls}
                  style={inputStyle}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}
              >
                Cancel
              </button>
              <button
                onClick={save}
                disabled={saving || !form.title || !form.content}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
              >
                {saving ? 'Saving…' : 'Create Contract'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {preview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-2xl rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">{preview.title}</h2>
              <div className="flex items-center gap-2">
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-medium capitalize"
                  style={{
                    color: (STATUS_META[preview.status] ?? STATUS_META['draft']!).text,
                    background: (STATUS_META[preview.status] ?? STATUS_META['draft']!).bg,
                  }}
                >
                  {preview.status}
                </span>
                <button onClick={() => setPreview(null)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
            {preview.contact && (
              <p className="text-sm text-muted-foreground">Parties: {preview.contact.firstName} {preview.contact.lastName}</p>
            )}
            {(preview.startDate || preview.endDate) && (
              <p className="text-sm text-muted-foreground">
                {preview.startDate && `From: ${new Date(preview.startDate).toLocaleDateString()}`}
                {preview.startDate && preview.endDate && ' → '}
                {preview.endDate && `To: ${new Date(preview.endDate).toLocaleDateString()}`}
              </p>
            )}
            <div
              className="rounded-xl p-4 text-sm font-mono whitespace-pre-wrap max-h-72 overflow-y-auto"
              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid hsl(var(--border))' }}
            >
              {preview.content}
            </div>
            <button
              onClick={() => setPreview(null)}
              className="w-full py-2.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
              style={{ border: '1px solid hsl(var(--border))' }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
