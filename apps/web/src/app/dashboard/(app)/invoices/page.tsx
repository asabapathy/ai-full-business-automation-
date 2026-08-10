'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Send, Zap, X, Trash2, Download, Filter, Eye, Printer } from 'lucide-react'
import { apiClient } from '../../../../../lib/api-client'
import { formatRelativeTime } from '../../../../../lib/utils'
import { toast } from '../../../../../lib/toast'

interface InvoiceLineItem {
  description?: string
  name?: string
  quantity?: number
  unitPrice?: number
  rate?: number
  total?: number
  amount?: number
}

interface Invoice {
  id: string
  invoiceNumber: string
  title: string
  total: number
  status: string
  dueDate?: string
  createdAt: string
  contact?: { firstName: string; lastName?: string }
  // optional extended fields (populated by some API responses)
  subtotal?: number
  tax?: number
  items?: InvoiceLineItem[]
  lineItems?: InvoiceLineItem[]
  clientEmail?: string
  description?: string
}

interface FinancialSummary {
  revenue: number
  expenses: number
  profit: number
  outstanding: number
  overdueInvoices: number
  cashFlowHealth: string
}

const STATUS_META: Record<string, { text: string; bg: string }> = {
  DRAFT:     { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
  SENT:      { text: '#60a5fa', bg: 'rgba(96,165,250,0.12)' },
  PAID:      { text: '#34d399', bg: 'rgba(52,211,153,0.12)' },
  OVERDUE:   { text: '#f87171', bg: 'rgba(248,113,113,0.12)' },
  CANCELLED: { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' },
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

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [remindingId, setRemindingId] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)
  const [bulkReminding, setBulkReminding] = useState(false)
  const [previewInvoice, setPreviewInvoice] = useState<Invoice | null>(null)
  const [filters, setFilters] = useState({ status: '', minAmount: '', maxAmount: '', dateFrom: '', dateTo: '' })
  const [showFilters, setShowFilters] = useState(false)
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
          apiClient.get<{ invoices: Invoice[] }>('/finance/invoices', { status: statusFilter || undefined }),
          apiClient.get<FinancialSummary>('/finance/summary'),
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
      const res = await apiClient.post<{ data: { invoice: Invoice } }>('/finance/invoices', {
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

  async function handleRemind(id: string) {
    setRemindingId(id)
    try {
      await apiClient.post(`/finance/invoices/${id}/remind`, {})
      toast('Reminder sent to client', 'success')
    } catch {
      toast('Failed to send reminder', 'error')
    } finally {
      setRemindingId(null)
    }
  }

  function toggleSelect(id: string) {
    setSelectedIds(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const filteredInvoices = invoices.filter(inv => {
    if (filters.status && inv.status?.toLowerCase() !== filters.status) return false
    if (filters.minAmount && (inv.total ?? 0) < Number(filters.minAmount)) return false
    if (filters.maxAmount && (inv.total ?? 0) > Number(filters.maxAmount)) return false
    if (filters.dateFrom && inv.dueDate && new Date(inv.dueDate) < new Date(filters.dateFrom)) return false
    if (filters.dateTo && inv.dueDate && new Date(inv.dueDate) > new Date(filters.dateTo)) return false
    return true
  })

  function toggleSelectAll() {
    if (selectedIds.size === filteredInvoices.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredInvoices.map(inv => inv.id)))
    }
  }

  async function bulkDelete() {
    if (selectedIds.size === 0) return
    setBulkDeleting(true)
    try {
      await Promise.all([...selectedIds].map(id => apiClient.delete(`/finance/invoices/${id}`)))
      setInvoices(prev => prev.filter(inv => !selectedIds.has(inv.id)))
      toast(`Deleted ${selectedIds.size} invoice${selectedIds.size > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
    } catch {
      toast('Some invoices could not be deleted', 'error')
    } finally {
      setBulkDeleting(false)
    }
  }

  function downloadCSV(rows: Record<string, string | number>[], filename: string) {
    if (!rows.length) return
    const headers = Object.keys(rows[0])
    const csv = [
      headers.join(','),
      ...rows.map(r => headers.map(h => {
        const v = String(r[h] ?? '')
        return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v
      }).join(','))
    ].join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }))
    const a = document.createElement('a')
    a.href = url; a.download = filename; a.click()
    URL.revokeObjectURL(url)
  }

  async function bulkRemind() {
    if (selectedIds.size === 0) return
    const remindable = invoices.filter(inv => selectedIds.has(inv.id) && ['SENT', 'OVERDUE'].includes(inv.status))
    if (remindable.length === 0) { toast('No sent/overdue invoices selected', 'error'); return }
    setBulkReminding(true)
    try {
      await Promise.all(remindable.map(inv => apiClient.post(`/finance/invoices/${inv.id}/remind`, {})))
      toast(`Reminder sent for ${remindable.length} invoice${remindable.length > 1 ? 's' : ''}`, 'success')
      setSelectedIds(new Set())
    } catch {
      toast('Some reminders could not be sent', 'error')
    } finally {
      setBulkReminding(false)
    }
  }

  function printInvoice() {
    const printContent = document.getElementById('invoice-print-area')
    if (!printContent) return
    const win = window.open('', '_blank', 'width=800,height=600')
    if (!win) return
    win.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice ${previewInvoice?.invoiceNumber ?? ''}</title>
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; color: #111; background: white; padding: 40px; }
          .invoice-header { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .company-name { font-size: 24px; font-weight: 700; color: #06b6d4; }
          .invoice-title { font-size: 32px; font-weight: 300; color: #666; text-align: right; }
          .invoice-number { font-size: 14px; color: #666; text-align: right; margin-top: 4px; }
          .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .meta-label { font-size: 11px; text-transform: uppercase; letter-spacing: 0.1em; color: #999; margin-bottom: 4px; }
          .meta-value { font-size: 14px; color: #111; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
          th { background: #f5f5f5; padding: 10px 12px; text-align: left; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #666; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          .total-row { display: flex; justify-content: flex-end; }
          .total-box { background: #f5f5f5; padding: 20px 24px; border-radius: 8px; min-width: 260px; }
          .total-line { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 14px; color: #666; }
          .grand-total { display: flex; justify-content: space-between; font-size: 20px; font-weight: 700; color: #111; margin-top: 12px; padding-top: 12px; border-top: 2px solid #ddd; }
          .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 600; }
          .paid { background: #d1fae5; color: #065f46; }
          .pending { background: #fef3c7; color: #92400e; }
          .overdue { background: #fee2e2; color: #991b1b; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>${printContent.innerHTML}</body>
      </html>
    `)
    win.document.close()
    win.print()
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
            className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors"
            style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.05)', border: '1px solid rgba(6,182,212,0.3)' }}
          >
            <Zap className="h-4 w-4" />
            AI Analyze
          </button>
          <button
            onClick={() => downloadCSV(
              invoices.map(inv => ({
                Number: inv.invoiceNumber,
                Client: inv.contact ? `${inv.contact.firstName} ${inv.contact.lastName ?? ''}`.trim() : '',
                Amount: inv.total,
                Status: inv.status,
                Due: inv.dueDate ?? '',
                Paid: '',
              })),
              'invoices.csv'
            )}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            <Download className="h-4 w-4" /> Export
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
          { label: 'Revenue (30d)', value: summary ? `$${(summary.revenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, color: '#34d399' },
          { label: 'Outstanding', value: summary ? `$${(summary.outstanding / 1000).toFixed(1)}k` : '--', icon: Clock, color: '#fbbf24' },
          { label: 'Overdue', value: summary?.overdueInvoices ?? '--', icon: AlertTriangle, color: '#f87171' },
          { label: 'Net Profit', value: summary ? `$${(summary.profit / 1000).toFixed(1)}k` : '--', icon: CheckCircle, color: '#06b6d4' },
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
              <stat.icon className="h-4 w-4" style={{ color: stat.color }} />
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
            {isLoading
              ? <div className="h-8 w-16 mt-1 animate-pulse rounded" style={{ background: 'hsl(var(--muted))' }} />
              : <p className="text-2xl font-bold tabular" style={{ color: stat.color }}>{stat.value}</p>
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
              ? <CheckCircle className="h-4 w-4" style={{ color: '#34d399' }} />
              : <AlertTriangle className="h-4 w-4" style={{ color: '#f87171' }} />
            }
          </div>
          <div>
            <p className="font-medium text-sm text-foreground">Cash Flow: {summary.cashFlowHealth === 'positive' ? 'Healthy' : 'Needs Attention'}</p>
            <p className="text-xs text-muted-foreground">Revenue exceeds expenses by ${(summary.profit / 1000).toFixed(1)}k this month</p>
          </div>
          <button
            className="ml-auto flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.05)' }}
            style={{ border: '1px solid rgba(6,182,212,0.2)' }}
          >
            <Zap className="h-3 w-3" />
            AI Insights
          </button>
        </div>
      )}

      {/* Status Filter */}
      <div className="kv-anim flex flex-wrap gap-2 items-center" style={{ animationDelay: '0.46s' }}>
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
        <button onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
          style={showFilters
            ? { background: 'rgba(6,182,212,0.12)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }
            : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }}>
          <Filter className="h-3.5 w-3.5" />
          Filters
          {(filters.status || filters.minAmount || filters.maxAmount || filters.dateFrom || filters.dateTo) && (
            <span className="ml-1 h-2 w-2 rounded-full" style={{ background: '#06b6d4' }} />
          )}
        </button>
      </div>

      {showFilters && (
        <div className="rounded-xl p-4 grid grid-cols-2 sm:grid-cols-4 gap-3" style={cardStyle}>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Status</label>
            <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
              className={inputCls} style={inputStyle}>
              <option value="">All statuses</option>
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Min Amount ($)</label>
            <input type="number" value={filters.minAmount} onChange={e => setFilters(f => ({ ...f, minAmount: e.target.value }))}
              placeholder="0" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Max Amount ($)</label>
            <input type="number" value={filters.maxAmount} onChange={e => setFilters(f => ({ ...f, maxAmount: e.target.value }))}
              placeholder="Any" className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Due From</label>
            <input type="date" value={filters.dateFrom} onChange={e => setFilters(f => ({ ...f, dateFrom: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div>
            <label className="text-xs font-medium text-muted-foreground block mb-1.5">Due To</label>
            <input type="date" value={filters.dateTo} onChange={e => setFilters(f => ({ ...f, dateTo: e.target.value }))}
              className={inputCls} style={inputStyle} />
          </div>
          <div className="col-span-2 sm:col-span-3 flex items-end">
            <button onClick={() => setFilters({ status: '', minAmount: '', maxAmount: '', dateFrom: '', dateTo: '' })}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors">
              Clear filters
            </button>
          </div>
        </div>
      )}

      {Object.entries(filters).some(([, v]) => v) && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Status: {filters.status}
              <button onClick={() => setFilters(f => ({ ...f, status: '' }))}>×</button>
            </span>
          )}
          {filters.minAmount && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Min: ${filters.minAmount}
              <button onClick={() => setFilters(f => ({ ...f, minAmount: '' }))}>×</button>
            </span>
          )}
          {filters.maxAmount && (
            <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full"
              style={{ background: 'rgba(6,182,212,0.1)', color: '#06b6d4', border: '1px solid rgba(6,182,212,0.3)' }}>
              Max: ${filters.maxAmount}
              <button onClick={() => setFilters(f => ({ ...f, maxAmount: '' }))}>×</button>
            </span>
          )}
        </div>
      )}

      {/* Invoice List */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.53s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          {filteredInvoices.length > 0 && (
            <button
              onClick={toggleSelectAll}
              className="h-4 w-4 rounded shrink-0 flex items-center justify-center"
              style={selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0
                ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                : { border: '1px solid hsl(var(--border))', background: 'transparent' }
              }
            >
              {selectedIds.size === filteredInvoices.length && filteredInvoices.length > 0 && (
                <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
              )}
            </button>
          )}
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Invoices</h2>
          {selectedIds.size > 0 && (
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">{selectedIds.size} selected</span>
              <button
                onClick={bulkRemind}
                disabled={bulkReminding}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.2)' }}
              >
                <Send className="h-3 w-3" />
                {bulkReminding ? 'Sending…' : 'Remind selected'}
              </button>
              <button
                onClick={bulkDelete}
                disabled={bulkDeleting}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                style={{ color: '#f87171', background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)' }}
              >
                <Trash2 className="h-3 w-3" />
                {bulkDeleting ? 'Deleting…' : 'Delete selected'}
              </button>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-16 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <FileText className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No invoices yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first invoice or let AI generate one.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {filteredInvoices.map(invoice => {
              const isOverdue = invoice.status !== 'PAID' && invoice.dueDate && new Date(invoice.dueDate) < new Date()
              const displayStatus = isOverdue ? 'OVERDUE' : invoice.status
              const Icon = STATUS_ICONS[displayStatus] ?? FileText
              const isSelected = selectedIds.has(invoice.id)

              return (
                <div key={invoice.id} className="flex items-center gap-3 px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <button
                    onClick={() => toggleSelect(invoice.id)}
                    className="h-4 w-4 rounded shrink-0 flex items-center justify-center"
                    style={isSelected
                      ? { background: '#06b6d4', border: '1px solid #06b6d4' }
                      : { border: '1px solid hsl(var(--border))', background: 'transparent' }
                    }
                  >
                    {isSelected && (
                      <svg className="h-2.5 w-2.5 text-white" fill="none" viewBox="0 0 10 10"><path d="M1.5 5l2.5 2.5 4.5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
                    )}
                  </button>
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(6,182,212,0.1)' }}
                  >
                    <Icon className="h-4 w-4" style={{ color: '#06b6d4' }} />
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

                  {(() => {
                    const m = STATUS_META[displayStatus] ?? { text: '#94a3b8', bg: 'rgba(148,163,184,0.12)' }
                    return <span className="rounded-full px-2.5 py-0.5 text-[10px] font-semibold" style={{ color: m.text, background: m.bg }}>{displayStatus}</span>
                  })()}

                  <button
                    onClick={() => setPreviewInvoice(invoice)}
                    title="Preview"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-all"
                    style={{ border: '1px solid hsl(var(--border))', background: 'hsl(var(--card))' }}
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {(displayStatus === 'SENT' || displayStatus === 'OVERDUE') && (
                    <button
                      onClick={() => handleRemind(invoice.id)}
                      disabled={remindingId === invoice.id}
                      className="rounded-lg px-2 py-1 text-xs font-medium opacity-0 group-hover:opacity-100 transition-all disabled:opacity-40"
                      style={{ color: '#06b6d4', background: 'rgba(6,182,212,0.08)' }}
                    >
                      {remindingId === invoice.id ? 'Sending…' : 'Remind'}
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
