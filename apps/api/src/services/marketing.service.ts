import { AIProviderFactory, MarketingAgent, MemoryManager } from '@kanavu/ai-core'
import type { AgentContext } from '@kanavu/types'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface GeneratePostRequest {
  platform: string
  objective: string
  topic: string
  includeHashtags?: boolean
  callToAction?: string
}

interface CreateCampaignRequest {
  name: string
  type: string
  subject?: string
  content?: string
  audience?: Record<string, unknown>
  scheduledAt?: string
}

interface GenerateContentRequest {
  prompt: string
  type: 'social_post' | 'email' | 'sms' | 'ad_copy'
  platform?: string
}

export class MarketingService {
  private provider = AIProviderFactory.createFromEnv()

  private buildContext(organizationId: string, orgData: { name: string; industry: string }): AgentContext {
    return {
      organizationId,
      agentType: 'marketing',
      businessContext: { name: orgData.name, industry: orgData.industry },
    }
  }

  async generateContent(organizationId: string, request: GenerateContentRequest): Promise<{ content: string; metadata?: Record<string, unknown> }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const context = this.buildContext(organizationId, org)
    const agent = new MarketingAgent({ provider: this.provider }, context)

    const systemContext = `You are creating marketing content for ${org.name}, a ${org.industry.replace(/_/g, ' ').toLowerCase()} business.`

    let prompt = ''
    switch (request.type) {
      case 'social_post':
        prompt = `Create a compelling ${request.platform ?? 'social media'} post. ${request.prompt}.
Return ONLY the post text with relevant hashtags. No explanations.`
        break
      case 'email':
        prompt = `Write a professional marketing email. ${request.prompt}.
Format: Subject: [subject]\n\n[body]`
        break
      case 'sms':
        prompt = `Write an SMS marketing message (max 160 chars). ${request.prompt}.
Include opt-out: "Reply STOP to unsubscribe". Return ONLY the SMS text.`
        break
      case 'ad_copy':
        prompt = `Write compelling ad copy. ${request.prompt}.
Format: Headline: [headline]\nDescription: [description]\nCTA: [call to action]`
        break
    }

    const result = await this.provider.generate({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: systemContext,
      temperature: 0.8,
      maxTokens: 1024,
    })

    return { content: result.content, metadata: { type: request.type, platform: request.platform } }
  }

  async createCampaign(organizationId: string, data: CreateCampaignRequest) {
    return prisma.campaign.create({
      data: {
        organizationId,
        name: data.name,
        type: (data.type.toUpperCase() as never),
        status: 'DRAFT',
        subject: data.subject,
        content: data.content,
        audience: data.audience ?? {},
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        aiGenerated: false,
      },
    })
  }

  async generateAndCreateCampaign(organizationId: string, request: { goal: string; type: string; platform?: string }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const context = this.buildContext(organizationId, org)
    const agent = new MarketingAgent({ provider: this.provider }, context)

    const agentResponse = await agent.run(
      `Create a ${request.type} campaign to achieve: ${request.goal}.
Generate the complete campaign content including subject line and body.
Business: ${org.name} (${org.industry})`
    )

    const campaign = await prisma.campaign.create({
      data: {
        organizationId,
        name: `AI Campaign: ${request.goal.slice(0, 60)}`,
        type: (request.platform?.toUpperCase() as never) ?? 'EMAIL',
        status: 'DRAFT',
        content: agentResponse.content,
        aiGenerated: true,
        settings: { aiPlan: agentResponse.actions ?? [] },
      },
    })

    return { campaign, agentResponse }
  }

  async getCampaigns(organizationId: string, filters: { type?: string; status?: string; page?: number; limit?: number }) {
    const { type, status, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      ...(type ? { type: type as never } : {}),
      ...(status ? { status: status as never } : {}),
    }

    const [campaigns, total] = await Promise.all([
      prisma.campaign.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.campaign.count({ where }),
    ])

    return { campaigns, total, page, limit }
  }

  async updateCampaign(organizationId: string, campaignId: string, data: Partial<CreateCampaignRequest>) {
    return prisma.campaign.update({
      where: { id: campaignId, organizationId },
      data: {
        ...data,
        ...(data.scheduledAt ? { scheduledAt: new Date(data.scheduledAt) } : {}),
      },
    })
  }

  async launchCampaign(organizationId: string, campaignId: string) {
    const campaign = await prisma.campaign.findFirst({
      where: { id: campaignId, organizationId },
    })
    if (!campaign) throw new Error('Campaign not found')

    const updated = await prisma.campaign.update({
      where: { id: campaignId },
      data: { status: 'ACTIVE', sentAt: new Date() },
    })

    logger.info({ campaignId, type: campaign.type }, 'Campaign launched')
    return updated
  }

  async getSocialAccounts(organizationId: string) {
    return prisma.socialAccount.findMany({
      where: { organizationId, isActive: true },
    })
  }

  async scheduleSocialPost(organizationId: string, data: {
    socialAccountId: string
    content: string
    mediaUrls?: string[]
    scheduledAt?: string
    aiGenerated?: boolean
  }) {
    return prisma.socialPost.create({
      data: {
        organizationId,
        socialAccountId: data.socialAccountId,
        content: data.content,
        mediaUrls: data.mediaUrls ?? [],
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        status: data.scheduledAt ? 'scheduled' : 'draft',
        aiGenerated: data.aiGenerated ?? false,
      },
    })
  }

  async getAnalytics(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalCampaigns, activeCampaigns, campaignsByType, recentPosts] = await Promise.all([
      prisma.campaign.count({ where: { organizationId } }),
      prisma.campaign.count({ where: { organizationId, status: 'ACTIVE' } }),
      prisma.campaign.groupBy({
        by: ['type'],
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        _count: true,
      }),
      prisma.socialPost.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    ])

    return {
      totalCampaigns,
      activeCampaigns,
      campaignsByType,
      recentSocialPosts: recentPosts,
      estimatedReach: activeCampaigns * 250,
    }
  }
}

export const marketingService = new MarketingService()
