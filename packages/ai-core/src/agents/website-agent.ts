import type { AITool, AgentContext } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const WEBSITE_SYSTEM_PROMPT = `You are the AI Website Builder for Kanavu AI — an expert in creating high-converting small business websites.

## Your Expertise
- Business website structure and information architecture
- Conversion-optimized landing pages
- SEO content writing and keyword strategy
- Local SEO for small businesses (Google Business Profile optimization)
- Blog content creation and publishing
- Call-to-action placement and optimization
- Mobile-first responsive design guidance
- Page speed and Core Web Vitals optimization

## Your Approach
1. Understand the business, its customers, and its goals first
2. Structure the site around customer intent and the sales funnel
3. Write copy that converts — clear value propositions, trust signals, CTAs
4. Optimize every page for local and national SEO
5. Generate content that positions the business as an authority
6. Suggest ongoing content to maintain and improve rankings

## Content Principles
- Lead with customer benefits, not business features
- Use social proof (reviews, testimonials, case studies) prominently
- Make contact and booking as easy as possible
- Fast-loading, mobile-optimized layouts
- Clear, consistent branding throughout`

export class WebsiteAgent extends BaseAgent {
  readonly agentName = 'Website Builder'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return WEBSITE_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'generate_website_structure',
        description: 'Create a complete website structure and sitemap',
        inputSchema: {
          type: 'object',
          properties: {
            businessType: { type: 'string' },
            goals: { type: 'array', items: { type: 'string' }, description: 'Primary business goals' },
            targetAudience: { type: 'string' },
            competitors: { type: 'array', items: { type: 'string' } },
          },
          required: ['businessType'],
        },
      },
      {
        name: 'generate_page_content',
        description: 'Generate full content for a specific website page',
        inputSchema: {
          type: 'object',
          properties: {
            pageType: { type: 'string', enum: ['home', 'about', 'services', 'contact', 'faq', 'testimonials', 'blog'] },
            primaryKeyword: { type: 'string', description: 'Main SEO keyword for this page' },
            secondaryKeywords: { type: 'array', items: { type: 'string' } },
            services: { type: 'array', items: { type: 'string' } },
            tone: { type: 'string', enum: ['professional', 'friendly', 'authoritative', 'casual'] },
          },
          required: ['pageType'],
        },
      },
      {
        name: 'write_blog_post',
        description: 'Write an SEO-optimized blog post for the business',
        inputSchema: {
          type: 'object',
          properties: {
            topic: { type: 'string' },
            targetKeyword: { type: 'string' },
            wordCount: { type: 'number', description: 'Target word count (500-2000)' },
            audience: { type: 'string', description: 'Who will read this post' },
          },
          required: ['topic', 'targetKeyword'],
        },
      },
      {
        name: 'optimize_seo',
        description: 'Analyze and optimize a page for SEO',
        inputSchema: {
          type: 'object',
          properties: {
            pageContent: { type: 'string' },
            targetKeyword: { type: 'string' },
            pageType: { type: 'string' },
          },
          required: ['targetKeyword'],
        },
      },
      {
        name: 'generate_local_seo_content',
        description: 'Create local SEO content including service area pages and Google Business Profile content',
        inputSchema: {
          type: 'object',
          properties: {
            city: { type: 'string' },
            state: { type: 'string' },
            serviceAreas: { type: 'array', items: { type: 'string' } },
            services: { type: 'array', items: { type: 'string' } },
          },
          required: ['city'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'generate_website_structure': return this.generateWebsiteStructure(input)
      case 'generate_page_content': return this.generatePageContent(input)
      case 'write_blog_post': return this.writeBlogPost(input)
      case 'optimize_seo': return this.optimizeSeo(input)
      case 'generate_local_seo_content': return this.generateLocalSeoContent(input)
      default: throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async generateWebsiteStructure(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const pages = [
      { slug: '/', name: 'Home', priority: 'high', seoGoal: 'Brand + primary keyword' },
      { slug: '/services', name: 'Services', priority: 'high', seoGoal: 'Service keywords' },
      { slug: '/about', name: 'About', priority: 'medium', seoGoal: 'Trust and brand story' },
      { slug: '/testimonials', name: 'Testimonials', priority: 'medium', seoGoal: 'Social proof' },
      { slug: '/contact', name: 'Contact', priority: 'high', seoGoal: 'Conversion' },
      { slug: '/faq', name: 'FAQ', priority: 'low', seoGoal: 'Long-tail keywords' },
      { slug: '/blog', name: 'Blog', priority: 'medium', seoGoal: 'Content marketing' },
    ]
    return {
      businessType: input['businessType'],
      pages,
      recommendedFeatures: ['online booking', 'live chat', 'review widgets', 'Google Maps embed'],
      estimatedBuildTime: '2-4 hours with AI assistance',
      seoStrategy: {
        primaryKeyword: `${input['businessType']} ${this.context.businessContext?.name ?? ''}`.trim(),
        contentCalendar: '2 blog posts per month',
        localSeoSetup: true,
      },
    }
  }

  private async generatePageContent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const businessName = this.context.businessContext?.name ?? 'the business'
    const industry = this.context.businessContext?.industry ?? 'service'
    return {
      pageType: input['pageType'],
      primaryKeyword: input['primaryKeyword'],
      contentBlueprint: {
        headline: `Generated headline optimized for "${input['primaryKeyword']}"`,
        subheadline: `Supporting value proposition for ${businessName}`,
        sections: ['Hero', 'Value Props', 'Services/Features', 'Social Proof', 'CTA'],
        metaTitle: `${input['primaryKeyword']} | ${businessName}`,
        metaDescription: `${businessName} provides expert ${industry.toLowerCase().replace(/_/g, ' ')} services. ${input['primaryKeyword']}. Contact us today.`,
        wordCount: 600,
      },
      generationInstruction: `Write complete ${input['pageType']} page content for ${businessName}, a ${industry.replace(/_/g, ' ').toLowerCase()} business, optimized for "${input['primaryKeyword']}"`,
    }
  }

  private async writeBlogPost(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const wordCount = (input['wordCount'] as number) ?? 800
    return {
      topic: input['topic'],
      targetKeyword: input['targetKeyword'],
      outline: {
        title: `[AI will generate title optimized for: ${input['targetKeyword']}]`,
        introduction: '100 words',
        sections: Array.from({ length: 4 }, (_, i) => `Section ${i + 1}: ${100 + Math.floor(wordCount / 4)} words`),
        conclusion: '100 words',
        totalWordCount: wordCount,
      },
      seo: {
        targetKeyword: input['targetKeyword'],
        keywordDensity: '1-2%',
        internalLinks: 3,
        externalLinks: 2,
        metaDescription: `[AI generated] — targeted: ${input['targetKeyword']}`,
      },
      status: 'draft',
      estimatedReadTime: `${Math.ceil(wordCount / 200)} min`,
    }
  }

  private async optimizeSeo(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      targetKeyword: input['targetKeyword'],
      recommendations: [
        { priority: 'high', item: 'Add keyword to H1 tag', impact: 'High' },
        { priority: 'high', item: 'Add keyword to meta title and description', impact: 'High' },
        { priority: 'medium', item: 'Add 2-3 internal links to related pages', impact: 'Medium' },
        { priority: 'medium', item: 'Add alt text to all images with keyword variants', impact: 'Medium' },
        { priority: 'low', item: 'Add schema markup for business type', impact: 'Medium' },
        { priority: 'low', item: 'Compress images for faster load time', impact: 'High' },
      ],
      estimatedScoreIncrease: '+15-25 points',
      pageType: input['pageType'],
    }
  }

  private async generateLocalSeoContent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    const serviceAreas = (input['serviceAreas'] as string[]) ?? []
    const services = (input['services'] as string[]) ?? []
    const city = input['city'] as string
    const state = input['state'] as string

    return {
      primaryLocation: { city, state },
      serviceAreaPages: serviceAreas.map(area => ({
        url: `/service-areas/${area.toLowerCase().replace(/\s+/g, '-')}`,
        title: `${services[0] ?? 'Services'} in ${area}, ${state}`,
        targetKeyword: `${services[0] ?? 'services'} ${area} ${state}`,
      })),
      googleBusinessProfile: {
        businessName: this.context.businessContext?.name,
        category: this.context.businessContext?.industry,
        description: `[AI generated] — local SEO optimized for ${city}, ${state}`,
        services,
        serviceAreas: [city, ...serviceAreas],
      },
      localCitations: ['Google Business Profile', 'Yelp', 'Bing Places', 'Apple Maps', 'BBB'],
    }
  }
}
