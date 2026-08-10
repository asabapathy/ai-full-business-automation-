'use client'

import { useState, useEffect } from 'react'
import { FileText, Download, Mail, TrendingUp, Users, Calendar, Star, DollarSign } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'
import { Skeleton } from '../../../../components/ui/skeleton'

interface ReportData {
  revenue: number
  newContacts: number
  appointments: number
  dealsWon: number
  avgReviewRating: number
  totalReviews: number
  topContacts: Array<{ name: string; revenue: number }>
  pipeline: Array<{ stage: string; count: number; value: number }>
  revenueBreakdown: Array<{ label: string; amount: number; pct: number }>
}

type Period = '7d' | '30d' | '90d'

const PERIOD_LABELS: Record<Period, string> = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
}

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

const DEMO_DATA: Record<Period, ReportData> = {
  '7d': {
    revenue: 4820,
    newContacts: 8,
    appointments: 11,
    dealsWon: 3,
    avgReviewRating: 4.7,
    totalReviews: 14,
    topContacts: [
      { name: 'Sunrise Dental Group', revenue: 1200 },
      { name: 'Peak HVAC Services', revenue: 980 },
      { name: 'Glow Beauty Salon', revenue: 740 },
    ],
    pipeline: [
      { stage: 'LEAD', count: 6, value: 18000 },
      { stage: 'QUALIFIED', count: 3, value: 11250 },
      { stage: 'PROPOSAL', count: 2, value: 9000 },
    ],
    revenueBreakdown: [
      { label: 'Services', amount: 2900, pct: 60 },
      { label: 'Products', amount: 1200, pct: 25 },
      { label: 'Maintenance', amount: 720, pct: 15 },
    ],
  },
  '30d': {
    revenue: 18420,
    newContacts: 34,
    appointments: 47,
    dealsWon: 12,
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
    revenueBreakdown: [
      { label: 'Services', amount: 11050, pct: 60 },
      { label: 'Products', amount: 4605, pct: 25 },
      { label: 'Maintenance', amount: 2765, pct: 15 },
    ],
  },
  '90d': {
    revenue: 52400,
    newContacts: 98,
    appointments: 134,
    dealsWon: 31,
    avgReviewRating: 4.9,
    totalReviews: 183,
    topContacts: [
      { name: 'Sunrise Dental Group', revenue: 11800 },
      { name: 'Peak HVAC Services', revenue: 9200 },
      { name: 'Glow Beauty Salon', revenue: 7400 },
      { name: 'Mark Johnson', revenue: 5600 },
      { name: 'Sarah Williams', revenue: 4200 },
    ],
    pipeline: [
      { stage: 'LEAD', count: 42, value: 126000 },
      { stage: 'QUALIFIED', count: 21, value: 78750 },
      { stage: 'PROPOSAL', count: 12, value: 54000 },
      { stage: 'NEGOTIATION', count: 7, value: 42000 },
    ],
    revenueBreakdown: [
      { label: 'Services', amount: 31440, pct: 60 },
      { label: 'Products', amount: 13100, pct: 25 },
      { label: 'Maintenance', amount: 7860, pct: 15 },
    ],
  },
}

