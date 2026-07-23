import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { analyticsService } from '../services/analytics.service.js'

export const analyticsRouter = Router()

analyticsRouter.use(requireAuth, requireOrganization)

analyticsRouter.get('/overview', async (req, res) => {
  const period = (req.query['period'] as '7d' | '30d' | '90d' | '1y') ?? '30d'
  const data = await analyticsService.getOverview(req.organization!.id, period)
  res.json(data)
})

analyticsRouter.get('/revenue', async (req, res) => {
  const period = (req.query['period'] as '30d' | '90d' | '1y') ?? '30d'
  const data = await analyticsService.getRevenueChart(req.organization!.id, period)
  res.json(data)
})

analyticsRouter.get('/pipeline', async (req, res) => {
  const data = await analyticsService.getPipelineFunnel(req.organization!.id)
  res.json(data)
})

analyticsRouter.get('/channels', async (req, res) => {
  const data = await analyticsService.getTopChannels(req.organization!.id)
  res.json(data)
})

analyticsRouter.get('/contacts/growth', async (req, res) => {
  const data = await analyticsService.getContactGrowth(req.organization!.id)
  res.json(data)
})

analyticsRouter.get('/appointments', async (req, res) => {
  const data = await analyticsService.getAppointmentStats(req.organization!.id)
  res.json(data)
})
