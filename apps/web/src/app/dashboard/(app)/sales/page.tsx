'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, DollarSign, Target, CheckCircle, ChevronRight, Zap } from 'lucide-react'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'

interface Deal {
  id: string
  title: string
  value?: number
  stage: string
  contact?: { firstName: string; lastName?: string }
  company?: { name: string }
  updatedAt: string
}

interface PipelineStage {
  stage: string
  _count: number
  _sum: { value: number | null }
}

interface Analytics {
  pipeline: PipelineStage[]
  wonRevenue: number
  wonDeals: number
  conversionRate: number
}

const STAGE_COLORS: Record<string, { bg: string; text: string }> = {
  NEW:           { bg: 'rgba(6,182,212,0.12)',   text: '#06b6d4' },
  CONTACTED:     { bg: 'rgba(139,92,246,0.12)',  text: '#a78bfa' },
  QUALIFIED:     { bg: 'rgba(245,158,11,0.12)',  text: '#fbbf24' },
  PROPOSAL_SENT: { bg: 'rgba(249,115,22,0.12)',  text: '#fb923c' },
  NEGOTIATION:   { bg: 'rgba(236,72,153,0.12)',  text: '#f472b6' },
  WON:           { bg: 'rgba(16,185,129,0.12)',  text: '#34d399' },
  LOST:          { bg: 'rgba(239,68,68,0.12)',   text: '#f87171' },
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON']

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
}

export default function SalesPage() {
  const [deals, setDeals] = useState<Deal[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [stageFilter, setStageFilter] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [dealData, analyticsData] = await Promise.all([
          api.get<{ deals: Deal[] }>('/sales/deals', { stage: stageFilter || undefined }),
          api.get<Analytics>('/sales/analytics'),
        ])
        setDeals(dealData.deals)
        setAnalytics(analyticsData)
      } catch {
        setDeals([
          { id: '1', title: 'HVAC Installation - Johnson Home', value: 4500, stage: 'PROPOSAL_SENT', contact: { firstName: 'Mark', lastName: 'Johnson' }, updatedAt: new Date().toISOString() },
          { id: '2', title: 'Annual Maintenance Contract - Office Park', value: 12000, stage: 'NEGOTIATION', company: { name: 'Riverdale Office Park' }, updatedAt: new Date().toISOString() },
          { id: '3', title: 'Emergency Repair - Williams', value: 850, stage: 'WON', contact: { firstName: 'Sarah', lastName: 'Williams' }, updatedAt: new Date().toISOString() },
          { id: '4', title: 'New AC System - Peterson', value: 7200, stage: 'QUALIFIED', contact: { firstName: 'Tom', lastName: 'Peterson' }, updatedAt: new Date().toISOString() },
        ])
        setAnalytics({ pipeline: [], wonRevenue: 28500, wonDeals: 14, conversionRate: 42 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [stageFilter])

  const pipelineValue = deals
    .filter(d => !['WON', 'LOST'].includes(d.stage))
    .reduce((sum, d) => sum + (d.value ?? 0), 0)

  return (
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Sales Assistant</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered deal tracking and follow-ups</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <Plus className="h-4 w-4" />
          Add Deal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: `$${(pipelineValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-primary' },
          { label: 'Won Revenue', value: analytics ? `$${(analytics.wonRevenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, color: 'text-emerald-400' },
          { label: 'Won Deals', value: analytics?.wonDeals ?? '--', icon: CheckCircle, color: 'text-emerald-400' },
          { label: 'Conversion Rate', value: analytics ? `${analytics.conversionRate}%` : '--', icon: Target, color: 'text-violet-400' },
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

      {/* Stage Filter */}
      <div className="kv-anim flex gap-2 overflow-x-auto pb-1 scrollbar-hide" style={{ animationDelay: '0.39s' }}>
        <button
          onClick={() => setStageFilter('')}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
          style={stageFilter === ''
            ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
            : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
          }
        >
          All
        </button>
        {STAGES.map(stage => (
          <button
            key={stage}
            onClick={() => setStageFilter(stage)}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
            style={stageFilter === stage
              ? { background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', color: 'white' }
              : { background: 'hsl(var(--card))', color: 'hsl(var(--muted-foreground))', border: '1px solid hsl(var(--border))' }
            }
          >
            {stage.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Deal List */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.46s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <TrendingUp className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Deals Pipeline</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : deals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <TrendingUp className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No deals yet</p>
            <p className="text-sm text-muted-foreground mt-1">Add your first deal or import from CRM.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {deals.map(deal => {
              const stageStyle = STAGE_COLORS[deal.stage] ?? { bg: 'hsl(var(--muted))', text: 'hsl(var(--muted-foreground))' }
              return (
                <div key={deal.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ''}` : deal.company?.name ?? '—'}
                    </p>
                  </div>

                  {deal.value && (
                    <span className="text-sm font-semibold text-emerald-400 tabular">
                      ${deal.value.toLocaleString()}
                    </span>
                  )}

                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{ background: stageStyle.bg, color: stageStyle.text }}
                  >
                    {deal.stage.replace('_', ' ')}
                  </span>

                  <button className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10">
                    <Zap className="h-3 w-3" />
                    AI Follow-up
                  </button>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
