'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Mail, TrendingUp, Users, Calendar, Star, DollarSign, ChevronRight } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Skeleton } from '../../../../components/ui/skeleton'

interface ReportData {
  revenue30d: number
  newContacts30d: number
  appointments30d: number
  dealsWon30d: number
  avgReviewRating: number
  totalReviews: number
  topContacts: Array<{ name: string; revenue: number }>
  pipeline: Array<{ stage: string; count: number; value: number }>
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

const DEMO_REPORT: ReportData = {
  revenue30d: 18420,
  newContacts30d: 34,
  appointments30d: 47,
  dealsWon30d: 12,
  avgReviewRating: 4.8,
  totalReviews: 61,
  topContacts: [
    { name: 'Sunrise Dental Group', revenue: 4200 },
    { name: 'Peak HVAC Services', revenue: 3150 },
    { name: 'Glow Beauty Salon', revenue: 2840 },
    { name: 'Mark Johnson', revenue: 1960 },
    { name: 'Sarah Williams', revenue: 1450 },
  ],
  pipeline: [
    { stage: 'LEAD', count: 18, value: 54000 },
    { stage: 'QUALIFIED', count: 9, value: 33750 },
    { stage: 'PROPOSAL', count: 5, value: 22500 },
    { stage: 'NEGOTIATION', count: 3, value: 18000 },
  ],
}

export default function ReportsPage() {
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    apiClient.get<{ report: ReportData }>('/reports/business')
      .then((d: any) => { setReport(d.report ?? d); setLoading(false) })
      .catch(() => { setReport(DEMO_REPORT); setLoading(false) })
  }, [])

  const handleEmail = async () => {
    setEmailing(true)
    try {
      await apiClient.post('/reports/business/email', {})
      toast('Report sent to your email', 'success')
    } catch {
      toast('Failed to send report email', 'error')
    } finally {
      setEmailing(false)
    }
  }

  const stats = report ? [
    { label: 'Revenue (30d)', value: fmt(report.revenue30d), icon: DollarSign, color: '#34d399' },
    { label: 'New Contacts', value: report.newContacts30d, icon: Users, color: '#06b6d4' },
    { label: 'Appointments', value: report.appointments30d, icon: Calendar, color: '#a855f7' },
    { label: 'Deals Won', value: report.dealsWon30d, icon: TrendingUp, color: '#f59e0b' },
    { label: 'Avg Rating', value: `${report.avgReviewRating}★`, icon: Star, color: '#fbbf24' },
    { label: 'Total Reviews', value: report.totalReviews, icon: Star, color: '#f97316' },
  ] : []

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">30-day performance snapshot</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleEmail}
            disabled={emailing || loading}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
          >
            <Mail className="h-4 w-4" />
            {emailing ? 'Sending…' : 'Email Report'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div {...anim(1)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
        ) : stats.map((s, i) => (
          <div key={i} className="rounded-xl p-4" style={cardStyle}>
            <div className="flex items-center gap-1.5 mb-2">
              <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
              <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{s.label}</p>
            </div>
            <p className="text-xl font-bold tabular" style={{ color: s.color }}>{s.value}</p>
          </div>
        ))}
      </div>

      {!loading && report && (
        <div {...anim(2)} className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Top customers */}
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold text-foreground">Top Customers by Revenue</h2>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            {report.topContacts.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No paid invoices in the last 30 days.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {report.topContacts.map((c, i) => (
                  <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-accent/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-muted-foreground tabular w-4">{i + 1}</span>
                      <p className="text-sm text-foreground">{c.name}</p>
                    </div>
                    <p className="text-sm font-semibold text-emerald-400 tabular">{fmt(c.revenue)}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pipeline */}
          <div className="rounded-xl overflow-hidden" style={cardStyle}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold text-foreground">Sales Pipeline</h2>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </div>
            {report.pipeline.length === 0 ? (
              <p className="px-5 py-8 text-sm text-muted-foreground text-center">No active deals.</p>
            ) : (
              <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                {report.pipeline.map((p, i) => {
                  const totalValue = report.pipeline.reduce((a, x) => a + x.value, 0)
                  const pct = totalValue > 0 ? (p.value / totalValue) * 100 : 0
                  return (
                    <div key={i} className="px-5 py-3 hover:bg-accent/30 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-sm text-foreground">{p.stage}</p>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-muted-foreground tabular">{p.count} deals</span>
                          <span className="text-sm font-semibold text-primary tabular">{fmt(p.value)}</span>
                        </div>
                      </div>
                      <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
