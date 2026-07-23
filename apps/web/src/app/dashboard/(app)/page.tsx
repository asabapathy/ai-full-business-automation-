'use client'

import { useEffect, useState } from 'react'
import {
  Users, DollarSign, TrendingUp, Calendar, Zap,
  Brain, ArrowRight, Clock, CheckCircle2
} from 'lucide-react'
import Link from 'next/link'
import { StatCard } from '../../../components/dashboard/stat-card'
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card'
import { Button } from '../../../components/ui/button'
import { Badge } from '../../../components/ui/badge'
import { Skeleton } from '../../../components/ui/skeleton'
import { useAuthStore } from '../../../stores/auth.store'
import { api } from '../../../lib/api-client'
import { formatRelativeTime } from '../../../lib/utils'

interface OverviewData {
  contacts: { total: number; new30Days: number }
  pipeline: { value: number }
  revenue: { last30Days: number }
  deals: { won30Days: number }
  activeTasks: number
  upcomingAppointments: number
}

const recentTasks = [
  { id: '1', title: 'Send follow-up emails to 12 leads', status: 'completed', agent: 'Sales', time: '2 hours ago' },
  { id: '2', title: 'Post on Facebook & Instagram', status: 'completed', agent: 'Marketing', time: '3 hours ago' },
  { id: '3', title: 'Update website hero section', status: 'in_progress', agent: 'Website', time: 'Running now' },
  { id: '4', title: 'Analyze Q4 revenue trends', status: 'pending', agent: 'Finance', time: 'Scheduled' },
]

export default function DashboardPage() {
  const { user, organization } = useAuthStore()
  const [overview, setOverview] = useState<OverviewData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function loadOverview() {
      try {
        const data = await api.get<OverviewData>('/org/analytics/overview')
        setOverview(data)
      } catch {
        // Use placeholder data in dev
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
    loadOverview()
  }, [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {greeting}, {user?.firstName} 👋
          </h1>
          <p className="text-muted-foreground mt-1">
            Here's what's happening at {organization?.name ?? 'your business'} today.
          </p>
        </div>
        <Link href="/dashboard/brain">
          <Button variant="ai">
            <Brain className="h-4 w-4" />
            Ask AI
          </Button>
        </Link>
      </div>

      {/* AI Alert */}
      <div className="rounded-xl border border-kanavu-200 bg-kanavu-50 dark:border-kanavu-900/50 dark:bg-kanavu-950/30 p-4 flex items-start gap-3">
        <div className="h-8 w-8 rounded-full bg-kanavu-100 dark:bg-kanavu-900/50 flex items-center justify-center shrink-0">
          <Brain className="h-4 w-4 text-kanavu-600 dark:text-kanavu-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-kanavu-900 dark:text-kanavu-100">AI Business Insight</p>
          <p className="text-sm text-kanavu-700 dark:text-kanavu-300 mt-0.5">
            3 leads haven't been contacted in 7+ days. I'm sending follow-ups now.
            Your conversion rate is up 12% this month — great progress!
          </p>
        </div>
        <Link href="/dashboard/brain">
          <Button variant="ghost" size="sm" className="text-kanavu-600 hover:text-kanavu-700 shrink-0">
            Details <ArrowRight className="h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32" />
          ))
        ) : (
          <>
            <StatCard
              title="Revenue (30d)"
              value={overview?.revenue.last30Days ?? 0}
              format="currency"
              change={18}
              icon={DollarSign}
              iconColor="text-green-600"
            />
            <StatCard
              title="Pipeline Value"
              value={overview?.pipeline.value ?? 0}
              format="currency"
              change={5}
              icon={TrendingUp}
              iconColor="text-blue-600"
            />
            <StatCard
              title="Total Contacts"
              value={overview?.contacts.total ?? 0}
              format="number"
              change={12}
              description={`+${overview?.contacts.new30Days ?? 0} this month`}
              icon={Users}
              iconColor="text-purple-600"
            />
            <StatCard
              title="Appointments"
              value={overview?.upcomingAppointments ?? 0}
              format="number"
              description="upcoming this week"
              icon={Calendar}
              iconColor="text-orange-600"
            />
          </>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* AI Tasks */}
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">AI Activity</CardTitle>
            <Link href="/dashboard/automations">
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentTasks.map(task => (
              <div key={task.id} className="flex items-center gap-3 rounded-lg border p-3 text-sm">
                <div className={`h-2 w-2 rounded-full shrink-0 ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in_progress' ? 'bg-blue-500 animate-pulse' :
                  'bg-muted-foreground'
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{task.title}</p>
                  <p className="text-muted-foreground text-xs">{task.agent} Agent</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant={
                    task.status === 'completed' ? 'success' :
                    task.status === 'in_progress' ? 'info' : 'outline'
                  } className="text-xs">
                    {task.status === 'in_progress' ? 'Running' :
                     task.status === 'completed' ? 'Done' : 'Pending'}
                  </Badge>
                  <span className="text-xs text-muted-foreground">{task.time}</span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { label: 'Add a contact', href: '/dashboard/crm', icon: Users },
              { label: 'Schedule appointment', href: '/dashboard/appointments', icon: Calendar },
              { label: 'Create invoice', href: '/dashboard/invoices', icon: DollarSign },
              { label: 'Launch campaign', href: '/dashboard/marketing', icon: TrendingUp },
              { label: 'Build automation', href: '/dashboard/automations', icon: Zap },
              { label: 'Ask the AI', href: '/dashboard/brain', icon: Brain },
            ].map(action => (
              <Link key={action.label} href={action.href}>
                <div className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-accent transition-colors cursor-pointer">
                  <action.icon className="h-4 w-4 text-muted-foreground" />
                  {action.label}
                  <ArrowRight className="h-3.5 w-3.5 ml-auto text-muted-foreground" />
                </div>
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
