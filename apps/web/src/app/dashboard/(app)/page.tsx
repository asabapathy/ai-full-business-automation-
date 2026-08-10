'use client'

import { useEffect, useState } from 'react'
import {
  Users, DollarSign, TrendingUp, Calendar, Zap,
  Brain, ArrowRight, CheckCircle2, Clock, Sparkles, ChevronDown, Pencil, Target, X, Settings2
} from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '../../../components/dashboard/stat-card'
import { useAuthStore } from '../../../stores/auth.store'
import { apiClient } from '../../../lib/api-client'
import { toast } from '../../../lib/toast'

interface OverviewData {
  contacts: { total: number; new30Days: number }
  pipeline: { value: number }
  revenue: { last30Days: number }
  deals: { won30Days: number }
  activeTasks: number
  upcomingAppointments: number
}

interface Goals {
  revenue: number
  leads: number
  appointments: number
}

interface ActivityEvent {
  id: string
  type: 'contact_added' | 'invoice_paid' | 'invoice_sent' | 'campaign_sent' | 'appointment_booked' | 'review_received' | 'payment_received'
  title: string
  description: string
  amount?: number
  createdAt: string
}

const DEMO_SPARKLINES = {
  revenue: [18200, 21000, 19400, 23100, 22500, 24000, 24800],
  pipeline: [72000, 79000, 84000, 81500, 87000, 88200, 89500],
  contacts: [189, 201, 215, 221, 233, 240, 247],
  appointments: [3, 5, 4, 6, 5, 4, 5],
}

const DEMO_ACTIVITY: ActivityEvent[] = [
  { id: '1', type: 'invoice_paid', title: 'Invoice paid', description: 'INV-042 paid by Meridian Tech', amount: 3200, createdAt: new Date(Date.now() - 300000).toISOString() },
  { id: '2', type: 'contact_added', title: 'New contact', description: 'Sarah Chen added via website form', createdAt: new Date(Date.now() - 900000).toISOString() },
  { id: '3', type: 'appointment_booked', title: 'Appointment booked', description: 'HVAC maintenance with Johnson Property', createdAt: new Date(Date.now() - 1800000).toISOString() },
  { id: '4', type: 'campaign_sent', title: 'Campaign sent', description: 'Summer Promo email to 234 contacts', createdAt: new Date(Date.now() - 3600000).toISOString() },
  { id: '5', type: 'review_received', title: 'New 5-star review', description: 'Great service from Michael Torres', createdAt: new Date(Date.now() - 7200000).toISOString() },
  { id: '6', type: 'invoice_sent', title: 'Invoice sent', description: 'INV-043 sent to Pacific Realty ($1,800)', amount: 1800, createdAt: new Date(Date.now() - 14400000).toISOString() },
  { id: '7', type: 'payment_received', title: 'Payment received', description: 'Deposit from Sunrise Cafe', amount: 500, createdAt: new Date(Date.now() - 86400000).toISOString() },
]

const recentTasks = [
  { id: '1', title: 'Send follow-up emails to 12 leads', status: 'completed', agent: 'Sales Agent', time: '2h ago' },
  { id: '2', title: 'Post on Facebook & Instagram', status: 'completed', agent: 'Marketing Agent', time: '3h ago' },
  { id: '3', title: 'Update website hero section copy', status: 'in_progress', agent: 'Website Agent', time: 'Running' },
  { id: '4', title: 'Analyze Q4 revenue trends', status: 'pending', agent: 'Finance Agent', time: 'Scheduled' },
  { id: '5', title: 'Follow up on overdue invoices', status: 'pending', agent: 'Sales Agent', time: 'Queued' },
]

const quickActions = [
  { label: 'Add contact', href: '/dashboard/crm', icon: Users },
  { label: 'Schedule appointment', href: '/dashboard/appointments', icon: Calendar },
  { label: 'Create invoice', href: '/dashboard/invoices', icon: DollarSign },
  { label: 'Launch campaign', href: '/dashboard/marketing', icon: TrendingUp },
  { label: 'Build automation', href: '/dashboard/automations', icon: Zap },
  { label: 'Ask the AI', href: '/dashboard/brain', icon: Brain, highlight: true },
]

