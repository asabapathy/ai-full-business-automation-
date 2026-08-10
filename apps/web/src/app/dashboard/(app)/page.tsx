'use client'

import { useEffect, useState } from 'react'
import {
  Users, DollarSign, TrendingUp, Calendar, Zap,
  Brain, ArrowRight, CheckCircle2, Clock, Sparkles
} from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '../../../components/dashboard/stat-card'
import { useAuthStore } from '../../../stores/auth.store'
import { apiClient } from '../../../lib/api-client'

interface OverviewData {
  contacts: { total: number; new30Days: number }
  pipeline: { value: number }
  revenue: { last30Days: number }
  deals: { won30Days: number }
  activeTasks: number
  upcomingAppointments: number
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

export default function DashboardPage() {
  const { user, organization } = useAuthStore()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activity, setActivity] = useState<ActivityEvent[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

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

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

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

      {/* AI Alert */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-xl border h-36 animate-pulse"
              style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }} />
          ))
        ) : (
          <>
            <div {...anim(2)}>
              <StatCard title="Revenue (30d)" value={overview?.revenue.last30Days ?? 0} format="currency"
                change={18} icon={DollarSign} iconColor="text-emerald-400"
                sparkline={DEMO_SPARKLINES.revenue} sparkColor="#10b981" />
            </div>
            <div {...anim(3)}>
              <StatCard title="Pipeline Value" value={overview?.pipeline.value ?? 0} format="currency"
                change={5} icon={TrendingUp} iconColor="text-primary"
                sparkline={DEMO_SPARKLINES.pipeline} sparkColor="#06b6d4" />
            </div>
            <div {...anim(4)}>
              <StatCard title="Total Contacts" value={overview?.contacts.total ?? 0} format="number"
                change={12} description={`+${overview?.contacts.new30Days ?? 0} this month`}
                icon={Users} iconColor="text-violet-400"
                sparkline={DEMO_SPARKLINES.contacts} sparkColor="#7c3aed" />
            </div>
            <div {...anim(5)}>
              <StatCard title="Appointments" value={overview?.upcomingAppointments ?? 0} format="number"
                description="upcoming this week" icon={Calendar} iconColor="text-amber-400"
                sparkline={DEMO_SPARKLINES.appointments} sparkColor="#f59e0b" />
            </div>
          </>
        )}
      </div>

      {/* Main 2-col layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* AI Activity feed */}
        <div {...anim(6)} className="kv-anim lg:col-span-2 rounded-xl border overflow-hidden"
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
        <div {...anim(7)} className="kv-anim rounded-xl border overflow-hidden"
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

      {/* Mini metrics row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {miniMetrics.map((m, i) => (
          <div key={m.label} {...anim(8 + i)} className="kv-anim rounded-xl border px-5 py-4"
            style={{ background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{m.label}</p>
            <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{m.value}</p>
            <p className="mt-1 text-xs" style={{ color: '#06b6d4' }}>{m.delta}</p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
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
    </div>
  )
}
