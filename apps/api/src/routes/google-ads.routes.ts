import { Router } from 'express'
import { googleAdsService } from '../services/google-ads.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const googleAdsRouter = Router()

googleAdsRouter.get('/auth', authenticate, async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const url = await googleAdsService.getOAuthUrl(orgId)
    res.json({ success: true, data: { url } })
  } catch (err) {
    logger.error(err, 'google ads auth error')
    res.status(500).json({ success: false, error: 'Failed to generate OAuth URL' })
  }
})

googleAdsRouter.get('/callback', async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string }
    const { orgId } = JSON.parse(Buffer.from(state, 'base64').toString())
    await googleAdsService.handleCallback(code, orgId)
    res.redirect(`${process.env.APP_URL}/dashboard/google-ads?connected=true`)
  } catch (err) {
    logger.error(err, 'google ads callback error')
    res.redirect(`${process.env.APP_URL}/dashboard/google-ads?error=oauth_failed`)
  }
})

googleAdsRouter.use(authenticate)

googleAdsRouter.get('/status', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const status = await googleAdsService.getConnectionStatus(orgId)
    res.json({ success: true, data: status })
  } catch (err) {
    logger.error(err, 'google ads status error')
    res.status(500).json({ success: false, error: 'Failed to get status' })
  }
})

googleAdsRouter.post('/config', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { customerId, developerToken } = req.body as { customerId: string; developerToken: string }
    await googleAdsService.saveConfig(orgId, { customerId, developerToken })
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'google ads config error')
    res.status(500).json({ success: false, error: 'Failed to save config' })
  }
})

googleAdsRouter.get('/summary', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await googleAdsService.getAccountSummary(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'google ads summary error')
    res.status(500).json({ success: false, error: 'Failed to get summary' })
  }
})

googleAdsRouter.get('/campaigns', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const campaigns = await googleAdsService.listCampaigns(orgId)
    res.json({ success: true, data: campaigns })
  } catch (err) {
    logger.error(err, 'google ads campaigns error')
    res.status(500).json({ success: false, error: 'Failed to list campaigns' })
  }
})

googleAdsRouter.post('/campaigns', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await googleAdsService.createCampaign(orgId, req.body)
    res.json({ success: true, data: result })
  } catch (err) {
    logger.error(err, 'google ads create campaign error')
    res.status(500).json({ success: false, error: 'Failed to create campaign' })
  }
})

googleAdsRouter.patch('/campaigns/:id/status', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.body as { status: 'ENABLED' | 'PAUSED' }
    await googleAdsService.updateCampaignStatus(orgId, req.params.id, status)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'google ads update status error')
    res.status(500).json({ success: false, error: 'Failed to update status' })
  }
})

googleAdsRouter.get('/campaigns/:id/metrics', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const days = parseInt(req.query.days as string) || 30
    const data = await googleAdsService.getCampaignMetrics(orgId, req.params.id, days)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'google ads metrics error')
    res.status(500).json({ success: false, error: 'Failed to get metrics' })
  }
})
