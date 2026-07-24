import { Router } from 'express'
import { z } from 'zod'
import { paymentLinksService } from '../services/payment-links.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const paymentLinksRouter = Router()
paymentLinksRouter.use(authenticate)

paymentLinksRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await paymentLinksService.getStats(orgId)
    res.json(stats)
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

paymentLinksRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, contactId } = req.query as Record<string, string>
    const links = await paymentLinksService.getLinks(orgId, { status, contactId })
    res.json({ links })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

paymentLinksRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      amount: z.number().positive(),
      currency: z.string().optional(),
      description: z.string().optional(),
      invoiceId: z.string().uuid().optional(),
      contactId: z.string().uuid().optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(req.body)
    const link = await paymentLinksService.createPaymentLink(orgId, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    })
    res.status(201).json({ link })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

paymentLinksRouter.post('/:id/deactivate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const link = await paymentLinksService.deactivateLink(orgId, req.params.id)
    res.json({ link })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

paymentLinksRouter.post('/:id/mark-paid', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const link = await paymentLinksService.markPaid(orgId, req.params.id)
    res.json({ link })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
