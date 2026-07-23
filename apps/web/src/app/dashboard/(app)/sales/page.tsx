'use client'

import { useState, useEffect } from 'react'
import { TrendingUp, Plus, DollarSign, Target, CheckCircle, AlertCircle, ChevronRight, Zap } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
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

const STAGE_COLORS: Record<string, string> = {
  NEW: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  CONTACTED: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  QUALIFIED: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  PROPOSAL_SENT: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  NEGOTIATION: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  WON: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  LOST: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
}

const STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL_SENT', 'NEGOTIATION', 'WON']

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
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Sales Assistant</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered deal tracking and follow-ups</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          Add Deal
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Pipeline Value', value: `$${(pipelineValue / 1000).toFixed(1)}k`, icon: TrendingUp, color: 'text-blue-600' },
          { label: 'Won Revenue', value: analytics ? `$${(analytics.wonRevenue / 1000).toFixed(1)}k` : '--', icon: DollarSign, color: 'text-green-600' },
          { label: 'Won Deals', value: analytics?.wonDeals ?? '--', icon: CheckCircle, color: 'text-emerald-600' },
          { label: 'Conversion Rate', value: analytics ? `${analytics.conversionRate}%` : '--', icon: Target, color: 'text-purple-600' },
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

      {/* Stage Filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <Button
          variant={stageFilter === '' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setStageFilter('')}
          className="shrink-0"
        >
          All
        </Button>
        {STAGES.map(stage => (
          <Button
            key={stage}
            variant={stageFilter === stage ? 'default' : 'outline'}
            size="sm"
            onClick={() => setStageFilter(stage)}
            className="shrink-0"
          >
            {stage.replace('_', ' ')}
          </Button>
        ))}
      </div>

      {/* Deal List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Deals Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : deals.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <TrendingUp className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No deals yet</p>
              <p className="text-sm text-muted-foreground mt-1">Add your first deal or import from CRM.</p>
            </div>
          ) : (
            <div className="divide-y">
              {deals.map(deal => (
                <div key={deal.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors group">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{deal.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {deal.contact ? `${deal.contact.firstName} ${deal.contact.lastName ?? ''}` : deal.company?.name ?? '—'}
                    </p>
                  </div>

                  {deal.value && (
                    <span className="text-sm font-semibold text-green-700 dark:text-green-400">
                      ${deal.value.toLocaleString()}
                    </span>
                  )}

                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[deal.stage] ?? ''}`}>
                    {deal.stage.replace('_', ' ')}
                  </span>

                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Zap className="h-3 w-3 mr-1" />
                    AI Follow-up
                  </Button>

                  <ChevronRight className="h-4 w-4 text-muted-foreground/40" />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
