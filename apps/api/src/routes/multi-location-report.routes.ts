import { Router } from 'express'
import { multiLocationReportService } from '../services/multi-location-report.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const multiLocationReportRouter = Router()
multiLocationReportRouter.use(authenticate)

multiLocationReportRouter.get('/summaries', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const summaries = await multiLocationReportService.getLocationSummaries(orgId)
    res.json({ summaries })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch summaries' })
  }
})

multiLocationReportRouter.get('/aggregate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const metrics = await multiLocationReportService.getAggregateMetrics(orgId)
    res.json(metrics)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch aggregate metrics' })
  }
})

multiLocationReportRouter.get('/comparison', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const metric = (req.query.metric as 'revenue' | 'appointments' | 'contacts') ?? 'revenue'
    const comparison = await multiLocationReportService.getLocationComparison(orgId, metric)
    res.json({ comparison })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch comparison' })
  }
})

multiLocationReportRouter.get('/top-performers', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const performers = await multiLocationReportService.getTopPerformers(orgId)
    res.json(performers)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch top performers' })
  }
})
