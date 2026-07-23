import { Router } from 'express'
import { forecastingService } from '../services/forecasting.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const forecastingRouter = Router()

forecastingRouter.use(authenticate)

forecastingRouter.get('/forecast', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { days } = req.query as { days?: string }
    const forecast = await forecastingService.generateForecast(orgId, days ? parseInt(days, 10) : undefined)
    res.json(forecast)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate forecast' })
  }
})

forecastingRouter.get('/forecast/latest', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const forecast = await forecastingService.getLatestForecast(orgId)
    res.json({ forecast })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch latest forecast' })
  }
})

forecastingRouter.get('/historical', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { days } = req.query as { days?: string }
    const data = await forecastingService.getHistoricalRevenue(orgId, days ? parseInt(days, 10) : undefined)
    res.json({ data })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch historical revenue' })
  }
})

forecastingRouter.get('/monthly-comparison', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const comparison = await forecastingService.getMonthlyComparison(orgId)
    res.json(comparison)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch monthly comparison' })
  }
})
