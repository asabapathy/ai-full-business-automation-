'use client'

import { useState, useEffect } from 'react'
import { Megaphone, Plus, Zap, Send, RefreshCw, Instagram, Mail, MessageSquare } from 'lucide-react'
import { Badge } from '../../../../../components/ui/badge'
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

function anim(i: number) {
  return { className: 'kv-anim', style: { animationDelay: `${0.04 + i * 0.07}s` } }
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
    <div className="p-6 space-y-6 max-w-[1200px]">
      {/* Header */}
      <div {...anim(0)} className="kv-anim flex items-center justify-between" style={{ animationDelay: '0.04s' }}>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Marketing Engine</h1>
          <p className="text-muted-foreground text-sm mt-0.5">AI-powered campaigns and content generation</p>
        </div>
        <button
          className="flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white transition-all hover:scale-[1.02]"
          style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)', boxShadow: '0 0 20px rgba(6,182,212,0.3)' }}
        >
          <Plus className="h-4 w-4" />
          New Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: 'Total Campaigns', value: analytics?.totalCampaigns ?? '--', color: 'text-primary' },
          { label: 'Active Now', value: analytics?.activeCampaigns ?? '--', color: 'text-emerald-400' },
          { label: 'Social Posts (30d)', value: analytics?.recentSocialPosts ?? '--', color: 'text-violet-400' },
          { label: 'Est. Reach', value: analytics?.estimatedReach ? `${(analytics.estimatedReach / 1000).toFixed(1)}k` : '--', color: 'text-amber-400' },
        ].map((stat, i) => (
          <div
            key={stat.label}
            className="kv-anim rounded-xl border p-4"
            style={{ animationDelay: `${0.11 + i * 0.07}s`, background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
          >
            <p className="text-xs text-muted-foreground uppercase tracking-wide">{stat.label}</p>
            {isLoading
              ? <Skeleton className="h-8 w-16 mt-1" />
              : <p className={`text-2xl font-bold mt-1 tabular ${stat.color}`}>{stat.value}</p>
            }
          </div>
        ))}
      </div>

      {/* AI Campaign Generator */}
      <div
        className="kv-anim rounded-xl border p-5"
        style={{
          animationDelay: '0.39s',
          background: 'rgba(6,182,212,0.04)',
          borderColor: 'rgba(6,182,212,0.25)',
          borderLeftWidth: 4,
          borderLeftColor: '#06b6d4',
        }}
      >
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-4 w-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">AI Campaign Generator</h2>
        </div>
        <div className="flex gap-2">
          <input
            placeholder="Describe your campaign goal… e.g. 'Get 20 new HVAC tune-up bookings this month'"
            value={goal}
            onChange={e => setGoal(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleGenerate()}
            className="flex-1 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          />
          <button
            onClick={handleGenerate}
            disabled={generating || !goal.trim()}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 transition-all hover:scale-[1.02]"
            style={{ background: 'linear-gradient(135deg, #06b6d4, #0ea5e9)' }}
          >
            {generating ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {aiResult && (
          <div
            className="mt-3 rounded-lg p-4 text-sm text-muted-foreground whitespace-pre-wrap"
            style={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))' }}
          >
            {aiResult}
          </div>
        )}
      </div>

      {/* Campaign List */}
      <div
        className="kv-anim rounded-xl border overflow-hidden"
        style={{ animationDelay: '0.46s', background: 'hsl(var(--card))', borderColor: 'hsl(var(--border))' }}
      >
        <div className="flex items-center gap-2 px-5 py-4 border-b" style={{ borderColor: 'hsl(var(--border))' }}>
          <Megaphone className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold text-foreground">Campaigns</h2>
        </div>

        {isLoading ? (
          <div className="p-4 space-y-3">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)}
          </div>
        ) : campaigns.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center px-4">
            <Megaphone className="h-10 w-10 text-muted-foreground/30 mb-3" />
            <p className="font-medium text-foreground">No campaigns yet</p>
            <p className="text-sm text-muted-foreground mt-1">Create your first campaign or let AI generate one.</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'hsl(var(--border))' }}>
            {campaigns.map(campaign => {
              const Icon = TYPE_ICONS[campaign.type] ?? TYPE_ICONS['DEFAULT']!
              return (
                <div key={campaign.id} className="flex items-center gap-4 px-5 py-3 hover:bg-accent/40 transition-colors group">
                  <div
                    className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: 'rgba(6,182,212,0.1)' }}
                  >
                    <Icon className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm text-foreground truncate">{campaign.name}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {campaign.type.replace(/_/g, ' ')}
                      {campaign.aiGenerated && (
                        <span className="ml-2 text-primary font-medium">AI</span>
                      )}
                    </p>
                  </div>
                  <Badge variant={(STATUS_COLORS[campaign.status] as never) ?? 'outline'} className="text-xs">
                    {campaign.status}
                  </Badge>
                  {campaign.status === 'DRAFT' && (
                    <button
                      className="rounded-lg px-2 py-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all hover:bg-primary/10"
                      style={{ border: '1px solid rgba(6,182,212,0.2)' }}
                    >
                      Launch
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
