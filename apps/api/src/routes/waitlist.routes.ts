import { Router } from 'express'
import { z } from 'zod'
import { waitlistService } from '../services/waitlist.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const waitlistRouter = Router()
waitlistRouter.use(authenticate)

waitlistRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await waitlistService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

waitlistRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, serviceId, page, limit } = req.query as Record<string, string>
    const result = await waitlistService.getEntries(orgId, {
      status,
      serviceId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch waitlist' })
  }
})

waitlistRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid(),
      serviceId: z.string().uuid().optional(),
      employeeId: z.string().uuid().optional(),
      preferredDate: z.string().datetime().optional(),
      preferredTimeFrom: z.string().optional(),
      preferredTimeTo: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body)
    const entry = await waitlistService.addToWaitlist(orgId, {
      ...data,
      preferredDate: data.preferredDate ? new Date(data.preferredDate) : undefined,
    })
    res.status(201).json({ entry })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to add to waitlist' })
  }
})

waitlistRouter.post('/notify', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { slotDate, serviceId } = z.object({ slotDate: z.string().datetime(), serviceId: z.string().optional() }).parse(req.body)
    const result = await waitlistService.notifyWaitlist(orgId, new Date(slotDate), serviceId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to notify waitlist' })
  }
})

waitlistRouter.patch('/:id/status', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = z.object({ status: z.string() }).parse(req.body)
    await waitlistService.updateStatus(orgId, req.params.id, status)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

waitlistRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await waitlistService.removeEntry(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to remove entry' })
  }
})
