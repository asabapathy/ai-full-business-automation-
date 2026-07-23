import { describe, it, expect, vi } from 'vitest'
import { ReviewService } from '../services/review.service.js'
import { prisma } from '../services/database.js'

const reviewService = new ReviewService()
const ORG_ID = 'org-123'

const MOCK_REVIEW = {
  id: 'r1',
  organizationId: ORG_ID,
  platform: 'GOOGLE',
  reviewerName: 'Alice',
  rating: 5,
  content: 'Great service!',
  sentiment: 'POSITIVE',
  sentimentScore: 1.0,
  publishedAt: new Date(),
  createdAt: new Date(),
  response: null,
  respondedAt: null,
  aiResponse: null,
  externalId: null,
}

describe('ReviewService', () => {
  it('creates a review with correct sentiment for 5 stars', async () => {
    vi.mocked(prisma.review.create).mockResolvedValue(MOCK_REVIEW as never)
    await reviewService.createReview(ORG_ID, { platform: 'GOOGLE', rating: 5, reviewerName: 'Alice', content: 'Great!' })
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sentiment: 'POSITIVE', sentimentScore: 1 }),
      })
    )
  })

  it('sets NEGATIVE sentiment for 1 star', async () => {
    vi.mocked(prisma.review.create).mockResolvedValue({ ...MOCK_REVIEW, rating: 1, sentiment: 'NEGATIVE', sentimentScore: 0 } as never)
    await reviewService.createReview(ORG_ID, { platform: 'YELP', rating: 1 })
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sentiment: 'NEGATIVE' }),
      })
    )
  })

  it('sets NEUTRAL sentiment for 3 stars', async () => {
    vi.mocked(prisma.review.create).mockResolvedValue({ ...MOCK_REVIEW, rating: 3, sentiment: 'NEUTRAL' } as never)
    await reviewService.createReview(ORG_ID, { platform: 'GOOGLE', rating: 3 })
    expect(prisma.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sentiment: 'NEUTRAL' }),
      })
    )
  })

  it('throws when generating AI response for missing review', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ name: 'Test Biz', industry: 'GENERAL' } as never)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(null)
    await expect(reviewService.generateAiResponse(ORG_ID, 'bad-id')).rejects.toThrow('Review not found')
  })

  it('saves AI response on review record', async () => {
    vi.mocked(prisma.organization.findUnique).mockResolvedValue({ name: 'Test Biz', industry: 'GENERAL' } as never)
    vi.mocked(prisma.review.findFirst).mockResolvedValue(MOCK_REVIEW as never)
    vi.mocked(prisma.review.update).mockResolvedValue({ ...MOCK_REVIEW, aiResponse: 'AI response' } as never)

    const result = await reviewService.generateAiResponse(ORG_ID, 'r1')
    expect(result.aiResponse).toBe('AI response')
    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ aiResponse: expect.any(String) }) })
    )
  })

  it('submits human response', async () => {
    vi.mocked(prisma.review.findFirst).mockResolvedValue(MOCK_REVIEW as never)
    vi.mocked(prisma.review.update).mockResolvedValue({ ...MOCK_REVIEW, response: 'Thank you!' } as never)
    const result = await reviewService.submitResponse(ORG_ID, 'r1', 'Thank you!')
    expect(prisma.review.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ response: 'Thank you!', respondedAt: expect.any(Date) }) })
    )
    expect(result).toBeDefined()
  })
})
