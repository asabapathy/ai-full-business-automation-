'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Send, Zap } from 'lucide-react'
import { Badge } from '../../../../../components/ui/badge'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'
import { formatRelativeTime } from '../../../../../lib/utils'

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

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [summary, setSummary] = useState<FinancialSummary | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('')

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
    </div>
  )
}
