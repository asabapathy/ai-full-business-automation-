import { Router } from 'express'
import { z } from 'zod'
import { billingPortalService } from '../services/billing-portal.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const billingPortalRouter = Router()
billingPortalRouter.use(authenticate)

billingPortalRouter.get('/subscription', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const subscription = await billingPortalService.getSubscriptionDetails(orgId)
    res.json({ subscription })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch subscription' })
  }
})

billingPortalRouter.get('/invoices', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const invoices = await billingPortalService.getInvoiceHistory(orgId)
    res.json({ invoices })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

billingPortalRouter.post('/portal-session', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { returnUrl } = z.object({ returnUrl: z.string().url() }).parse(req.body)
    const result = await billingPortalService.createPortalSession(orgId, returnUrl)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to create portal session' })
  }
})

billingPortalRouter.post('/sync', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await billingPortalService.syncFromStripe(orgId)
    res.json({ data })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to sync from Stripe' })
  }
})
