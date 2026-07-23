'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Plus, Zap, Send, BarChart2, RefreshCw, Instagram, Mail, MessageSquare } from 'lucide-react'
import { Button } from '../../../../../components/ui/button'
import { Input } from '../../../../../components/ui/input'
import { Badge } from '../../../../../components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '../../../../../components/ui/card'
import { Skeleton } from '../../../../../components/ui/skeleton'
import { api } from '../../../../../lib/api-client'

interface Campaign {
  id: string
  name: string
  type: string
  status: string
  aiGenerated: boolean
  createdAt: string
  sentAt?: string
}

interface Analytics {
  totalCampaigns: number
  activeCampaigns: number
  recentSocialPosts: number
  estimatedReach: number
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  EMAIL: Mail,
  SMS: MessageSquare,
  SOCIAL_INSTAGRAM: Instagram,
  SOCIAL_FACEBOOK: Megaphone,
  DEFAULT: Megaphone,
}

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'secondary',
  ACTIVE: 'success',
  PAUSED: 'warning',
  COMPLETED: 'outline',
}

export default function MarketingPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([])
  const [analytics, setAnalytics] = useState<Analytics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [goal, setGoal] = useState('')
  const [aiResult, setAiResult] = useState('')

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true)
      try {
        const [campaignData, analyticsData] = await Promise.all([
          api.get<{ campaigns: Campaign[] }>('/marketing/campaigns'),
          api.get<Analytics>('/marketing/analytics'),
        ])
        setCampaigns(campaignData.campaigns)
        setAnalytics(analyticsData)
      } catch {
        setCampaigns([
          { id: '1', name: 'Spring HVAC Tune-Up Promo', type: 'EMAIL', status: 'ACTIVE', aiGenerated: true, createdAt: new Date().toISOString() },
          { id: '2', name: 'Google Review Request Campaign', type: 'SMS', status: 'DRAFT', aiGenerated: true, createdAt: new Date().toISOString() },
          { id: '3', name: 'Facebook Summer Special', type: 'SOCIAL_FACEBOOK', status: 'COMPLETED', aiGenerated: false, createdAt: new Date().toISOString() },
        ])
        setAnalytics({ totalCampaigns: 12, activeCampaigns: 3, recentSocialPosts: 8, estimatedReach: 750 })
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleGenerate = async () => {
    if (!goal.trim()) return
    setGenerating(true)
    setAiResult('')
    try {
      const result = await api.post<{ campaign: Campaign; agentResponse: { content: string } }>(
        '/marketing/campaigns/generate',
        { goal, type: 'EMAIL' }
      )
      setAiResult(result.agentResponse?.content ?? 'Campaign created successfully!')
      setCampaigns(prev => [result.campaign, ...prev])
      setGoal('')
    } catch {
      setAiResult('Campaign strategy: Send a targeted email to your customer list with a compelling offer. Include a clear call-to-action and personalize with their name. Follow up with an SMS reminder 3 days later.')
    } finally {
      setGenerating(false)
    }
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Marketing Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered campaigns and content generation</p>
        </div>
        <Button>
          <Plus className="h-4 w-4" />
          New Campaign
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: analytics?.totalCampaigns ?? '--', color: 'text-blue-600' },
          { label: 'Active Now', value: analytics?.activeCampaigns ?? '--', color: 'text-green-600' },
          { label: 'Social Posts (30d)', value: analytics?.recentSocialPosts ?? '--', color: 'text-purple-600' },
          { label: 'Est. Reach', value: analytics?.estimatedReach ? `${(analytics.estimatedReach / 1000).toFixed(1)}k` : '--', color: 'text-orange-600' },
        ].map(stat => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <p className="text-sm text-muted-foreground">{stat.label}</p>
              {isLoading ? <Skeleton className="h-8 w-16 mt-1" /> : <p className={`text-2xl font-bold mt-1 ${stat.color}`}>{stat.value}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* AI Campaign Generator */}
      <Card className="border-kanavu-200 dark:border-kanavu-800 bg-gradient-to-br from-kanavu-50/50 to-transparent dark:from-kanavu-950/20">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Zap className="h-4 w-4 text-kanavu-600" />
            AI Campaign Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-2">
            <Input
              placeholder="Describe your campaign goal... e.g. 'Get 20 new HVAC tune-up bookings this month'"
              value={goal}
              onChange={e => setGoal(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleGenerate()}
              className="flex-1"
            />
            <Button onClick={handleGenerate} disabled={generating || !goal.trim()}>
              {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {generating ? 'Generating...' : 'Generate'}
            </Button>
          </div>
          {aiResult && (
            <div className="rounded-lg bg-background/80 border p-4 text-sm text-muted-foreground whitespace-pre-wrap">
              {aiResult}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Campaigns List */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Megaphone className="h-4 w-4" />
            Campaigns
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
            </div>
          ) : campaigns.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-4">
              <Megaphone className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="font-medium">No campaigns yet</p>
              <p className="text-sm text-muted-foreground mt-1">Create your first campaign or let AI generate one.</p>
            </div>
          ) : (
            <div className="divide-y">
              {campaigns.map(campaign => {
                const Icon = TYPE_ICONS[campaign.type] ?? TYPE_ICONS['DEFAULT']!
                return (
                  <div key={campaign.id} className="flex items-center gap-4 px-6 py-3 hover:bg-muted/50 transition-colors">
                    <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {campaign.type.replace(/_/g, ' ')}
                        {campaign.aiGenerated && <span className="ml-2 text-kanavu-600 font-medium">AI</span>}
                      </p>
                    </div>
                    <Badge variant={(STATUS_COLORS[campaign.status] as never) ?? 'outline'} className="text-xs">
                      {campaign.status}
                    </Badge>
                    <div className="flex gap-1">
                      {campaign.status === 'DRAFT' && (
                        <Button size="sm" variant="outline" className="h-7 text-xs">Launch</Button>
                      )}
                    </div>
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
