import { Router } from 'express'
import { z } from 'zod'
import { calendarSyncService } from '../services/calendar-sync.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const calendarSyncRouter = Router()

// Public: iCal feed (no auth — accessed by calendar apps via feed URL)
calendarSyncRouter.get('/feed/:token.ics', async (req, res) => {
  try {
    const ical = await calendarSyncService.generateIcal(req.params.token)
    res.set('Content-Type', 'text/calendar; charset=utf-8')
    res.set('Content-Disposition', 'attachment; filename="kanavu-calendar.ics"')
    res.send(ical)
  } catch (err: any) {
    logger.error(err)
    res.status(404).send('Not found')
  }
})

calendarSyncRouter.use(authenticate)

calendarSyncRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const feeds = await calendarSyncService.getFeeds(orgId)
    res.json({ feeds })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

calendarSyncRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      staffUserId: z.string().uuid().optional(),
    }).parse(req.body)
    const feed = await calendarSyncService.createFeed(orgId, data)
    res.status(201).json({ feed })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

calendarSyncRouter.patch('/:id/toggle', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    await calendarSyncService.toggleFeed(orgId, req.params.id, isActive)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

calendarSyncRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await calendarSyncService.deleteFeed(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
