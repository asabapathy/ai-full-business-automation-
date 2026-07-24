import { Router } from 'express'
import { calendarService } from '../services/calendar.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const calendarRouter = Router()

// Public: OAuth callbacks
calendarRouter.get('/callback/google', async (req, res) => {
  try {
    const { code, state } = req.query as { code: string; state: string }
    await calendarService.handleGoogleCallback(code, state)
    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    res.redirect(`${webBase}/dashboard/settings?tab=integrations&connected=calendar`)
  } catch (err) {
    logger.error(err, 'calendar callback error')
    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    res.redirect(`${webBase}/dashboard/settings?tab=integrations&error=calendar`)
  }
})

calendarRouter.use(authenticate)

calendarRouter.get('/auth/google', (req, res) => {
  const user = (req as any).user as { id: string; organizationId: string }
  const url = calendarService.getGoogleAuthUrl(user.organizationId, user.id)
  res.json({ url })
})

calendarRouter.get('/integrations', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const integrations = await calendarService.getIntegrations(orgId)
    res.json({ integrations })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch integrations' })
  }
})

calendarRouter.delete('/integrations/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await calendarService.disconnectIntegration(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to disconnect' })
  }
})

calendarRouter.post('/sync', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await calendarService.syncAppointmentsToCalendar(orgId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to sync calendar' })
  }
})
