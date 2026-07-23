import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { notificationService } from '../services/notification.service.js'

export const notificationsRouter = Router()

notificationsRouter.use(requireAuth, requireOrganization)

notificationsRouter.get('/', async (req, res) => {
  const { unreadOnly, page, limit } = req.query
  const data = await notificationService.getNotifications(req.organization!.id, req.user!.id, {
    unreadOnly: unreadOnly === 'true',
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

notificationsRouter.get('/unread-count', async (req, res) => {
  const data = await notificationService.getUnreadCount(req.organization!.id, req.user!.id)
  res.json(data)
})

notificationsRouter.post('/mark-read', async (req, res) => {
  const { ids } = req.body
  await notificationService.markRead(req.organization!.id, req.user!.id, ids)
  res.json({ success: true })
})

notificationsRouter.post('/mark-all-read', async (req, res) => {
  await notificationService.markAllRead(req.organization!.id, req.user!.id)
  res.json({ success: true })
})
