import { Router } from 'express'
import { z } from 'zod'
import { webhookDeliveryService } from '../services/webhook-delivery.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const webhookOutboundRouter = Router()

webhookOutboundRouter.use(authenticate)

webhookOutboundRouter.get('/events', (_req, res) => {
  res.json({ events: webhookDeliveryService.getSupportedEvents() })
})

webhookOutboundRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const webhooks = await webhookDeliveryService.getWebhooks(orgId)
    res.json({ webhooks })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch webhooks' })
  }
})

webhookOutboundRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      url: z.string().url(),
      events: z.array(z.string()).min(1),
      secret: z.string().optional(),
      headers: z.record(z.string()).optional(),
    }).parse(req.body)

    const webhook = await webhookDeliveryService.createWebhook(orgId, data)
    res.status(201).json({ webhook })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create webhook' })
  }
})

webhookOutboundRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      url: z.string().url().optional(),
      events: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)

    await webhookDeliveryService.updateWebhook(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update webhook' })
  }
})

webhookOutboundRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await webhookDeliveryService.deleteWebhook(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete webhook' })
  }
})

webhookOutboundRouter.post('/:id/test', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await webhookDeliveryService.testWebhook(orgId, req.params.id)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to test webhook' })
  }
})
