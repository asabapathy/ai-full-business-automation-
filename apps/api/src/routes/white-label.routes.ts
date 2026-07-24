import { Router } from 'express'
import { whiteLabelService } from '../services/white-label.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const whiteLabelRouter = Router()
whiteLabelRouter.use(authenticate)

whiteLabelRouter.get('/config', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await whiteLabelService.getConfig(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label get config error')
    res.status(500).json({ success: false, error: 'Failed to get config' })
  }
})

whiteLabelRouter.post('/config', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await whiteLabelService.saveConfig(orgId, req.body)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label save config error')
    res.status(500).json({ success: false, error: 'Failed to save config' })
  }
})

whiteLabelRouter.post('/verify-domain', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { domain } = req.body as { domain: string }
    if (!domain) return res.status(400).json({ success: false, error: 'domain required' })
    const data = await whiteLabelService.verifyDomain(orgId, domain)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label verify domain error')
    res.status(500).json({ success: false, error: 'Failed to verify domain' })
  }
})
