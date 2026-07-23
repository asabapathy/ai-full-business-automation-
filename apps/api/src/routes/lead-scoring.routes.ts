import { Router } from 'express'
import { z } from 'zod'
import { leadScoringService } from '../services/lead-scoring.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const leadScoringRouter = Router()

leadScoringRouter.use(authenticate)

leadScoringRouter.get('/top', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const limit = Number(req.query['limit'] ?? 20)
    const leads = await leadScoringService.getTopLeads(orgId, limit)
    res.json({ leads })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch top leads' })
  }
})

leadScoringRouter.get('/distribution', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const dist = await leadScoringService.getScoreDistribution(orgId)
    res.json({ distribution: dist })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch distribution' })
  }
})

leadScoringRouter.get('/contact/:contactId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const score = await leadScoringService.getContactScore(orgId, req.params.contactId)
    res.json({ score })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch score' })
  }
})

leadScoringRouter.post('/score/:contactId', async (req, res) => {
  try {
    const result = await leadScoringService.scoreContact(req.params.contactId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to score contact' })
  }
})

leadScoringRouter.post('/score-all', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await leadScoringService.scoreAllContacts(orgId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to score contacts' })
  }
})
