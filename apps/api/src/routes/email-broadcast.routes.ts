import { Router } from 'express'
import { z } from 'zod'
import { emailBroadcastService } from '../services/email-broadcast.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const emailBroadcastRouter = Router()
emailBroadcastRouter.use(authenticate)

emailBroadcastRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await emailBroadcastService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailBroadcastRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const broadcasts = await emailBroadcastService.getBroadcasts(orgId)
    res.json({ broadcasts })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailBroadcastRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const broadcast = await emailBroadcastService.getBroadcast(orgId, req.params.id)
    if (!broadcast) return res.status(404).json({ error: 'Not found' })
    res.json({ broadcast })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailBroadcastRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      subject: z.string().min(1),
      htmlContent: z.string().min(1),
      tags: z.array(z.string()).optional(),
    }).parse(req.body)
    const broadcast = await emailBroadcastService.createBroadcast(orgId, data)
    res.status(201).json({ broadcast })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailBroadcastRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      subject: z.string().min(1).optional(),
      htmlContent: z.string().min(1).optional(),
      tags: z.array(z.string()).optional(),
    }).parse(req.body)
    const broadcast = await emailBroadcastService.updateBroadcast(orgId, req.params.id, data)
    res.json({ broadcast })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailBroadcastRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await emailBroadcastService.deleteBroadcast(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailBroadcastRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const broadcast = await emailBroadcastService.sendBroadcast(orgId, req.params.id)
    res.json({ broadcast })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
