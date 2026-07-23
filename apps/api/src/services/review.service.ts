import { AIProviderFactory } from '@kanavu/ai-core'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

export class ReviewService {
  private provider = AIProviderFactory.createFromEnv()

  async getReviews(organizationId: string, filters: { platform?: string; sentiment?: string; responded?: boolean; page?: number; limit?: number }) {
    const { platform, sentiment, responded, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      ...(platform ? { platform: platform as never } : {}),
      ...(sentiment ? { sentiment: sentiment as never } : {}),
      ...(responded !== undefined ? { response: responded ? { not: null } : null } : {}),
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({ where, orderBy: { publishedAt: 'desc' }, skip, take: limit }),
      prisma.review.count({ where }),
    ])

    return { reviews, total, page, limit }
  }

  async createReview(organizationId: string, data: {
    platform: string
    reviewerName?: string
    rating: number
    content?: string
    publishedAt?: string
    externalId?: string
  }) {
    return prisma.review.create({
      data: {
        organizationId,
        platform: data.platform as never,
        reviewerName: data.reviewerName,
        rating: data.rating,
        content: data.content,
        sentiment: data.rating >= 4 ? 'POSITIVE' : data.rating >= 3 ? 'NEUTRAL' : 'NEGATIVE',
        sentimentScore: (data.rating - 1) / 4,
        externalId: data.externalId,
        publishedAt: data.publishedAt ? new Date(data.publishedAt) : new Date(),
      },
    })
  }

  async generateAiResponse(organizationId: string, reviewId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const review = await prisma.review.findFirst({ where: { id: reviewId, organizationId } })
    if (!review) throw new Error('Review not found')

    const prompt = `Write a professional, empathetic response to this ${review.sentiment.toLowerCase()} customer review for ${org.name}.

Review (${review.rating}/5 stars): "${review.content ?? 'No written review'}"
Reviewer: ${review.reviewerName ?? 'A customer'}
Platform: ${review.platform}

Guidelines:
- Thank them by name if provided
- For positive reviews: express gratitude, reinforce their experience, invite them back
- For negative reviews: apologize, take responsibility, offer to make it right offline
- Keep it concise (2-4 sentences), professional, and authentic
- Never be defensive or dismissive
- End with a clear next step (contact info, invitation to return, etc.)

Write ONLY the response text, nothing else.`

    const result = await this.provider.generate({
      messages: [{ role: 'user', content: prompt }],
      systemPrompt: `You are the customer experience manager for ${org.name}.`,
      temperature: 0.7,
      maxTokens: 300,
    })

    await prisma.review.update({
      where: { id: reviewId },
      data: { aiResponse: result.content },
    })

    return { reviewId, aiResponse: result.content }
  }

  async submitResponse(organizationId: string, reviewId: string, response: string) {
    const review = await prisma.review.findFirst({ where: { id: reviewId, organizationId } })
    if (!review) throw new Error('Review not found')

    return prisma.review.update({
      where: { id: reviewId },
      data: { response, respondedAt: new Date() },
    })
  }

  async getStats(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)

    const [total, recent, bySentiment, byPlatform, avgRatingResult] = await Promise.all([
      prisma.review.count({ where: { organizationId } }),
      prisma.review.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.review.groupBy({
        by: ['sentiment'],
        where: { organizationId },
        _count: true,
      }),
      prisma.review.groupBy({
        by: ['platform'],
        where: { organizationId },
        _count: true,
        _avg: { rating: true },
      }),
      prisma.review.aggregate({ where: { organizationId }, _avg: { rating: true } }),
    ])

    const responded = await prisma.review.count({ where: { organizationId, respondedAt: { not: null } } })

    return {
      total,
      recent,
      averageRating: Number((avgRatingResult._avg.rating ?? 0).toFixed(1)),
      responseRate: total > 0 ? Math.round((responded / total) * 100) : 0,
      bySentiment: bySentiment.map(s => ({ sentiment: s.sentiment, count: s._count })),
      byPlatform: byPlatform.map(p => ({ platform: p.platform, count: p._count, avgRating: Number((p._avg.rating ?? 0).toFixed(1)) })),
    }
  }
}

export const reviewService = new ReviewService()
