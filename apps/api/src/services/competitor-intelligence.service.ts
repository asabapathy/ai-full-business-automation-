import { prisma } from '@kanavu/database'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

interface CompetitorProfile {
  id?: string
  name: string
  website: string
  googlePlaceId?: string
}

interface ScrapedData {
  title?: string
  description?: string
  services?: string[]
  pricing?: string[]
  reviews?: { count: number; rating: number }
  socialLinks?: Record<string, string>
  phoneNumbers?: string[]
  locations?: string[]
  technologies?: string[]
  lastScraped: string
  error?: string
}

async function scrapeWebsite(url: string): Promise<ScrapedData> {
  const normalizedUrl = url.startsWith('http') ? url : `https://${url}`
  try {
    const resp = await fetch(normalizedUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; KanavuBot/1.0; +https://kanavu.ai)',
        Accept: 'text/html',
      },
      signal: AbortSignal.timeout(10000),
    })
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`)
    const html = await resp.text()
    return parseHtml(html, normalizedUrl)
  } catch (err: any) {
    logger.warn({ url, err: err.message }, 'competitor scrape failed')
    return { lastScraped: new Date().toISOString(), error: err.message }
  }
}

function parseHtml(html: string, url: string): ScrapedData {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()

  const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i)

  const phones = [...new Set([...text.matchAll(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g)].map(m => m[0]))]

  const socialPatterns: Record<string, RegExp> = {
    facebook: /facebook\.com\/[^\s"'<>]+/,
    instagram: /instagram\.com\/[^\s"'<>]+/,
    twitter: /twitter\.com\/[^\s"'<>]+|x\.com\/[^\s"'<>]+/,
    linkedin: /linkedin\.com\/[^\s"'<>]+/,
    youtube: /youtube\.com\/[^\s"'<>]+/,
    tiktok: /tiktok\.com\/[^\s"'<>]+/,
  }
  const socialLinks: Record<string, string> = {}
  for (const [platform, re] of Object.entries(socialPatterns)) {
    const m = html.match(re)
    if (m) socialLinks[platform] = `https://${m[0]}`
  }

  const techPatterns: Record<string, RegExp> = {
    'WordPress': /wp-content|wp-includes|wordpress/i,
    'Shopify': /cdn\.shopify\.com|shopify/i,
    'Wix': /wixsite|wix\.com/i,
    'Squarespace': /squarespace/i,
    'React': /react\.min\.js|__react/i,
    'Next.js': /__next|_next\/static/i,
    'Google Analytics': /google-analytics|ga\.js|gtag/i,
    'Intercom': /intercom/i,
    'Hubspot': /hubspot/i,
    'Calendly': /calendly/i,
    'Stripe': /stripe\.com\/v3/i,
  }
  const technologies = Object.entries(techPatterns)
    .filter(([, re]) => re.test(html))
    .map(([name]) => name)

  const ratingMatch = html.match(/(\d+\.?\d*)\s*(?:out of|\/)\s*5|(\d+\.?\d*)\s*stars?/i)
  const reviewCountMatch = html.match(/(\d[\d,]+)\s*reviews?/i)

  return {
    title: titleMatch?.[1]?.trim(),
    description: descMatch?.[1]?.trim().slice(0, 200),
    phoneNumbers: phones.slice(0, 3),
    socialLinks,
    technologies,
    reviews: ratingMatch || reviewCountMatch ? {
      rating: parseFloat(ratingMatch?.[1] ?? ratingMatch?.[2] ?? '0'),
      count: parseInt((reviewCountMatch?.[1] ?? '0').replace(/,/g, '')),
    } : undefined,
    lastScraped: new Date().toISOString(),
  }
}

export const competitorIntelligenceService = {
  async addCompetitor(orgId: string, profile: CompetitorProfile) {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    if (!settings.competitors) settings.competitors = []
    const entry = {
      id: `comp_${Date.now()}`,
      ...profile,
      addedAt: new Date().toISOString(),
    }
    settings.competitors.push(entry)
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    return entry
  },

  async listCompetitors(orgId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    return ((org?.settings as any)?.competitors ?? []) as CompetitorProfile[]
  },

  async removeCompetitor(orgId: string, competitorId: string) {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.competitors = (settings.competitors ?? []).filter((c: any) => c.id !== competitorId)
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
  },

  async scrapeCompetitor(orgId: string, competitorId: string): Promise<ScrapedData> {
    const competitors = await this.listCompetitors(orgId) as any[]
    const comp = competitors.find((c: any) => c.id === competitorId)
    if (!comp) throw new Error('Competitor not found')
    const scraped = await scrapeWebsite(comp.website)

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { settings: true } })
    const settings: any = org?.settings ?? {}
    settings.competitors = (settings.competitors ?? []).map((c: any) =>
      c.id === competitorId ? { ...c, scraped } : c
    )
    await prisma.organization.update({ where: { id: orgId }, data: { settings } })
    return scraped
  },

  async scrapeAll(orgId: string): Promise<Record<string, ScrapedData>> {
    const competitors = await this.listCompetitors(orgId) as any[]
    const results: Record<string, ScrapedData> = {}
    for (const comp of competitors) {
      results[comp.id] = await this.scrapeCompetitor(orgId, comp.id)
    }
    return results
  },

  async getCompetitiveAnalysis(orgId: string): Promise<any> {
    const competitors = await this.listCompetitors(orgId) as any[]
    if (competitors.length === 0) {
      return { summary: 'No competitors added yet. Add competitors to get analysis.', insights: [], swot: null }
    }

    const competitorSummary = competitors.map((c: any) => {
      const s = c.scraped
      return `- ${c.name} (${c.website}): Tech stack: ${s?.technologies?.join(', ') || 'unknown'}. Reviews: ${s?.reviews?.count ?? 'N/A'} reviews at ${s?.reviews?.rating ?? 'N/A'}/5. Social: ${Object.keys(s?.socialLinks ?? {}).join(', ') || 'none detected'}.`
    }).join('\n')

    try {
      const prompt = `You are a business intelligence analyst. Analyze these competitors and provide insights:\n\n${competitorSummary}\n\nProvide:\n1. Key competitive advantages each competitor has\n2. Gaps in the market you can exploit\n3. Technology and marketing recommendations\n4. A brief SWOT summary for our business vs these competitors\n\nBe specific and actionable.`

      const insight = await aiService.chat(prompt, undefined, orgId)
      return {
        summary: insight,
        competitorCount: competitors.length,
        lastAnalyzed: new Date().toISOString(),
      }
    } catch {
      return {
        summary: 'Unable to generate AI analysis at this time. Please check your AI configuration.',
        competitorCount: competitors.length,
        lastAnalyzed: new Date().toISOString(),
      }
    }
  },

  async getCompetitorWithData(orgId: string, competitorId: string) {
    const competitors = await this.listCompetitors(orgId) as any[]
    return competitors.find((c: any) => c.id === competitorId) ?? null
  },
}
