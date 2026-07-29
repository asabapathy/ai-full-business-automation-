'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Send, Zap, X } from 'lucide-react'
import { Badge } from '../../../../../components/ui/badge'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'
import { formatRelativeTime } from '../../../../../lib/utils'
import { toast } from '../../../../../lib/toast'

interface Invoice {
  id: string
  invoiceNumber: string
  title: string
  total: number
  status: string
  dueDate?: string
  createdAt: string
  contact?: { firstName: string; lastName?: string }
}

interface FinancialSummary {
  revenue: number
  expenses: number
  profit: number
  outstanding: number
  overdueInvoices: number
  cashFlowHealth: string
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  SENT: 'info',
  PAID: 'success',
  OVERDUE: 'destructive',
  CANCELLED: 'outline',
}

const STATUS_ICONS: Record<string, React.ElementType> = {
  DRAFT: FileText,
  SENT: Send,
  PAID: CheckCircle,
  OVERDUE: AlertTriangle,
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form, setForm] = useState({
    title: '',
    clientName: '',
    description: '',
    quantity: '1',
    unitPrice: '',
    dueDate: '',
    notes: '',
  })

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [invoiceData, summaryData] = await Promise.all([
          api.get<{ invoices: Invoice[] }>('/finance/invoices', { status: statusFilter || undefined }),
          api.get<FinancialSummary>('/finance/summary'),
        ])
        setInvoices(invoiceData.invoices)
        setSummary(summaryData)
      } catch {
        setInvoices([
          { id: '1', invoiceNumber: 'INV-001', title: 'HVAC Installation - Johnson', total: 4500, status: 'PAID', createdAt: new Date().toISOString(), contact: { firstName: 'Mark', lastName: 'Johnson' } },
          { id: '2', invoiceNumber: 'INV-002', title: 'Annual Maintenance Contract', total: 1200, status: 'SENT', dueDate: new Date(Date.now() + 7 * 86400000).toISOString(), createdAt: new Date().toISOString(), contact: { firstName: 'Sarah', lastName: 'Williams' } },
          { id: '3', invoiceNumber: 'INV-003', title: 'Emergency Repair Service', total: 850, status: 'OVERDUE', dueDate: new Date(Date.now() - 14 * 86400000).toISOString(), createdAt: new Date().toISOString(), contact: { firstName: 'Tom', lastName: 'Peterson' } },
        ])
        setSummary({ revenue: 32000, expenses: 18000, profit: 14000, outstanding: 4200, overdueInvoices: 3, cashFlowHealth: 'positive' })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [statusFilter])

  async function createInvoice() {
    if (!form.title.trim() || !form.unitPrice) return
    setCreating(true)
    try {
      const res = await api.post<{ data: { invoice: Invoice } }>('/finance/invoices', {
        title: form.title,
        lineItems: [{
          description: form.description || form.title,
          quantity: parseFloat(form.quantity) || 1,
          unitPrice: parseFloat(form.unitPrice),
        }],
        dueDate: form.dueDate || undefined,
        notes: form.notes || undefined,
      }) as any
      const inv = res?.data?.invoice ?? res?.invoice
      if (inv) {
        setInvoices(prev => [inv, ...prev])
        toast('Invoice created', 'success')
      }
      setShowCreate(false)
      setForm({ title: '', clientName: '', description: '', quantity: '1', unitPrice: '', dueDate: '', notes: '' })
    } catch {
      toast('Failed to create invoice. Please try again.', 'error')
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Invoice automation and financial insights</p>
        </div>
        <div className="flex gap-2">
          <button
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-primary transition-colors hover:bg-primary/10"
            style={{ border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            AI Analyze
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
          >
            <Plus className="h-4 w-4" />
            New Invoice
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (30d)', value: summary ? `$${(summary.revenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Outstanding', value: summary ? `$${(summary.outstanding / 1000).toFixed(1)}k` : '--', icon: Clock, color: 'text-amber-400' },
          { label: 'Overdue', value: summary?.overdueInvoices ?? '--', icon: AlertTriangle, color: 'text-red-400' },
          { label: 'Net Profit', value: summary ? `$${(summary.profit / 1000).toFixed(1)}k` : '--', icon: CheckCircle, color: 'text-primary' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{
              animationDelay: `${0.11 + i * 0.07}s`,
              background: 'hsl(var(--card))',
              borderColor: 'hsl(var(--border))',
            }}
          >
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading
              ? <Skeleton className="h-8 w-16 mt-1" />
              : <p className={`text-2xl font-bold tabular ${stat.color}`}>{stat.value}</p>
            }
          </div>
        ))}
      </div>

      {/* Cash Flow Health */}
      {summary && (
        <div
          className="kv-anim rounded-xl border p-4 flex items-center gap-3"
          style={{
            animationDelay: '0.39s',
            background: summary.cashFlowHealth === 'positive' ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
            borderColor: summary.cashFlowHealth === 'positive' ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
            borderLeftWidth: 4,
            borderLeftColor: summary.cashFlowHealth === 'positive' ? '#10b981' : '#ef4444',
          }}
        >
          <div
            className="h-8 w-8 rounded-full flex items-center justify-center shrink-0"
            style={{
              background: summary.cashFlowHealth === 'positive' ? 'rgba(16,185,129,0.15)' : 'rgba(239,68,68,0.15)',
            }}
          >
            {summary.cashFlowHealth === 'positive'
              ? <CheckCircle className="h-4 w-4 text-emerald-400" />
              : <AlertTriangle className="h-4 w-4 text-red-400" />
            }
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">Cash Flow: {summary.cashFlowHealth === 'positive' ? 'Healthy' : 'Needs Attention'}</p>
            <p className="text-xs text-muted-foreground">Revenue exceeds expenses by ${(summary.profit / 1000).toFixed(1)}k this month</p>
          </div>
          <button
            className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/10 transition-colors"
            style={{ border: '1px solid rgba(6,182,212,0.2)' }}
          >
            <Zap className="h-3 w-3" />
            AI Insights
          </button>
        </div>
      )}

      {/* Status Filter */}
      <div className="kv-anim flex gap-2" style={{ animationDelay: '0.46s' }}>
        {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(status => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={statusFilter === status
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
            }
          >
            {status || 'All'}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.53s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : invoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first invoice or let AI generate one.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {invoices.map(invoice => {
              const isOverdue = invoice.status !== 'PAID' && invoice.dueDate && new Date(invoice.dueDate) < new Date()
              const displayStatus = isOverdue ? 'OVERDUE' : invoice.status
              const Icon = STATUS_ICONS[displayStatus] ?? FileText

              return (
                <div key={invoice.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(6,182,212,0.1)' }}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground">{invoice.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {invoice.invoiceNumber}
                      {invoice.contact && ` • ${invoice.contact.firstName} ${invoice.contact.lastName ?? ''}`}
                      {invoice.dueDate && ` • Due ${formatRelativeTime(invoice.dueDate)}`}
                    </p>
                  </div>

                  <span className="text-sm font-semibold text-foreground tabular">${invoice.total.toLocaleString()}</span>

                  <Badge variant={(STATUS_COLORS[displayStatus] as never) ?? 'outline'} className="text-xs">
                    {displayStatus}
                  </Badge>

                  {(displayStatus === 'SENT' || displayStatus === 'OVERDUE') && (
                    <button className="rounded-lg px-2 py-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                      Remind
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Create invoice modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-lg rounded-2xl p-6 space-y-5" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">New Invoice</h2>
              <button onClick={() => setShowCreate(false)} className="p-1 text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Invoice Title *</label>
                <input type="text" className={inputCls} style={inputStyle} placeholder="e.g. HVAC Installation — Johnson Residence"
                  value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Service Description</label>
                  <input type="text" className={inputCls} style={inputStyle} placeholder="Service details"
                    value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Quantity</label>
                  <input type="number" min="0.01" step="0.01" className={inputCls} style={inputStyle} placeholder="1"
                    value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Unit Price ($) *</label>
                  <input type="number" min="0" step="0.01" className={inputCls} style={inputStyle} placeholder="0.00"
                    value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: e.target.value }))} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Due Date</label>
                  <input type="date" className={inputCls} style={inputStyle}
                    value={form.dueDate} onChange={e => setForm(f => ({ ...f, dueDate: e.target.value }))} />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Notes</label>
                <textarea rows={2} className={inputCls + ' resize-none'} style={inputStyle} placeholder="Additional notes for the client"
                  value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} />
              </div>

              {form.unitPrice && (
                <div className="rounded-xl p-3 text-right" style={{ background: 'rgba(6,182,212,0.06)', border: '1px solid rgba(6,182,212,0.15)' }}>
                  <span className="text-xs text-muted-foreground">Total: </span>
                  <span className="font-bold text-foreground tabular">
                    ${(parseFloat(form.unitPrice || '0') * parseFloat(form.quantity || '1')).toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={createInvoice} disabled={creating || !form.title.trim() || !form.unitPrice}
                className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-white disabled:opacity-50 transition-all"
                style={{ background: 'linear-gradient(135deg,#06b6d4,#0ea5e9)' }}>
                {creating ? 'Creating…' : 'Create Invoice'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
