import type { AITool, AgentContext } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const MARKETING_SYSTEM_PROMPT = `You are the AI Marketing Engine for Kanavu AI — an expert digital marketer and growth strategist.

## Your Expertise
- Social media content creation and scheduling (Facebook, Instagram, TikTok, LinkedIn)
- Email marketing campaigns with high open rates and conversions
- SMS marketing sequences
- Google Ads strategy and copywriting
- SEO content strategy
- Review generation campaigns
- Referral program design
- Loyalty programs
- Local marketing for small businesses

## Your Approach
1. Always analyze the business type, audience, and goals before suggesting campaigns
2. Create content that sounds human and authentic — never generic or corporate
3. Focus on ROI and measurable outcomes
4. Suggest the right channel for the right message
5. Explain why each tactic will work for this specific business
6. Optimize based on performance data

## Content Style Guidelines
- Conversational and engaging, not salesy
- Clear calls to action
- Mobile-first (most local business customers are on mobile)
- Local and community-focused where relevant
- Use emojis sparingly and appropriately for social platforms

## Campaign Types You Execute
- New customer acquisition campaigns
- Win-back campaigns for inactive customers
- Seasonal and holiday promotions
- Review generation sequences (email + SMS)
- Referral programs
- Educational content series
- Event promotions
- Flash sale campaigns`

