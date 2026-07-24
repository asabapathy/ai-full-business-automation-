import { Router } from 'express'
import { partnerMarketplaceService } from '../services/partner-marketplace.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const partnerMarketplaceRouter = Router()
partnerMarketplaceRouter.use(authenticate)

partnerMarketplaceRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category, search, pricing } = req.query as Record<string, string>
    const data = await partnerMarketplaceService.listListings(orgId, { category, search, pricing })
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'partner marketplace list error')
    res.status(500).json({ success: false, error: 'Failed to list partners' })
  }
})

partnerMarketplaceRouter.get('/categories', (_req, res) => {
  res.json({ success: true, data: partnerMarketplaceService.getCategories() })
})

partnerMarketplaceRouter.post('/:id/install', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await partnerMarketplaceService.installPartner(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'partner install error')
    res.status(500).json({ success: false, error: 'Failed to install partner' })
  }
})

partnerMarketplaceRouter.delete('/:id/install', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await partnerMarketplaceService.uninstallPartner(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'partner uninstall error')
    res.status(500).json({ success: false, error: 'Failed to uninstall partner' })
  }
})
