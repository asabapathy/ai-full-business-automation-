'use client'

import { useState, useEffect, useMemo } from 'react'
import { FileText, FileDown, Download, Mail, TrendingUp, Users, Calendar, Star, DollarSign, MapPin, Trophy } from 'lucide-react'
import { apiClient } from '../../../../lib/api-client'
import { toast } from '../../../../lib/toast'

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

interface TeamMember {
  name: string
  dealsWon: number
  revenue: number
  avgResponseMins: number
  jobsCompleted: number
}

type BoardMetric = 'revenue' | 'dealsWon' | 'avgResponseMins' | 'jobsCompleted'

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
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }
const fmt = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 0 })}`

const LOCATIONS = [
  { id: 'all', name: 'All Locations', color: '#06b6d4' },
  { id: 'downtown', name: 'Downtown', color: '#34d399' },
  { id: 'northside', name: 'Northside', color: '#a78bfa' },
  { id: 'westend', name: 'West End', color: '#fbbf24' },
]

// Deterministic share of totals per location
const LOCATION_SHARE: Record<string, number> = { all: 1, downtown: 0.45, northside: 0.32, westend: 0.23 }

const DEMO_TEAM: TeamMember[] = [
  { name: 'Sarah Chen', dealsWon: 14, revenue: 42300, avgResponseMins: 12, jobsCompleted: 31 },
  { name: 'Mike Rodriguez', dealsWon: 11, revenue: 38900, avgResponseMins: 25, jobsCompleted: 27 },
  { name: 'Jess Taylor', dealsWon: 9, revenue: 27400, avgResponseMins: 18, jobsCompleted: 22 },
  { name: 'Alex Kim', dealsWon: 6, revenue: 19800, avgResponseMins: 41, jobsCompleted: 15 },
]

const BOARD_METRICS: Array<{ id: BoardMetric; label: string }> = [
  { id: 'revenue', label: 'Revenue' },
  { id: 'dealsWon', label: 'Deals Won' },
  { id: 'avgResponseMins', label: 'Response Time' },
  { id: 'jobsCompleted', label: 'Jobs Done' },
]

const AVATAR_GRADIENTS = [
  'linear-gradient(135deg, #06b6d4, #60a5fa)',
  'linear-gradient(135deg, #34d399, #06b6d4)',
  'linear-gradient(135deg, #a78bfa, #f87171)',
  'linear-gradient(135deg, #fbbf24, #f87171)',
]

function avatarGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = (hash + name.charCodeAt(i)) % 997
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

function initials(name: string) {
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase()
}

const RANK_MEDALS = ['🥇', '🥈', '🥉']

function boardMetricDisplay(m: TeamMember, metric: BoardMetric): { text: string; color?: string } {
  switch (metric) {
    case 'revenue': return { text: fmt(m.revenue), color: '#34d399' }
    case 'avgResponseMins': return { text: `${m.avgResponseMins}m`, color: '#06b6d4' }
    case 'dealsWon': return { text: String(m.dealsWon) }
    case 'jobsCompleted': return { text: String(m.jobsCompleted) }
  }
}

function boardSummary(m: TeamMember, activeMetric: BoardMetric) {
  const parts: string[] = []
  if (activeMetric !== 'dealsWon') parts.push(`${m.dealsWon} deals`)
  if (activeMetric !== 'revenue') parts.push(fmt(m.revenue))
  if (activeMetric !== 'avgResponseMins') parts.push(`${m.avgResponseMins}m avg response`)
  if (activeMetric !== 'jobsCompleted') parts.push(`${m.jobsCompleted} jobs`)
  return parts.join(' · ')
}

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

const esc = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

function buildReportHTML(report: ReportData, period: Period, locationName: string): string {
  const generated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  const periodLine = locationName === 'All Locations'
    ? PERIOD_LABELS[period]
    : `${PERIOD_LABELS[period]} · ${esc(locationName)}`

  const kpis = [
    { label: 'Revenue', value: fmt(report.revenue), accent: true },
    { label: 'New Contacts', value: String(report.newContacts), accent: false },
    { label: 'Appointments', value: String(report.appointments), accent: false },
    { label: 'Deals Won', value: String(report.dealsWon), accent: false },
  ]

  const kpiTiles = kpis.map(k => `
        <div style="background:#f5f5f5;border-radius:8px;padding:16px 18px;">
          <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#999;margin-bottom:6px;">${k.label}</div>
          <div style="font-size:24px;font-weight:bold;color:${k.accent ? '#06b6d4' : '#111'};">${k.value}</div>
        </div>`).join('')

  const thStyle = 'font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#999;text-align:left;padding:8px 12px;'
  const thRightStyle = thStyle.replace('text-align:left', 'text-align:right')
  const tdStyle = 'font-size:13px;color:#333;padding:8px 12px;border-bottom:1px solid #eee;'
  const tdRightStyle = tdStyle + 'text-align:right;'

  const breakdownRows = report.revenueBreakdown.map(r => `
          <tr>
            <td style="${tdStyle}">${esc(r.label)}</td>
            <td style="${tdRightStyle}">${r.pct}%</td>
            <td style="${tdRightStyle}font-weight:bold;">${fmt(r.amount)}</td>
          </tr>`).join('')

  const breakdownSection = report.revenueBreakdown.length > 0 ? `
      <div style="margin-top:32px;">
        <h2 style="font-size:14px;font-weight:bold;color:#111;margin:0 0 10px;">Revenue Breakdown</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="${thStyle}">Category</th>
              <th style="${thRightStyle}">Share</th>
              <th style="${thRightStyle}">Amount</th>
            </tr>
          </thead>
          <tbody>${breakdownRows}
          </tbody>
        </table>
      </div>` : ''

  const customerRows = report.topContacts.map((c, i) => `
          <tr>
            <td style="${tdStyle}color:#999;width:40px;">${i + 1}</td>
            <td style="${tdStyle}">${esc(c.name)}</td>
            <td style="${tdRightStyle}font-weight:bold;">${fmt(c.revenue)}</td>
          </tr>`).join('')

  const customersSection = report.topContacts.length > 0 ? `
      <div style="margin-top:32px;">
        <h2 style="font-size:14px;font-weight:bold;color:#111;margin:0 0 10px;">Top Customers by Revenue</h2>
        <table style="width:100%;border-collapse:collapse;">
          <thead>
            <tr style="background:#f9f9f9;">
              <th style="${thStyle}">#</th>
              <th style="${thStyle}">Customer</th>
              <th style="${thRightStyle}">Revenue</th>
            </tr>
          </thead>
          <tbody>${customerRows}
          </tbody>
        </table>
      </div>` : ''

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Business Report — ${PERIOD_LABELS[period]}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif; background: #fff; color: #111; padding: 40px; }
        @media print { body { padding: 20px; } }
      </style>
    </head>
    <body>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:20px;border-bottom:2px solid #06b6d4;">
        <div>
          <div style="font-size:22px;font-weight:bold;color:#06b6d4;">Your Business</div>
          <div style="font-size:12px;color:#666;margin-top:6px;">${periodLine}</div>
          <div style="font-size:12px;color:#999;margin-top:2px;">Generated ${generated}</div>
        </div>
        <div style="font-size:28px;font-weight:300;color:#ccc;text-align:right;">Monthly Business Report</div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:28px;">${kpiTiles}
      </div>
${breakdownSection}
${customersSection}
      <div style="margin-top:40px;padding-top:14px;border-top:1px solid #eee;text-align:center;font-size:11px;color:#999;">
        Generated by Kanavu Business OS · ${generated}
      </div>
    </body>
    </html>`
}