export class MarketingAgent extends BaseAgent {
  readonly agentName = 'Marketing Engine'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return MARKETING_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'create_social_post',
        description: 'Generate a social media post for a specific platform',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['facebook', 'instagram', 'tiktok', 'linkedin', 'google_business'] },
            objective: { type: 'string', description: 'Goal: awareness, engagement, promotion, review_request' },
            topic: { type: 'string', description: 'What the post is about' },
            includeHashtags: { type: 'boolean', default: true },
            includeEmoji: { type: 'boolean', default: true },
            callToAction: { type: 'string', description: 'What you want the audience to do' },
          },
          required: ['platform', 'objective', 'topic'],
        },
      },
      {
        name: 'create_email_campaign',
        description: 'Design a complete email marketing campaign',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['newsletter', 'promotion', 'win_back', 'welcome', 'follow_up', 'review_request'] },
            subject: { type: 'string', description: 'Email subject line (or generate one)' },
            objective: { type: 'string', description: 'What this email should achieve' },
            audienceSegment: { type: 'string', description: 'Who receives this email' },
            offer: { type: 'string', description: 'Any discount, promotion, or value offered' },
          },
          required: ['type', 'objective'],
        },
      },
      {
        name: 'create_sms_campaign',
        description: 'Create an SMS marketing message or sequence',
        inputSchema: {
          type: 'object',
          properties: {
            type: { type: 'string', enum: ['promotion', 'reminder', 'win_back', 'review_request', 'appointment_reminder'] },
            message: { type: 'string', description: 'SMS content (or auto-generate)' },
            includeOptOut: { type: 'boolean', default: true },
          },
          required: ['type'],
        },
      },
      {
        name: 'schedule_content_calendar',
        description: 'Create a content calendar for the next N days/weeks',
        inputSchema: {
          type: 'object',
          properties: {
            durationDays: { type: 'number', description: 'How many days to plan' },
            platforms: { type: 'array', items: { type: 'string' }, description: 'Which platforms to include' },
            postsPerWeek: { type: 'number', description: 'Posts per week per platform' },
            themes: { type: 'array', items: { type: 'string' }, description: 'Content themes to cover' },
          },
          required: ['durationDays', 'platforms'],
        },
      },
      {
        name: 'analyze_campaign_performance',
        description: 'Analyze campaign metrics and provide optimization recommendations',
        inputSchema: {
          type: 'object',
          properties: {
            campaignId: { type: 'string' },
            metrics: { type: 'object', description: 'Available metrics (opens, clicks, conversions, etc.)' },
          },
          required: ['metrics'],
        },
      },
      {
        name: 'generate_review_campaign',
        description: 'Create a review request campaign for Google, Yelp, or Facebook',
        inputSchema: {
          type: 'object',
          properties: {
            platform: { type: 'string', enum: ['google', 'yelp', 'facebook'] },
            channel: { type: 'string', enum: ['email', 'sms', 'both'] },
            timing: { type: 'string', description: 'When to send (e.g., "2 days after service completion")' },
          },
          required: ['platform', 'channel'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'create_social_post': return this.createSocialPost(input)
      case 'create_email_campaign': return this.createEmailCampaign(input)
      case 'create_sms_campaign': return this.createSmsCampaign(input)
      case 'schedule_content_calendar': return this.scheduleContentCalendar(input)
      case 'analyze_campaign_performance': return this.analyzeCampaignPerformance(input)
      case 'generate_review_campaign': return this.generateReviewCampaign(input)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async createSocialPost(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessName = this.context.businessContext?.name ?? 'our business'
    const industry = this.context.businessContext?.industry ?? 'service'

    // In production, this would call the AI provider to generate content
    // For now we return a structured response that the calling AI will populate
    return {
      platform: input['platform'],
      objective: input['objective'],
      topic: input['topic'],
      businessContext: { name: businessName, industry },
      status: 'content_generated',
      instruction: `Generate ${input['platform']} post about "${input['topic']}" for ${businessName}`,
    }
  }

  private async createEmailCampaign(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      campaignId: crypto.randomUUID(),
      type: input['type'],
      objective: input['objective'],
      audienceSegment: input['audienceSegment'] ?? 'all_customers',
      status: 'draft',
      estimatedDelivery: '24 hours',
      businessContext: this.context.businessContext,
    }
  }

  private async createSmsCampaign(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      campaignId: crypto.randomUUID(),
      type: input['type'],
      charLimit: 160,
      includeOptOut: input['includeOptOut'] ?? true,
      status: 'draft',
    }
  }

  private async scheduleContentCalendar(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const platforms = input['platforms'] as string[]
    const durationDays = input['durationDays'] as number
    const postsPerWeek = (input['postsPerWeek'] as number) ?? 3

    const totalPosts = Math.floor((durationDays / 7) * postsPerWeek * platforms.length)

    return {
      calendarId: crypto.randomUUID(),
      platforms,
      durationDays,
      totalPlannedPosts: totalPosts,
      startDate: new Date().toISOString(),
      endDate: new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString(),
      status: 'calendar_created',
    }
  }

  private async analyzeCampaignPerformance(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const metrics = input['metrics'] as Record<string, number>
    const openRate = (metrics['opens'] ?? 0) / (metrics['sent'] ?? 1)
    const clickRate = (metrics['clicks'] ?? 0) / (metrics['sent'] ?? 1)

    return {
      summary: {
        openRate: `${(openRate * 100).toFixed(1)}%`,
        clickRate: `${(clickRate * 100).toFixed(1)}%`,
        industryOpenRateBenchmark: '21.5%',
        industryClickRateBenchmark: '2.6%',
        performanceVsBenchmark: openRate > 0.215 ? 'above_average' : 'below_average',
      },
      recommendations: [
        openRate < 0.2 ? 'Test different subject lines — current open rate is below average' : null,
        clickRate < 0.026 ? 'Add a clearer, more compelling call-to-action' : null,
        'Segment your audience for more personalized campaigns',
      ].filter(Boolean),
    }
  }

  private async generateReviewCampaign(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      campaignId: crypto.randomUUID(),
      platform: input['platform'],
      channel: input['channel'],
      timing: input['timing'] ?? '2 days after service completion',
      sequence: [
        { step: 1, timing: 'Day 1', message: 'Thank you + review request' },
        { step: 2, timing: 'Day 4', message: 'Gentle reminder (if no review)' },
        { step: 3, timing: 'Day 14', message: 'Final ask + offer to resolve any issues' },
      ],
      status: 'ready_to_activate',
    }
  }
}
