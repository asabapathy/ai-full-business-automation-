import { Router } from 'express'
import { z } from 'zod'
import { customerSubscriptionService } from '../services/customer-subscription.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const customerSubscriptionsRouter = Router()

customerSubscriptionsRouter.use(authenticate)

customerSubscriptionsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as { status?: string }
    const subscriptions = await customerSubscriptionService.getSubscriptions(orgId, status)
    res.json({ subscriptions })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch subscriptions' })
  }
})

customerSubscriptionsRouter.get('/revenue', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const summary = await customerSubscriptionService.getRevenueSummary(orgId)
    res.json(summary)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch revenue summary' })
  }
})

customerSubscriptionsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const sub = await customerSubscriptionService.getSubscription(orgId, req.params.id)
    if (!sub) return res.status(404).json({ error: 'Subscription not found' })
    res.json({ subscription: sub })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

customerSubscriptionsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid(),
      name: z.string(),
      description: z.string().optional(),
      amount: z.number().positive(),
      currency: z.string().optional(),
      interval: z.enum(['monthly', 'quarterly', 'yearly']).optional(),
    }).parse(req.body)

    const sub = await customerSubscriptionService.createSubscription(orgId, data)
    res.status(201).json({ subscription: sub })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create subscription' })
  }
})

customerSubscriptionsRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      status: z.string().optional(),
      cancelAtPeriodEnd: z.boolean().optional(),
    }).parse(req.body)

    await customerSubscriptionService.updateSubscription(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update subscription' })
  }
})

customerSubscriptionsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { immediate } = req.query as { immediate?: string }
    await customerSubscriptionService.cancelSubscription(orgId, req.params.id, immediate === 'true')
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to cancel subscription' })
  }
})