export default function ReportsPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [location, setLocation] = useState('all')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(true)
  const [emailing, setEmailing] = useState(false)
  const [printing, setPrinting] = useState(false)
  const [team, setTeam] = useState<TeamMember[]>(DEMO_TEAM)
  const [boardMetric, setBoardMetric] = useState<BoardMetric>('revenue')

  useEffect(() => {
    apiClient.get<{ team: TeamMember[] }>('/reports/team-leaderboard')
      .then((d: any) => {
        const list = Array.isArray(d) ? d : d?.team
        if (Array.isArray(list) && list.length > 0) setTeam(list)
      })
      .catch(() => { /* keep demo data */ })
  }, [])

  useEffect(() => {
    setLoading(true)
    apiClient.get<{ report: ReportData }>(`/reports/business?period=${period}`)
      .then((d: any) => setReport(d.report ?? d))
      .catch(() => setReport(DEMO_DATA[period]))
      .finally(() => setLoading(false))
  }, [period])

  // Scale the report to the selected location's deterministic share
  const displayReport = useMemo<ReportData | null>(() => {
    if (!report || location === 'all') return report
    const f = LOCATION_SHARE[location] ?? 1
    const sc = (n: number) => Math.round(n * f)
    return {
      ...report,
      revenue: sc(report.revenue),
      newContacts: sc(report.newContacts),
      appointments: sc(report.appointments),
      dealsWon: sc(report.dealsWon),
      totalReviews: sc(report.totalReviews),
      topContacts: report.topContacts.map(c => ({ ...c, revenue: sc(c.revenue) })),
      pipeline: report.pipeline.map(p => ({ ...p, count: Math.max(1, sc(p.count)), value: sc(p.value) })),
      revenueBreakdown: report.revenueBreakdown.map(r => ({ ...r, amount: sc(r.amount) })),
    }
  }, [report, location])

  const selectedLocation = LOCATIONS.find(l => l.id === location) ?? LOCATIONS[0]

  // Leaderboard sorted by the active metric (lower is better for response time)
  const sortedTeam = useMemo(() => {
    const sorted = [...team]
    sorted.sort((a, b) => boardMetric === 'avgResponseMins'
      ? a[boardMetric] - b[boardMetric]
      : b[boardMetric] - a[boardMetric])
    return sorted
  }, [team, boardMetric])

  const boardBestValue = useMemo(() => {
    if (sortedTeam.length === 0) return 0
    return sortedTeam[0][boardMetric]
  }, [sortedTeam, boardMetric])

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
    if (!displayReport) return
    downloadCSV(displayReport, period)
    toast('CSV downloaded', 'success')
  }

  const printReport = () => {
    if (!displayReport) return
    setPrinting(true)
    try {
      const win = window.open('', '_blank', 'width=800,height=600')
      if (!win) {
        toast('Pop-up blocked — allow pop-ups to export PDF', 'error')
        return
      }
      win.document.write(buildReportHTML(displayReport, period, selectedLocation.name))
      win.document.close()
      win.print()
    } finally {
      setPrinting(false)
    }
  }

  const stats = displayReport ? [
    { label: 'Revenue', value: fmt(displayReport.revenue), icon: DollarSign, color: '#34d399' },
    { label: 'New Contacts', value: displayReport.newContacts, icon: Users, color: '#06b6d4' },
    { label: 'Appointments', value: displayReport.appointments, icon: Calendar, color: '#a855f7' },
    { label: 'Deals Won', value: displayReport.dealsWon, icon: TrendingUp, color: '#f59e0b' },
    { label: 'Avg Rating', value: `${displayReport.avgReviewRating}★`, icon: Star, color: '#fbbf24' },
    { label: 'Reviews', value: displayReport.totalReviews, icon: Star, color: '#f97316' },
  ] : []

  return (
    <div className="p-6 space-y-6 max-w-[1100px]">
      {/* Header */}
      <div {...anim(0)} className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Business Reports</h1>
          <p className="text-muted-foreground text-sm mt-0.5">{PERIOD_LABELS[period]} performance overview</p>
          {location !== 'all' && (
            <p className="text-xs mt-1 flex items-center gap-1" style={{ color: selectedLocation.color }}>
              <MapPin className="h-3 w-3" />
              Filtered to {selectedLocation.name}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Location filter */}
          <select
            value={location}
            onChange={e => setLocation(e.target.value)}
            className="px-3 py-2 rounded-lg text-xs font-medium outline-none"
            style={inputStyle}
            aria-label="Filter by location"
          >
            {LOCATIONS.map(l => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>

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
            onClick={printReport}
            disabled={printing || loading || !report}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all hover:scale-[1.02] disabled:opacity-50"
            style={{ ...cardStyle, color: 'hsl(var(--muted-foreground))' }}
          >
            <FileDown className="h-4 w-4" />
            PDF
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
          ? Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-20 rounded-lg animate-pulse" style={{ background: 'hsl(var(--muted))' }} />)
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

      {!loading && displayReport && (
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
              {displayReport.revenueBreakdown.map((item, i) => (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1.5">
                    <p className="text-sm text-foreground">{item.label}</p>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-muted-foreground tabular">{item.pct}%</span>
                      <span className="text-sm font-semibold tabular" style={{ color: '#34d399' }}>{fmt(item.amount)}</span>
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
              {displayReport.topContacts.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No paid invoices this period.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {displayReport.topContacts.map((c, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-3 hover:bg-white/[0.02] transition-colors">
                      <div className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-muted-foreground tabular w-4">{i + 1}</span>
                        <p className="text-sm text-foreground">{c.name}</p>
                      </div>
                      <p className="text-sm font-semibold tabular" style={{ color: '#34d399' }}>{fmt(c.revenue)}</p>
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
              {displayReport.pipeline.length === 0 ? (
                <p className="px-5 py-8 text-sm text-muted-foreground text-center">No active deals.</p>
              ) : (
                <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
                  {displayReport.pipeline.map((p, i) => {
                    const totalValue = displayReport.pipeline.reduce((a, x) => a + x.value, 0)
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

          {/* Team Leaderboard */}
          <div
            {...anim(4)}
            className="kv-anim rounded-xl overflow-hidden"
            style={{ ...cardStyle, animationDelay: '0.39s' }}
          >
            <div className="px-5 py-4 border-b flex items-center justify-between gap-3 flex-wrap" style={{ borderColor: 'hsl(var(--border))' }}>
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4" style={{ color: '#fbbf24' }} />
                <h2 className="text-sm font-semibold text-foreground">Team Leaderboard</h2>
              </div>
              <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid hsl(var(--border))' }}>
                {BOARD_METRICS.map(m => (
                  <button
                    key={m.id}
                    onClick={() => setBoardMetric(m.id)}
                    className="px-3 py-1.5 text-xs font-medium transition-all"
                    style={boardMetric === m.id
                      ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
                      : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))' }
                    }
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {sortedTeam.map((m, i) => {
                const display = boardMetricDisplay(m, boardMetric)
                const value = m[boardMetric]
                const barPct = boardBestValue > 0
                  ? boardMetric === 'avgResponseMins'
                    ? (value > 0 ? (boardBestValue / value) * 100 : 100)
                    : (value / boardBestValue) * 100
                  : 0
                return (
                  <div
                    key={m.name}
                    className="px-5 py-3 transition-colors"
                    style={i === 0 ? { background: 'rgba(251,191,36,0.06)' } : undefined}
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-7 text-center text-base tabular shrink-0">
                        {i < RANK_MEDALS.length
                          ? RANK_MEDALS[i]
                          : <span className="text-xs font-semibold text-muted-foreground">#{i + 1}</span>
                        }
                      </span>
                      <div
                        className="h-9 w-9 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
                        style={{ background: avatarGradient(m.name) }}
                      >
                        {initials(m.name)}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold text-foreground truncate">{m.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{boardSummary(m, boardMetric)}</p>
                      </div>
                      <p
                        className="text-lg font-bold tabular shrink-0"
                        style={display.color ? { color: display.color } : { color: 'hsl(var(--foreground))' }}
                      >
                        {display.text}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full overflow-hidden mt-2" style={{ background: 'hsl(var(--muted))' }}>
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${Math.max(0, Math.min(100, barPct))}%`, background: '#06b6d4' }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
