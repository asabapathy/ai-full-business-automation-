import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

const PLATFORMS = ['instagram', 'facebook', 'tiktok', 'linkedin', 'twitter', 'blog'] as const
type Platform = typeof PLATFORMS[number]

export class ContentCalendarService {
  async getPosts(orgId: string, filters: { platform?: string; status?: string; from?: string; to?: string }) {
    const where: any = { organizationId: orgId }
    if (filters.platform) where.platform = filters.platform
    if (filters.status) where.status = filters.status
    if (filters.from || filters.to) {
      where.scheduledAt = {}
      if (filters.from) where.scheduledAt.gte = new Date(filters.from)
      if (filters.to) where.scheduledAt.lte = new Date(filters.to)
    }

    return prisma.contentPost.findMany({
      where,
      orderBy: { scheduledAt: 'asc' },
    })
  }

  async getPost(orgId: string, id: string) {
    return prisma.contentPost.findFirst({ where: { id, organizationId: orgId } })
  }

  async createPost(orgId: string, data: {
    title: string
    body: string
    platform: string
    scheduledAt?: string
    hashtags?: string[]
    mediaUrl?: string
  }) {
    return prisma.contentPost.create({
      data: {
        organizationId: orgId,
        title: data.title,
        body: data.body,
        platform: data.platform,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : null,
        hashtags: data.hashtags ?? [],
        mediaUrl: data.mediaUrl,
        status: data.scheduledAt ? 'scheduled' : 'draft',
      },
    })
  }

  async generateAiDraft(orgId: string, id: string): Promise<string> {
    const post = await prisma.contentPost.findFirst({ where: { id, organizationId: orgId } })
    if (!post) throw new Error('Post not found')

    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, industry: true },
    })

    const platformGuide: Record<string, string> = {
      instagram: 'engaging, visual-first, 150 words max, include 3-5 relevant hashtags',
      facebook: 'conversational, 200 words max, encourage comments',
      tiktok: 'trendy, short hook in first line, casual tone, 100 words max',
      linkedin: 'professional, thought leadership, 300 words max',
      twitter: 'punchy, under 280 characters',
      blog: 'SEO-optimized, 400-600 words, include subheadings',
    }

    const guide = platformGuide[post.platform] ?? 'engaging, concise'

    const draft = await aiService.chat([{
      role: 'user',
      content: `You are a social media expert for ${org?.name} (${org?.industry} industry). Write a ${post.platform} post about: "${post.title}". Context: ${post.body}. Style guide: ${guide}. Write only the post content.`,
    }])

    await prisma.contentPost.update({
      where: { id },
      data: { aiDraft: draft },
    })

    return draft
  }

  async updatePost(orgId: string, id: string, data: Partial<{
    title: string
    body: string
    status: string
    scheduledAt: string
    hashtags: string[]
    mediaUrl: string
  }>) {
    return prisma.contentPost.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...data,
        scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
      },
    })
  }

  async deletePost(orgId: string, id: string) {
    return prisma.contentPost.deleteMany({ where: { id, organizationId: orgId } })
  }

  async generateWeekPlan(orgId: string, topic: string): Promise<{ posts: Array<{ platform: string; title: string; body: string; day: string }> }> {
    const org = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true, industry: true },
    })

    const raw = await aiService.chat([{
      role: 'user',
      content: `Create a 7-day social media content plan for ${org?.name} (${org?.industry}) about: "${topic}". Return JSON array with 7 objects: {platform, title, body, day}. Use platforms: instagram, facebook, linkedin, tiktok, blog. Each body max 100 words. Return only valid JSON array.`,
    }])

    try {
      const jsonMatch = raw.match(/\[[\s\S]*\]/)
      const posts = jsonMatch ? JSON.parse(jsonMatch[0]) : []
      return { posts }
    } catch {
      return { posts: [] }
    }
  }

  async bulkCreateFromPlan(orgId: string, posts: Array<{ platform: string; title: string; body: string; scheduledAt?: string }>) {
    const data = posts.map(p => ({
      organizationId: orgId,
      title: p.title,
      body: p.body,
      platform: p.platform,
      scheduledAt: p.scheduledAt ? new Date(p.scheduledAt) : null,
      status: p.scheduledAt ? 'scheduled' : 'draft',
      hashtags: [] as string[],
    }))

    await prisma.contentPost.createMany({ data })
    return { created: data.length }
  }

  async getCalendarView(orgId: string, month: string) {
    const start = new Date(`${month}-01`)
    const end = new Date(start)
    end.setMonth(end.getMonth() + 1)

    return prisma.contentPost.findMany({
      where: {
        organizationId: orgId,
        scheduledAt: { gte: start, lt: end },
      },
      orderBy: { scheduledAt: 'asc' },
    })
  }
}

export const contentCalendarService = new ContentCalendarService()
