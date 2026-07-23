'use client'

import { useState, useEffect } from 'react'
import { FileText, Plus, DollarSign, Clock, CheckCircle, AlertTriangle, Send, Zap } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
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
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Finance</h1>
          <p className="text-muted-foreground text-sm mt-0.5">Invoice automation and financial insights</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Zap className="h-4 w-4" />
            AI Analyze
          </Button>
          <Button>
            <Plus className="h-4 w-4" />
            New Invoice
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Revenue (30d)', value: summary ? `$${(summary.revenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, color: 'text-green-600' },
          { label: 'Outstanding', value: summary ? `$${(summary.outstanding / 1000).toFixed(1)}k` : '--', icon: Clock, color: 'text-amber-600' },
          { label: 'Overdue', value: summary?.overdueInvoices ?? '--', icon: AlertTriangle, color: 'text-red-600' },
          { label: 'Net Profit', value: summary ? `$${(summary.profit / 1000).toFixed(1)}k` : '--', icon: CheckCircle, color: 'text-blue-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
                <p className="text-sm text-muted-foreground">{stat.label}</p>
              </div>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Cash Flow Health */}
      {summary && (
        <Card className={`border-l-4 ${summary.cashFlowHealth === 'positive' ? 'border-l-green-500' : 'border-l-red-500'}`}>
          <CardContent className="p-4 flex items-center gap-3">
            <div className={`h-8 w-8 rounded-full flex items-center justify-center ${summary.cashFlowHealth === 'positive' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
              {summary.cashFlowHealth === 'positive'
                ? <CheckCircle className="h-4 w-4 text-green-600" />
                : <AlertTriangle className="h-4 w-4 text-red-600" />
              }
            </div>
            <div>
              <p className="font-medium text-sm">Cash Flow: {summary.cashFlowHealth === 'positive' ? 'Healthy' : 'Needs Attention'}</p>
              <p className="text-xs text-muted-foreground">Revenue exceeds expenses by ${(summary.profit / 1000).toFixed(1)}k this month</p>
            </div>
            <Button variant="outline" size="sm" className="ml-auto">
              <Zap className="h-3 w-3 mr-1" />
              AI Insights
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Status Filter */}
      <div className="flex gap-2">
        {['', 'DRAFT', 'SENT', 'PAID', 'OVERDUE'].map(status => (
          <Button
            key={status}
            variant={statusFilter === status ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStatusFilter(status)}
          >
            {status || 'All'}
          </Button>
        ))}
      </div>

      {/* Invoice List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Invoices
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : invoices.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <FileText className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No invoices yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first invoice or let AI generate one.</p>
            </div>
          ) : (
            <div className="divide-y">
              {invoices.map(invoice => {
                const isOverdue = invoice.status !== 'PAID' && invoice.dueDate && new Date(invoice.dueDate) < new Date()
                const displayStatus = isOverdue ? 'OVERDUE' : invoice.status
                const Icon = STATUS_ICONS[displayStatus] ?? FileText

                return (
                  <div key={invoice.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors group">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{invoice.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {invoice.invoiceNumber}
                        {invoice.contact && ` • ${invoice.contact.firstName} ${invoice.contact.lastName ?? ''}`}
                        {invoice.dueDate && ` • Due ${formatRelativeTime(invoice.dueDate)}`}
                      </p>
                    </div>

                    <span className="text-sm font-semibold">${invoice.total.toLocaleString()}</span>

                    <Badge variant={(STATUS_COLORS[displayStatus] as never) ?? 'outline'} className="text-xs">
                      {displayStatus}
                    </Badge>

                    {(displayStatus === 'SENT' || displayStatus === 'OVERDUE') && (
                      <Button size="sm" variant="outline" className="h-7 text-xs opacity-0 group-hover:opacity-100 transition-opacity">
                        Remind
                      </Button>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
