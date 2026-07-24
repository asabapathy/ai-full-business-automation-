import { Router } from 'express'
import { z } from 'zod'
import { recurringAppointmentsService } from '../services/recurring-appointments.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const recurringAppointmentsRouter = Router()
recurringAppointmentsRouter.use(authenticate)

recurringAppointmentsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { page, limit } = req.query as Record<string, string>
    const result = await recurringAppointmentsService.getUpcomingRecurring(
      orgId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    )
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch recurring appointments' })
  }
})

recurringAppointmentsRouter.get('/:parentId/series', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const series = await recurringAppointmentsService.getRecurringSeries(orgId, req.params.parentId)
    res.json(series)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch series' })
  }
})

recurringAppointmentsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid().optional(),
      staffId: z.string().uuid().optional(),
      serviceId: z.string().uuid().optional(),
      title: z.string(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      notes: z.string().optional(),
      recurrence: z.object({
        frequency: z.enum(['daily', 'weekly', 'biweekly', 'monthly']),
        count: z.number().int().positive().optional(),
        until: z.string().datetime().optional(),
      }),
    }).parse(req.body)

    const series = await recurringAppointmentsService.createRecurringSeries(orgId, {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      recurrence: {
        ...data.recurrence,
        until: data.recurrence.until ? new Date(data.recurrence.until) : undefined,
      },
    })
    res.status(201).json(series)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create recurring series' })
  }
})

recurringAppointmentsRouter.delete('/:parentId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { fromDate } = req.query as Record<string, string>
    await recurringAppointmentsService.cancelSeries(
      orgId,
      req.params.parentId,
      fromDate ? new Date(fromDate) : undefined,
    )
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to cancel series' })
  }
})