const miniMetrics = [
  { label: 'Deals won (30d)', value: '8', delta: '+3 vs prior' },
  { label: 'Active tasks', value: '12', delta: '4 running now' },
  { label: 'Avg response time', value: '4m', delta: '↓ 22% faster' },
]

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

const TASK_STATUS_STYLES: Record<string, { color: string; bg: string; label: string }> = {
  completed:   { color: '#34d399', bg: 'rgba(52,211,153,0.12)', label: 'Done' },
  in_progress: { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)', label: 'Running' },
  pending:     { color: '#94a3b8', bg: 'rgba(148,163,184,0.12)', label: 'Pending' },
}

const EVENT_STYLE: Record<string, { color: string; bg: string; icon: string }> = {
  invoice_paid:       { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: '💳' },
  payment_received:   { color: '#34d399', bg: 'rgba(52,211,153,0.12)',  icon: '💰' },
  contact_added:      { color: '#06b6d4', bg: 'rgba(6,182,212,0.12)',   icon: '👤' },
  appointment_booked: { color: '#a78bfa', bg: 'rgba(167,139,250,0.12)', icon: '📅' },
  campaign_sent:      { color: '#fbbf24', bg: 'rgba(251,191,36,0.12)',  icon: '📢' },
  invoice_sent:       { color: '#60a5fa', bg: 'rgba(96,165,250,0.12)',  icon: '📄' },
  review_received:    { color: '#f87171', bg: 'rgba(248,113,113,0.12)', icon: '⭐' },
}

const RANGES = [
  { key: '7d', label: 'Last 7 days', days: 7 },
  { key: '30d', label: 'Last 30 days', days: 30 },
  { key: '90d', label: 'Last 90 days', days: 90 },
  { key: 'ytd', label: 'Year to date', days: 0 },
  { key: 'custom', label: 'Custom', days: -1 },
] as const

const DATE_RANGE_STORAGE_KEY = 'kv-date-range'
const GOALS_STORAGE_KEY = 'kv-goals'
const WIDGETS_STORAGE_KEY = 'kv-dashboard-widgets'
const DEFAULT_GOALS: Goals = { revenue: 25000, leads: 40, appointments: 30 }

const WIDGETS = [
  { key: 'insight', label: 'AI insight' },
  { key: 'stats', label: 'Key metrics' },
  { key: 'goals', label: 'Monthly goals' },
  { key: 'ai', label: 'AI activity & quick actions' },
  { key: 'mini', label: 'Mini metrics' },
  { key: 'activity', label: 'Recent activity' },
] as const

const cardStyle = { background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }
const inputCls = 'w-full rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50'
const inputStyle = { background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))' }

function Toggle({ enabled, onChange }: { enabled: boolean; onChange: () => void }) {
  return (
    <div
      onClick={onChange}
      className="relative cursor-pointer w-10 h-6 rounded-full transition-all shrink-0"
      style={enabled
        ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }
        : { background: 'rgba(255,255,255,0.1)' }
      }
    >
      <div className={`absolute top-1 w-4 h-4 rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-1'}`} style={{ background: 'white' }} />
    </div>
  )
}

function ProgressRing({ pct, color, size = 96 }: { pct: number; color: string; size?: number }) {
  const r = (size - 10) / 2
  const c = 2 * Math.PI * r
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="8"
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - clamped / 100)}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} />
    </svg>
  )
}

function resolveRange(range: string, customFrom: string, customTo: string) {
  const now = new Date()
  if (range === 'ytd') {
    const fromDate = new Date(now.getFullYear(), 0, 1)
    return { fromDate, toDate: now, days: Math.max(1, Math.round((now.getTime() - fromDate.getTime()) / 86400000)) }
  }
  if (range === 'custom' && customFrom && customTo) {
    const fromDate = new Date(customFrom)
    const toDate = new Date(customTo)
    if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime()) && toDate >= fromDate) {
      return { fromDate, toDate, days: Math.max(1, Math.round((toDate.getTime() - fromDate.getTime()) / 86400000)) }
    }
  }
  const preset = RANGES.find(r => r.key === range)
  const days = preset && preset.days > 0 ? preset.days : 30
  return { fromDate: new Date(now.getTime() - days * 86400000), toDate: now, days }
}

