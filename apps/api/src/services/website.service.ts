import { AIProviderFactory, WebsiteAgent } from '@kanavu/ai-core'
import type { AgentContext } from '@kanavu/types'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface CreateWebsiteRequest {
  name: string
  domain?: string
  template?: string
  primaryColor?: string
  description?: string
}

interface CreatePageRequest {
  websiteId: string
  title: string
  slug: string
  pageType?: string
  metaTitle?: string
  metaDescription?: string
}

interface GenerateSiteRequest {
  businessGoals?: string[]
  targetAudience?: string
  competitors?: string[]
  primaryColor?: string
  template?: string
}

export class WebsiteService {
  private provider = AIProviderFactory.createFromEnv()

  private buildContext(organizationId: string, orgData: { name: string; industry: string }): AgentContext {
    return {
      organizationId,
      agentType: 'website',
      businessContext: { name: orgData.name, industry: orgData.industry },
    }
  }

  async getWebsites(organizationId: string) {
    return prisma.website.findMany({
      where: { organizationId },
      include: { pages: { select: { id: true, title: true, slug: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createWebsite(organizationId: string, data: CreateWebsiteRequest) {
    return prisma.website.create({
      data: {
        organizationId,
        name: data.name,
        domain: data.domain,
        template: data.template ?? 'default',
        primaryColor: data.primaryColor ?? '#6366f1',
        status: 'DRAFT',
        settings: { description: data.description ?? '' },
      },
    })
  }

  async getPages(organizationId: string, websiteId: string) {
    const website = await prisma.website.findFirst({ where: { id: websiteId, organizationId } })
    if (!website) throw new Error('Website not found')

    return prisma.webPage.findMany({
      where: { websiteId },
      orderBy: { createdAt: 'asc' },
    })
  }

  async createPage(organizationId: string, data: CreatePageRequest) {
    const website = await prisma.website.findFirst({ where: { id: data.websiteId, organizationId } })
    if (!website) throw new Error('Website not found')

    return prisma.webPage.create({
      data: {
        websiteId: data.websiteId,
        title: data.title,
        slug: data.slug,
        pageType: data.pageType ?? 'page',
        metaTitle: data.metaTitle ?? data.title,
        metaDescription: data.metaDescription,
        status: 'DRAFT',
        content: {},
      },
    })
  }

  async generateWebsite(organizationId: string, request: GenerateSiteRequest) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const context = this.buildContext(organizationId, org)
    const agent = new WebsiteAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `Generate a complete website for ${org.name}, a ${org.industry.replace(/_/g, ' ').toLowerCase()} business.
Goals: ${(request.businessGoals ?? ['increase leads', 'showcase services']).join(', ')}.
Target audience: ${request.targetAudience ?? 'local customers'}.
Create the site structure, all page content outlines, and SEO strategy.`
    )

    const website = await prisma.website.create({
      data: {
        organizationId,
        name: `${org.name} Website`,
        template: request.template ?? 'professional',
        primaryColor: request.primaryColor ?? '#6366f1',
        status: 'DRAFT',
        settings: {
          aiGenerated: true,
          aiPlan: response.actions ?? [],
          businessGoals: request.businessGoals ?? [],
        },
      },
    })

    const defaultPages = ['home', 'services', 'about', 'contact']
    await Promise.all(defaultPages.map(pageType =>
      prisma.webPage.create({
        data: {
          websiteId: website.id,
          title: pageType.charAt(0).toUpperCase() + pageType.slice(1),
          slug: pageType === 'home' ? '/' : `/${pageType}`,
          pageType,
          metaTitle: `${pageType.charAt(0).toUpperCase() + pageType.slice(1)} | ${org.name}`,
          status: 'DRAFT',
          content: {},
          aiGenerated: true,
        },
      })
    ))

    logger.info({ websiteId: website.id, org: org.name }, 'AI website generated')
    return { website, aiResponse: response.content, actions: response.actions }
  }

  async generatePageContent(organizationId: string, pageId: string, request: { tone?: string; primaryKeyword?: string }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const page = await prisma.webPage.findFirst({
      where: { id: pageId, website: { organizationId } },
    })
    if (!page) throw new Error('Page not found')

    const context = this.buildContext(organizationId, org)
    const agent = new WebsiteAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `Generate complete, conversion-optimized content for the "${page.pageType}" page of ${org.name}'s website.
Primary keyword: ${request.primaryKeyword ?? page.title}.
Tone: ${request.tone ?? 'professional'}.
Industry: ${org.industry.replace(/_/g, ' ').toLowerCase()}.
Write the full page content including headlines, body copy, and a call to action.`
    )

    const updated = await prisma.webPage.update({
      where: { id: pageId },
      data: {
        content: { generatedContent: response.content } as never,
        metaTitle: `${page.title} | ${org.name}`,
        aiGenerated: true,
      },
    })

    return { page: updated, content: response.content }
  }

  async getBlogPosts(organizationId: string, websiteId: string, filters: { status?: string; page?: number; limit?: number }) {
    const website = await prisma.website.findFirst({ where: { id: websiteId, organizationId } })
    if (!website) throw new Error('Website not found')

    const { status, page = 1, limit = 10 } = filters
    const skip = (page - 1) * limit
    const where = { websiteId, ...(status ? { status: status as never } : {}) }

    const [posts, total] = await Promise.all([
      prisma.blogPost.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.blogPost.count({ where }),
    ])

    return { posts, total, page, limit }
  }

  async generateBlogPost(organizationId: string, websiteId: string, request: { topic: string; targetKeyword: string; wordCount?: number }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const website = await prisma.website.findFirst({ where: { id: websiteId, organizationId } })
    if (!website) throw new Error('Website not found')

    const context = this.buildContext(organizationId, org)
    const agent = new WebsiteAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `Write a ${request.wordCount ?? 800}-word SEO blog post for ${org.name} about "${request.topic}".
Target keyword: "${request.targetKeyword}".
Industry: ${org.industry.replace(/_/g, ' ').toLowerCase()}.
Write the complete article with a compelling title, introduction, 4-5 sections with headers, and a conclusion with CTA.`
    )

    const slug = request.topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
    const post = await prisma.blogPost.create({
      data: {
        websiteId,
        title: request.topic,
        slug,
        content: response.content,
        excerpt: response.content.slice(0, 200) + '...',
        metaTitle: `${request.topic} | ${org.name}`,
        metaDescription: `${response.content.slice(0, 150)}...`,
        tags: [request.targetKeyword],
        status: 'DRAFT',
        aiGenerated: true,
      },
    })

    return { post, content: response.content }
  }

  async getSeoAnalytics(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [totalWebsites, totalPages, publishedPages, totalPosts] = await Promise.all([
      prisma.website.count({ where: { organizationId } }),
      prisma.webPage.count({ where: { website: { organizationId } } }),
      prisma.webPage.count({ where: { website: { organizationId }, status: 'PUBLISHED' as never } }),
      prisma.blogPost.count({ where: { website: { organizationId }, createdAt: { gte: thirtyDaysAgo } } }),
    ])

    return {
      totalWebsites,
      totalPages,
      publishedPages,
      draftPages: totalPages - publishedPages,
      recentBlogPosts: totalPosts,
      seoScore: publishedPages > 0 ? Math.min(100, publishedPages * 10 + totalPosts * 5) : 0,
    }
  }
}

export const websiteService = new WebsiteService()
