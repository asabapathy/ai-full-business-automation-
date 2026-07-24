import { Router } from 'express'
import { competitorIntelligenceService } from '../services/competitor-intelligence.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const competitorRouter = Router()
competitorRouter.use(authenticate)

competitorRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await competitorIntelligenceService.listCompetitors(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor list error')
    res.status(500).json({ success: false, error: 'Failed to list competitors' })
  }
})

competitorRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { name, website, googlePlaceId } = req.body as { name: string; website: string; googlePlaceId?: string }
    if (!name?.trim() || !website?.trim()) {
      return res.status(400).json({ success: false, error: 'name and website are required' })
    }
    const data = await competitorIntelligenceService.addCompetitor(orgId, { name, website, googlePlaceId })
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor add error')
    res.status(500).json({ success: false, error: 'Failed to add competitor' })
  }
})

competitorRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await competitorIntelligenceService.removeCompetitor(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'competitor remove error')
    res.status(500).json({ success: false, error: 'Failed to remove competitor' })
  }
})

competitorRouter.post('/:id/scrape', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await competitorIntelligenceService.scrapeCompetitor(orgId, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor scrape error')
    res.status(500).json({ success: false, error: 'Failed to scrape competitor' })
  }
})

competitorRouter.post('/scrape-all', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await competitorIntelligenceService.scrapeAll(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor scrape-all error')
    res.status(500).json({ success: false, error: 'Failed to scrape all competitors' })
  }
})

competitorRouter.get('/analysis', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await competitorIntelligenceService.getCompetitiveAnalysis(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor analysis error')
    res.status(500).json({ success: false, error: 'Failed to generate analysis' })
  }
})

competitorRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await competitorIntelligenceService.getCompetitorWithData(orgId, req.params.id)
    if (!data) return res.status(404).json({ success: false, error: 'Competitor not found' })
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'competitor get error')
    res.status(500).json({ success: false, error: 'Failed to get competitor' })
  }
})