function useDateRange() {
  const [range, setRange] = useState<string>('30d')
  const [customFrom, setCustomFrom] = useState('')
  const [customTo, setCustomTo] = useState('')
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(DATE_RANGE_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as { range?: string; customFrom?: string; customTo?: string }
        if (typeof saved.range === 'string' && RANGES.some(r => r.key === saved.range)) setRange(saved.range)
        if (typeof saved.customFrom === 'string') setCustomFrom(saved.customFrom)
        if (typeof saved.customTo === 'string') setCustomTo(saved.customTo)
      }
    } catch { /* ignore corrupt storage */ }
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    try {
      localStorage.setItem(DATE_RANGE_STORAGE_KEY, JSON.stringify({ range, customFrom, customTo }))
    } catch { /* storage unavailable */ }
  }, [hydrated, range, customFrom, customTo])

  return { range, setRange, customFrom, setCustomFrom, customTo, setCustomTo }
}

function DateRangePicker({
  range, customFrom, customTo, onChange,
}: {
  range: string
  customFrom: string
  customTo: string
  onChange: (next: { range: string; customFrom: string; customTo: string }) => void
}) {
  const [open, setOpen] = useState(false)
  const [draftFrom, setDraftFrom] = useState(customFrom)
  const [draftTo, setDraftTo] = useState(customTo)
  const active = RANGES.find(r => r.key === range) ?? RANGES[1]
  const label = range === 'custom' && customFrom && customTo ? `${customFrom} → ${customTo}` : active.label

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => { setDraftFrom(customFrom); setDraftTo(customTo); setOpen(o => !o) }}
        className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
        style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
      >
        <Calendar className="h-4 w-4" style={{ color: '#06b6d4' }} />
        <span className="whitespace-nowrap">{label}</span>
        <ChevronDown className="h-3.5 w-3.5" style={{ color: 'hsl(var(--muted-foreground))' }} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div
            className="absolute right-0 top-full mt-2 z-40 w-60 rounded-xl p-1.5"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
          >
            {RANGES.map(r => (
              <button
                key={r.key}
                onClick={() => {
                  if (r.key === 'custom') {
                    onChange({ range: 'custom', customFrom, customTo })
                  } else {
                    onChange({ range: r.key, customFrom, customTo })
                    setOpen(false)
                  }
                }}
                className="w-full text-left rounded-lg px-3 py-2 text-sm transition-colors"
                style={range === r.key
                  ? { background: 'rgba(6,182,212,0.1)', color: '#06b6d4', fontWeight: 600 }
                  : { color: 'hsl(var(--foreground))' }}
              >
                {r.label}
              </button>
            ))}
            {range === 'custom' && (
              <div className="mt-1 space-y-2 border-t px-3 py-3" style={{ borderColor: 'hsl(var(--border))' }}>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>From</span>
                  <input
                    type="date" value={draftFrom} onChange={e => setDraftFrom(e.target.value)}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  />
                </label>
                <label className="block">
                  <span className="text-[11px] uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>To</span>
                  <input
                    type="date" value={draftTo} onChange={e => setDraftTo(e.target.value)}
                    className="mt-1 w-full rounded-lg px-2 py-1.5 text-sm"
                    style={{ background: 'hsl(var(--background))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--foreground))' }}
                  />
                </label>
                <button
                  onClick={() => { onChange({ range: 'custom', customFrom: draftFrom, customTo: draftTo }); setOpen(false) }}
                  disabled={!draftFrom || !draftTo}
                  className="w-full rounded-lg px-3 py-1.5 text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
                >
                  Apply
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const { user, organization } = useAuthStore()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(true)
  const { range, setRange, customFrom, setCustomFrom, customTo, setCustomTo } = useDateRange()
  const [goals, setGoals] = useState<Goals>(DEFAULT_GOALS)
  const [goalsOpen, setGoalsOpen] = useState(false)
  const [goalsDraft, setGoalsDraft] = useState<Goals>(DEFAULT_GOALS)
  const [goalsHydrated, setGoalsHydrated] = useState(false)
  const [visibleWidgets, setVisibleWidgets] = useState<Record<string, boolean>>({})
  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [widgetsHydrated, setWidgetsHydrated] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const data = await apiClient.get<OverviewData>('/org/analytics/overview')
        setOverview(data)
      } catch {
        setOverview({
          contacts: { total: 247, new30Days: 34 },
          pipeline: { value: 89500 },
          revenue: { last30Days: 24800 },
          deals: { won30Days: 8 },
          activeTasks: 12,
          upcomingAppointments: 5,
        })
      } finally {
        setIsLoading(false)
      }
    }

    async function loadActivity() {
      try {
        const res = await apiClient.get<{ events: ActivityEvent[] }>('/activity-feed?limit=20')
        setActivity(res.events ?? [])
      } catch {
        setActivity(DEMO_ACTIVITY)
      } finally {
        setActivityLoading(false)
      }
    }

    load()
    loadActivity()

    const refreshInterval = setInterval(() => {
      load()
      loadActivity()
    }, 30000)
    return () => clearInterval(refreshInterval)
  }, [])

  // Monthly goals: hydrate from localStorage, then try the API (silent fallback).
  useEffect(() => {
    try {
      const raw = localStorage.getItem(GOALS_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Partial<Goals>
        if (typeof saved.revenue === 'number' && typeof saved.leads === 'number' && typeof saved.appointments === 'number') {
          setGoals({ revenue: saved.revenue, leads: saved.leads, appointments: saved.appointments })
        }
      }
    } catch { /* ignore corrupt storage */ }
    setGoalsHydrated(true)
    apiClient.get<Goals>('/goals')
      .then(g => {
        if (g && typeof g.revenue === 'number' && typeof g.leads === 'number' && typeof g.appointments === 'number') {
          setGoals({ revenue: g.revenue, leads: g.leads, appointments: g.appointments })
        }
      })
      .catch(() => { /* endpoint optional */ })
  }, [])

  useEffect(() => {
    if (!goalsHydrated) return
    try {
      localStorage.setItem(GOALS_STORAGE_KEY, JSON.stringify(goals))
    } catch { /* storage unavailable */ }
  }, [goalsHydrated, goals])

  // Widget visibility: hydrate from localStorage (guarded so defaults don't clobber), then persist changes.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(WIDGETS_STORAGE_KEY)
      if (raw) {
        const saved = JSON.parse(raw) as Record<string, boolean>
        if (saved && typeof saved === 'object' && !Array.isArray(saved)) {
          setVisibleWidgets(saved)
        }
      }
    } catch { /* ignore corrupt storage */ }
    setWidgetsHydrated(true)
  }, [])

  useEffect(() => {
    if (!widgetsHydrated) return
    try {
      localStorage.setItem(WIDGETS_STORAGE_KEY, JSON.stringify(visibleWidgets))
    } catch { /* storage unavailable */ }
  }, [widgetsHydrated, visibleWidgets])

  const show = (key: string) => visibleWidgets[key] !== false
  const allHidden = WIDGETS.every(w => !show(w.key))

  function saveGoals() {
    const next: Goals = {
      revenue: Math.max(0, goalsDraft.revenue || 0),
      leads: Math.max(0, goalsDraft.leads || 0),
      appointments: Math.max(0, goalsDraft.appointments || 0),
    }
    setGoals(next)
    apiClient.put('/goals', next).catch(() => { /* endpoint optional */ })
    setGoalsOpen(false)
    toast('Goals updated', 'success')
  }

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  // Date-range: deterministic client-side scale for metric cards (demo) — activity feed is NOT scaled.
  const { days } = resolveRange(range, customFrom, customTo)
  const metricScale = Math.min(3, Math.max(0.25, days / 30))
  const scaleMetric = (n: number) => Math.round(n * metricScale)
  const activeRange = RANGES.find(r => r.key === range) ?? RANGES[1]
  const rangeLabel = range === 'custom' && customFrom && customTo ? `${customFrom} → ${customTo}` : activeRange.label

  // Monthly goals progress — always month-to-date, independent of the date-range picker.
  const today = new Date()
  const monthName = today.toLocaleString('en-US', { month: 'long' })
  const dayOfMonth = today.getDate()
  const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate()
  const daysLeft = daysInMonth - dayOfMonth
  const expectedPct = (dayOfMonth / daysInMonth) * 100
  const goalProgress = [
    { key: 'revenue', label: 'Revenue', color: '#06b6d4', current: overview?.revenue.last30Days ?? 16420, target: goals.revenue, currency: true },
    { key: 'leads', label: 'Leads', color: '#a78bfa', current: overview?.contacts.new30Days ?? 27, target: goals.leads, currency: false },
    { key: 'appointments', label: 'Appointments', color: '#34d399', current: overview?.upcomingAppointments ?? 19, target: goals.appointments, currency: false },
  ].map(g => ({ ...g, pct: g.target > 0 ? (g.current / g.target) * 100 : 0 }))
  const avgGoalPct = goalProgress.reduce((sum, g) => sum + Math.min(100, g.pct), 0) / goalProgress.length
  const onPace = avgGoalPct >= expectedPct

  return (
    <div className="p-4 sm:p-6 space-y-6 max-w-[1400px]">
      {/* Greeting */}
      <div {...anim(0)} className="kv-anim flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground leading-tight">
            {greeting}, {user?.firstName}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Here&apos;s what&apos;s happening at{' '}
            <span className="text-foreground/80 font-medium">{organization?.name ?? 'your business'}</span> today.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Showing: <span className="font-medium" style={{ color: '#06b6d4' }}>{rangeLabel}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <DateRangePicker
            range={range}
            customFrom={customFrom}
            customTo={customTo}
            onChange={next => { setRange(next.range); setCustomFrom(next.customFrom); setCustomTo(next.customTo) }}
          />
          <div className="relative shrink-0">
            <button
              onClick={() => setCustomizeOpen(o => !o)}
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', color: 'hsl(var(--muted-foreground))' }}
              aria-label="Customize dashboard widgets"
            >
              <Settings2 className="h-4 w-4" />
              <span className="whitespace-nowrap hidden sm:inline">Customize</span>
            </button>
            {customizeOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setCustomizeOpen(false)} />
                <div
                  className="absolute right-0 top-full mt-2 z-40 w-64 rounded-xl p-3"
                  style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', boxShadow: '0 12px 32px rgba(0,0,0,0.35)' }}
                >
                  <p className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: 'hsl(var(--muted-foreground))' }}>
                    Dashboard widgets
                  </p>
                  <div className="space-y-1">
                    {WIDGETS.map(w => (
                      <div key={w.key} className="flex items-center justify-between gap-3 rounded-lg px-1 py-1.5">
                        <span className="text-sm text-foreground/80">{w.label}</span>
                        <Toggle
                          enabled={show(w.key)}
                          onChange={() => setVisibleWidgets(v => ({ ...v, [w.key]: !show(w.key) }))}
                        />
                      </div>
                    ))}
                  </div>
                  <button
                    onClick={() => setVisibleWidgets({})}
                    className="mt-2 w-full rounded-lg px-2 py-1.5 text-left text-xs text-muted-foreground hover:text-foreground transition-colors"
                    style={{ borderTop: '1px solid hsl(var(--border))' }}
                  >
                    Reset — show all widgets
                  </button>
                </div>
              </>
            )}
          </div>
          <Link href="/dashboard/brain">
            <button
              className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98] shrink-0"
              style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0ea5e9 100%)', boxShadow: '0 0 20px rgba(6,182,212,0.35)' }}
            >
              <Brain className="h-4 w-4" />
              Ask AI
            </button>
          </Link>
        </div>
      </div>

      {/* All widgets hidden */}
      {allHidden && (
        <div className="rounded-xl p-8 text-center" style={cardStyle}>
          <Settings2 className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-3 text-sm text-muted-foreground">
            All widgets hidden — click <span className="font-medium" style={{ color: '#06b6d4' }}>Customize</span> to bring them back.
          </p>
        </div>
      )}

      {/* AI Alert */}
      {show('insight') && (
      <div
        {...anim(1)}
        className="kv-anim kv-glow-pulse relative overflow-hidden rounded-xl border p-4 flex items-start gap-3"
        style={{
          background: 'linear-gradient(135deg, rgba(6,182,212,0.08) 0%, rgba(14,165,233,0.04) 100%)',
          borderColor: 'rgba(6,182,212,0.25)',
        }}
      >
        <div className="pointer-events-none absolute inset-0 kv-shimmer" style={{ mixBlendMode: 'screen' }} />
        <div
          className="flex h-8 w-8 items-center justify-center rounded-full shrink-0"
          style={{ background: 'rgba(6,182,212,0.15)', boxShadow: '0 0 12px rgba(6,182,212,0.2)' }}
        >
          <Sparkles className="h-4 w-4" style={{ color: '#06b6d4' }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">AI Business Insight</p>
          <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed">
            3 leads haven&apos;t been contacted in 7+ days — I&apos;m sending follow-ups now.
            Your conversion rate is <span className="font-medium" style={{ color: '#34d399' }}>up 12%</span> this month.
          </p>
        </div>
        <Link href="/dashboard/brain" className="shrink-0">
          <button className="flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={{ border: '1px solid rgba(6,182,212,0.25)', background: 'rgba(6,182,212,0.1)', color: '#06b6d4' }}>
            Details <ArrowRight className="h-3 w-3" />
          </button>
        </Link>
      </div>
      )}

      {/* Stat cards */}
      {show('stats') && (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border h-36 animate-pulse"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
          ))
        ) : (
          <>
            <div {...anim(2)}>
              <StatCard title="Revenue" value={scaleMetric(overview?.revenue.last30Days ?? 0)} format="currency"
                change={18} icon={DollarSign} iconColor="text-emerald-400"
                sparkline={DEMO_SPARKLINES.revenue} sparkColor="#10b981" />
            </div>
            <div {...anim(3)}>
              <StatCard title="Pipeline Value" value={scaleMetric(overview?.pipeline.value ?? 0)} format="currency"
                change={5} icon={TrendingUp} iconColor="text-primary"
                sparkline={DEMO_SPARKLINES.pipeline} sparkColor="#06b6d4" />
            </div>
            <div {...anim(4)}>
              <StatCard title="Total Contacts" value={scaleMetric(overview?.contacts.total ?? 0)} format="number"
                change={12} description={`+${scaleMetric(overview?.contacts.new30Days ?? 0)} this period`}
                icon={Users} iconColor="text-violet-400"
                sparkline={DEMO_SPARKLINES.contacts} sparkColor="#7c3aed" />
            </div>
            <div {...anim(5)}>
              <StatCard title="Appointments" value={scaleMetric(overview?.upcomingAppointments ?? 0)} format="number"
                description="upcoming this week" icon={Calendar} iconColor="text-amber-400"
                sparkline={DEMO_SPARKLINES.appointments} sparkColor="#f59e0b" />
            </div>
          </>
        )}
      </div>
      )}

      {/* Monthly Goals */}
      {show('goals') && (
      <div {...anim(6)} className="kv-anim rounded-xl p-5" style={cardStyle}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4" style={{ color: '#06b6d4' }} />
            <h2 className="text-sm font-semibold text-foreground">Monthly Goals</h2>
            <span className="text-xs text-muted-foreground">{monthName}</span>
          </div>
          <button
            onClick={() => { setGoalsDraft(goals); setGoalsOpen(true) }}
            className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/40 transition-colors"
            aria-label="Edit goals"
          >
            <Pencil className="h-4 w-4" />
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {goalProgress.map(g => {
            const fmt = (n: number) => (g.currency ? `$${Math.round(n).toLocaleString()}` : Math.round(n).toLocaleString())
            return (
              <div key={g.key} className="flex flex-col items-center py-2">
                <div className="relative">
                  <ProgressRing pct={g.pct} color={g.color} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-lg font-bold text-foreground tabular-nums leading-none">{Math.round(g.pct)}%</span>
                    <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{g.label}</span>
                  </div>
                </div>
                <p className="mt-2 text-xs text-muted-foreground tabular-nums">{fmt(g.current)} / {fmt(g.target)}</p>
                {g.pct >= 100 && (
                  <p className="mt-1 text-xs font-medium" style={{ color: '#34d399' }}>🎉 Goal reached!</p>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: 'hsl(var(--border))' }}>
          <p className="text-xs text-muted-foreground">
            {daysLeft} day{daysLeft === 1 ? '' : 's'} left in {monthName}
          </p>
          <span className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
            style={onPace
              ? { color: '#34d399', background: 'rgba(52,211,153,0.12)' }
              : { color: '#fbbf24', background: 'rgba(251,191,36,0.12)' }}>
            {onPace ? 'On pace' : 'Behind pace'}
          </span>
        </div>
      </div>
      )}

      {/* Main 2-col layout */}
      {show('ai') && (
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Activity feed */}
        <div {...anim(7)} className="kv-anim lg:col-span-2 rounded-xl border overflow-hidden"
          style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-foreground">AI Activity</h2>
              <span className="rounded-full px-2 py-0.5 text-[10px] font-bold"
                style={{ background: 'rgba(6,182,212,0.15)', color: '#06b6d4' }}>
                {recentTasks.filter(t => t.status === 'in_progress').length} running
              </span>
            </div>
            <Link href="/dashboard/automations">
              <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                View all <ArrowRight className="h-3 w-3" />
              </button>
            </Link>
          </div>
          <div>
            {recentTasks.map((task, i) => {
              const s = TASK_STATUS_STYLES[task.status] ?? TASK_STATUS_STYLES.pending
              return (
                <div key={task.id}
                  className="flex items-center gap-3 px-5 py-3.5 hover:bg-muted/30 transition-colors"
                  style={{ borderBottom: i < recentTasks.length - 1 ? '1px solid hsl(var(--border))' : undefined }}>
                  <div className="shrink-0">
                    {task.status === 'completed'
                      ? <CheckCircle2 className="h-4 w-4" style={{ color: '#34d399' }} />
                      : task.status === 'in_progress'
                      ? <div className="h-2.5 w-2.5 rounded-full kv-dot-live" style={{ background: '#06b6d4' }} />
                      : <Clock className="h-4 w-4 text-muted-foreground opacity-40" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{task.title}</p>
                    <p className="text-xs text-muted-foreground">{task.agent}</p>
                  </div>
                  <div className="shrink-0 flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                      style={{ color: s.color, background: s.bg }}>
                      {s.label}
                    </span>
                    <span className="text-[11px] text-muted-foreground tabular-nums">{task.time}</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Quick actions */}
        <div {...anim(8)} className="kv-anim rounded-xl border overflow-hidden"
          style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
          <div className="px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
            <h2 className="text-sm font-semibold text-foreground">Quick Actions</h2>
          </div>
          <div className="p-2">
            {quickActions.map(action => (
              <Link key={action.label} href={action.href}>
                <div className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-all duration-150 cursor-pointer group ${action.highlight ? '' : 'hover:bg-muted/40'}`}
                  style={action.highlight ? { background: 'rgba(6,182,212,0.1)' } : undefined}>
                  <action.icon className="h-4 w-4 shrink-0"
                    style={action.highlight ? { color: '#06b6d4' } : undefined}
                    {...(!action.highlight ? { className: 'h-4 w-4 shrink-0 text-muted-foreground group-hover:text-foreground' } : {})} />
                  <span className={action.highlight ? 'font-medium' : 'text-foreground/80 group-hover:text-foreground'}
                    style={action.highlight ? { color: '#06b6d4' } : undefined}>
                    {action.label}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground/40 group-hover:text-muted-foreground" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
      )}

      {/* Mini metrics row */}
      {show('mini') && (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {miniMetrics.map((m, i) => (
          <div key={m.label} {...anim(9 + i)} className="kv-anim rounded-xl border px-5 py-4"
            style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
            <p className="mt-1 text-xs" style={{ color: '#06b6d4' }}>{m.delta}</p>
          </div>
        ))}
      </div>
      )}

      {/* Recent Activity */}
      {show('activity') && (
      <div className="kv-anim" style={{ animationDelay: '0.45s' }}>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Recent Activity</h2>
          <span className="text-xs text-muted-foreground">Auto-refreshes every 30s</span>
        </div>
        <div className="rounded-xl overflow-hidden" style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}>
          {activityLoading ? (
            <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-4">
                  <div className="h-9 w-9 rounded-full animate-pulse shrink-0" style={{ background: 'hsl(var(--muted))' }} />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 w-32 rounded animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                    <div className="h-3 w-48 rounded animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                  </div>
                  <div className="h-3 w-16 rounded animate-pulse" style={{ background: 'hsl(var(--muted))' }} />
                </div>
              ))}
            </div>
          ) : activity.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">No recent activity</div>
          ) : (
            <div>
              {activity.map((event, i) => {
                const style = EVENT_STYLE[event.type] ?? EVENT_STYLE.contact_added
                const ago = (() => {
                  const diff = Date.now() - new Date(event.createdAt).getTime()
                  if (diff < 60000) return 'just now'
                  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
                  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
                  return `${Math.floor(diff / 86400000)}d ago`
                })()
                return (
                  <div key={event.id}
                    className="flex items-center gap-3 p-4 transition-colors hover:bg-muted/30"
                    style={i < activity.length - 1 ? { borderBottom: '1px solid hsl(var(--border))' } : undefined}>
                    <div className="h-9 w-9 rounded-full flex items-center justify-center text-base shrink-0"
                      style={{ background: style.bg }}>
                      {style.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{event.title}</p>
                      <p className="text-xs text-muted-foreground truncate">{event.description}</p>
                    </div>
                    <div className="text-right shrink-0">
                      {event.amount != null && (
                        <p className="text-sm font-semibold" style={{ color: style.color }}>
                          ${event.amount.toLocaleString()}
                        </p>
                      )}
                      <p className="text-xs text-muted-foreground">{ago}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
      )}

      {/* Edit goals modal */}
      {goalsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}>
          <div className="w-full max-w-sm rounded-2xl p-6 space-y-5" style={cardStyle}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-foreground">Edit Monthly Goals</h2>
              <button onClick={() => setGoalsOpen(false)}
                className="p-1 text-muted-foreground hover:text-foreground transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Revenue ($)</label>
                <input type="number" min={0} className={inputCls} style={inputStyle}
                  value={goalsDraft.revenue}
                  onChange={e => setGoalsDraft(d => ({ ...d, revenue: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Leads</label>
                <input type="number" min={0} className={inputCls} style={inputStyle}
                  value={goalsDraft.leads}
                  onChange={e => setGoalsDraft(d => ({ ...d, leads: Number(e.target.value) }))} />
              </div>
              <div>
                <label className="block text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1.5">Appointments</label>
                <input type="number" min={0} className={inputCls} style={inputStyle}
                  value={goalsDraft.appointments}
                  onChange={e => setGoalsDraft(d => ({ ...d, appointments: Number(e.target.value) }))} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button onClick={() => setGoalsOpen(false)}
                className="rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                style={{ border: '1px solid hsl(var(--border))' }}>
                Cancel
              </button>
              <button onClick={saveGoals}
                className="rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all hover:scale-[1.02] active:scale-[0.98]"
                style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}>
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
