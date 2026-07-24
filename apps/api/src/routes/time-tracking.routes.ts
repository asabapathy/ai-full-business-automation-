import { Router } from 'express'
import { z } from 'zod'
import { timeTrackingService } from '../services/time-tracking.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const timeTrackingRouter = Router()
timeTrackingRouter.use(authenticate)

timeTrackingRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await timeTrackingService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

timeTrackingRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { userId, contactId, projectId } = req.query as Record<string, string>
    const entries = await timeTrackingService.getEntries(orgId, { userId, contactId, projectId })
    res.json({ entries })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

timeTrackingRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const entry = await timeTrackingService.getEntry(orgId, req.params.id)
    if (!entry) return res.status(404).json({ error: 'Not found' })
    res.json({ entry })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

timeTrackingRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const data = z.object({
      description: z.string().optional(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime().optional(),
      duration: z.number().int().positive().optional(),
      billable: z.boolean().optional(),
      hourlyRate: z.number().positive().optional(),
      contactId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }).parse(req.body)
    const entry = await timeTrackingService.createEntry(orgId, {
      ...data,
      userId,
      startTime: new Date(data.startTime),
      endTime: data.endTime ? new Date(data.endTime) : undefined,
    })
    res.status(201).json({ entry })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

timeTrackingRouter.post('/start', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const data = z.object({
      description: z.string().optional(),
      billable: z.boolean().optional(),
      hourlyRate: z.number().positive().optional(),
      contactId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }).parse(req.body)
    const entry = await timeTrackingService.createEntry(orgId, { ...data, userId, startTime: new Date() })
    res.status(201).json({ entry })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

timeTrackingRouter.post('/:id/stop', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const entry = await timeTrackingService.stopTimer(orgId, req.params.id)
    res.json({ entry })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

timeTrackingRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      description: z.string().optional(),
      billable: z.boolean().optional(),
      hourlyRate: z.number().positive().optional(),
      contactId: z.string().uuid().optional(),
      projectId: z.string().uuid().optional(),
    }).parse(req.body)
    await timeTrackingService.updateEntry(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

timeTrackingRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await timeTrackingService.deleteEntry(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
