import { Router } from 'express'
import { z } from 'zod'
import { pushNotificationsService } from '../services/push-notifications.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const pushNotificationsRouter = Router()
pushNotificationsRouter.use(authenticate)

pushNotificationsRouter.get('/vapid-key', async (req, res) => {
  try {
    const key = pushNotificationsService.getVapidPublicKey()
    res.json({ publicKey: key })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

pushNotificationsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await pushNotificationsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

pushNotificationsRouter.post('/subscribe', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const sub = z.object({
      endpoint: z.string().url(),
      p256dh: z.string(),
      auth: z.string(),
    }).parse(req.body)
    await pushNotificationsService.saveSubscription(orgId, userId, sub)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

pushNotificationsRouter.post('/unsubscribe', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { endpoint } = z.object({ endpoint: z.string() }).parse(req.body)
    await pushNotificationsService.removeSubscription(orgId, endpoint)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

pushNotificationsRouter.post('/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const payload = z.object({
      title: z.string().min(1),
      body: z.string().min(1),
      url: z.string().optional(),
    }).parse(req.body)
    const result = await pushNotificationsService.sendPush(orgId, payload)
    res.json(result)
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
