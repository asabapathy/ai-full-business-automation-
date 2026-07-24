import { Router } from 'express'
import { z } from 'zod'
import { reviewRequestService } from '../services/review-request.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const reviewRequestsRouter = Router()

// Public: submit internal feedback via token
reviewRequestsRouter.post('/feedback', async (req, res) => {
  try {
    const { token, rating, note } = z.object({
      token: z.string(),
      rating: z.number().int().min(1).max(5),
      note: z.string().optional(),
    }).parse(req.body)

    const result = await reviewRequestService.submitInternalFeedback(token, rating, note)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to submit feedback' })
  }
})

reviewRequestsRouter.use(authenticate)

reviewRequestsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as { status?: string }
    const requests = await reviewRequestService.getRequests(orgId, status)
    res.json({ requests })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch review requests' })
  }
})

reviewRequestsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await reviewRequestService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

reviewRequestsRouter.post('/trigger/:appointmentId', async (req, res) => {
  try {
    await reviewRequestService.triggerAfterAppointment(req.params.appointmentId)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to send review request' })
  }
})
