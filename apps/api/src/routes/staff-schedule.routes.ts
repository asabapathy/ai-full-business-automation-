import { Router } from 'express'
import { z } from 'zod'
import { staffScheduleService } from '../services/staff-schedule.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const staffScheduleRouter = Router()

staffScheduleRouter.use(authenticate)

staffScheduleRouter.get('/employees', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const employees = await staffScheduleService.getEmployees(orgId)
    res.json({ employees })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch employees' })
  }
})

staffScheduleRouter.get('/shifts', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { startDate, endDate } = req.query as { startDate: string; endDate: string }
    const shifts = await staffScheduleService.getShifts(orgId, startDate, endDate)
    res.json({ shifts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch shifts' })
  }
})

staffScheduleRouter.post('/shifts', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      employeeId: z.string().uuid(),
      date: z.string(),
      startTime: z.string(),
      endTime: z.string(),
      role: z.string().optional(),
      notes: z.string().optional(),
    }).parse(req.body)

    const shift = await staffScheduleService.createShift(orgId, data)
    res.status(201).json({ shift })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create shift' })
  }
})

staffScheduleRouter.patch('/shifts/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      role: z.string().optional(),
      notes: z.string().optional(),
      status: z.string().optional(),
    }).parse(req.body)

    await staffScheduleService.updateShift(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update shift' })
  }
})

staffScheduleRouter.delete('/shifts/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await staffScheduleService.deleteShift(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete shift' })
  }
})

staffScheduleRouter.get('/time-off', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as { status?: string }
    const requests = await staffScheduleService.getTimeOffRequests(orgId, status)
    res.json({ requests })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch time-off requests' })
  }
})

staffScheduleRouter.post('/time-off', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      employeeId: z.string().uuid(),
      startDate: z.string(),
      endDate: z.string(),
      type: z.enum(['vacation', 'sick', 'personal', 'other']),
      reason: z.string().optional(),
    }).parse(req.body)

    const request = await staffScheduleService.requestTimeOff(orgId, data)
    res.status(201).json({ request })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to submit time-off request' })
  }
})

staffScheduleRouter.post('/time-off/:id/approve', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const { approved } = z.object({ approved: z.boolean() }).parse(req.body)

    await staffScheduleService.approveTimeOff(orgId, req.params.id, userId, approved)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to process time-off request' })
  }
})

staffScheduleRouter.get('/week-summary', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { weekStart } = req.query as { weekStart: string }
    const summary = await staffScheduleService.getWeekSummary(orgId, weekStart ?? new Date().toISOString())
    res.json(summary)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch week summary' })
  }
})