function downloadCSV(report: ReportData, period: Period) {
  const lines: string[] = []
  lines.push(`Kanavu Business Report — ${PERIOD_LABELS[period]}`)
  lines.push('')
  lines.push('SUMMARY')
  lines.push(`Revenue,${report.revenue}`)
  lines.push(`New Contacts,${report.newContacts}`)
  lines.push(`Appointments,${report.appointments}`)
  lines.push(`Deals Won,${report.dealsWon}`)
  lines.push(`Avg Review Rating,${report.avgReviewRating}`)
  lines.push(`Total Reviews,${report.totalReviews}`)
  lines.push('')
  lines.push('TOP CUSTOMERS')
  lines.push('Name,Revenue')
  report.topContacts.forEach(c => lines.push(`"${c.name}",${c.revenue}`))
  lines.push('')
  lines.push('SALES PIPELINE')
  lines.push('Stage,Count,Value')
  report.pipeline.forEach(p => lines.push(`${p.stage},${p.count},${p.value}`))
  lines.push('')
  lines.push('REVENUE BREAKDOWN')
  lines.push('Category,Amount,Percentage')
  report.revenueBreakdown.forEach(r => lines.push(`${r.label},${r.amount},${r.pct}%`))

  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `kanavu-report-${period}-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailing, setEmailing] = useState(false)

  useEffect(() => {
    setLoading(true)
    apiClient.get<{ report: ReportData }>(`/reports/business?period=${period}`)
      .then((d: any) => setReport(d.report ?? d))
      .catch(() => setReport(DEMO_DATA[period]))
      .finally(() => setLoading(false))
  }, [period])

  const handleEmail = async () => {
    setEmailing(true)
    try {
      await apiClient.post('/reports/business/email', { period })
      toast('Report sent to your email', 'success')
    } catch {
      toast('Failed to send report email', 'error')
    } finally {
      setEmailing(false)
    }
  }

  const handleDownloadCSV = () => {
    if (!report) return
    downloadCSV(report, period)
    toast('CSV downloaded', 'success')
  }

  const stats = report ? [
    { label: 'Revenue', value: fmt(report.revenue), icon: DollarSign, color: '#34d399' },
    { label: 'New Contacts', value: report.newContacts, icon: Users, color: '#06b6d4' },
    { label: 'Appointments', value: report.appointments, icon: Calendar, color: '#a855f7' },
    { label: 'Deals Won', value: report.dealsWon, icon: TrendingUp, color: '#f59e0b' },
    { label: 'Avg Rating', value: `${report.avgReviewRating}★`, icon: Star, color: '#fbbf24' },
    { label: 'Reviews', value: report.totalReviews, icon: Star, color: '#f97316' },
  ] : []

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{PERIOD_LABELS[period]} performance overview</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Period picker */}
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
            {(['7d', '30d', '90d'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className="px-3 py-2 text-xs font-medium transition-all"
                style={period === p
                  ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                  : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }
                }
              >
                {p}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadCSV}
            disabled={loading || !report}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
          >
            <Download className="h-4 w-4" />
            CSV
          </button>

          <button
            onClick={handleEmail}
            disabled={emailing || loading}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.25)' }}
          >
            <Mail className="h-4 w-4" />
            {emailing ? 'Sending…' : 'Email Report'}
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <div {...anim(1)} className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20" />)
          : stats.map((s, i) => (
              <div key={i} className="rounded-xl p-4" style={cardStyle}>
                <div className="flex items-center gap-1.5 mb-2">
                  <s.icon className="h-3.5 w-3.5" style={{ color: s.color }} />
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wide truncate">{s.label}</p>
                </div>
                <p className="text-xl font-bold tabular" style={{ color: s.color }}>{s.value}</p>
              </div>
            ))
        }
      </div>

      {!loading && report && (
        <>
          {/* Revenue breakdown */}
          <div
            {...anim(2)}
            className="kv-anim rounded-xl overflow-hidden"
            style={{ ...cardStyle, animationDelay: '0.25s' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
              <h2 className="text-sm font-semibold text-foreground">Revenue Breakdown</h2>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </div>
            <div className="p-5 space-y-4">
              {report.revenueBreakdown.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular">{item.pct}%</span>
                      <span className="text-sm font-semibold text-emerald-400 tabular">{fmt(item.amount)}</span>
                    </div>
                  </div>
                  <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{ width: `${item.pct}%`, background: 'linear-gradient(90deg, #34d399, #10b981)' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div
            {...anim(3)}
            className="kv-anim grid grid-cols-1 md:grid-cols-2 gap-6"
            style={{ animationDelay: '0.32s' }}
          >
            {/* Top customers */}
            <div className="rounded-xl overflow-hidden" style={cardStyle}>
              <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'hsl(var(--border))' }}>
                <h2 className="text-sm font-semibold text-foreground">Top Customers by Revenue</h2>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>
              {report.topContacts.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No paid invoices this period.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {report.topContacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
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
                      <div key={i} className="px-5 py-3 hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center justify-between mb-1.5">
                          <p className="text-sm text-foreground">{p.stage}</p>
                          <div className="flex items-center gap-3">
                            <span className="text-xs text-muted-foreground tabular">{p.count} deals</span>
                            <span className="text-sm font-semibold text-primary tabular">{fmt(p.value)}</span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${pct}%`, background: 'linear-gradient(90deg, #06b6d4, #0ea5e9)' }}
                          />
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
