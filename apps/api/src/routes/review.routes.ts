import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { reviewService } from '../services/review.service.js'

export const reviewRouter = Router()

reviewRouter.use(requireAuth, requireOrganization)

reviewRouter.get('/', async (req, res) => {
  const { platform, sentiment, responded, page, limit } = req.query
  const data = await reviewService.getReviews(req.organization!.id, {
    platform: platform as string | undefined,
    sentiment: sentiment as string | undefined,
    responded: responded !== undefined ? responded === 'true' : undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

reviewRouter.post('/', async (req, res) => {
  const review = await reviewService.createReview(req.organization!.id, req.body)
  res.status(201).json(review)
})

reviewRouter.get('/stats', async (req, res) => {
  const data = await reviewService.getStats(req.organization!.id)
  res.json(data)
})

reviewRouter.post('/:reviewId/ai-response', async (req, res) => {
  const data = await reviewService.generateAiResponse(req.organization!.id, req.params['reviewId']!)
  res.json(data)
})

reviewRouter.post('/:reviewId/respond', async (req, res) => {
  const { response } = req.body
  const data = await reviewService.submitResponse(req.organization!.id, req.params['reviewId']!, response)
  res.json(data)
})
