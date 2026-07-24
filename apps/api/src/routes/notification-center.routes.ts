import { Router } from 'express'
import { z } from 'zod'
import { notificationCenterService } from '../services/notification-center.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const notificationCenterRouter = Router()
notificationCenterRouter.use(authenticate)

notificationCenterRouter.get('/unread-count', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const count = await notificationCenterService.getUnreadCount(orgId, userId)
    res.json({ count })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

notificationCenterRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 30
    res.json(await notificationCenterService.getNotifications(orgId, userId, page, limit))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

notificationCenterRouter.post('/mark-all-read', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    await notificationCenterService.markAllRead(orgId, userId)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

notificationCenterRouter.patch('/:id/read', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    await notificationCenterService.markRead(orgId, userId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

notificationCenterRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    await notificationCenterService.deleteNotification(orgId, userId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

notificationCenterRouter.post('/broadcast', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().min(1),
      message: z.string().min(1),
      type: z.string().optional(),
      actionUrl: z.string().optional(),
    }).parse(req.body)
    await notificationCenterService.broadcastToOrg(orgId, data)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
