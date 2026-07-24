import { Router } from 'express'
import { z } from 'zod'
import { resourceBookingService } from '../services/resource-booking.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const resourceBookingRouter = Router()
resourceBookingRouter.use(authenticate)

resourceBookingRouter.get('/schedule', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { from, to } = req.query as Record<string, string>
    const schedule = await resourceBookingService.getResourceSchedule(
      orgId,
      from ? new Date(from) : new Date(),
      to ? new Date(to) : new Date(Date.now() + 7 * 86400000),
    )
    res.json({ schedule })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch schedule' })
  }
})

resourceBookingRouter.get('/bookings', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { resourceId, from, to } = req.query as Record<string, string>
    const bookings = await resourceBookingService.getBookings(
      orgId,
      resourceId,
      from ? new Date(from) : undefined,
      to ? new Date(to) : undefined,
    )
    res.json({ bookings })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch bookings' })
  }
})

resourceBookingRouter.post('/bookings', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      resourceId: z.string().uuid(),
      startTime: z.string().datetime(),
      endTime: z.string().datetime(),
      title: z.string().optional(),
      appointmentId: z.string().uuid().optional(),
      notes: z.string().optional(),
    }).parse(req.body)
    const booking = await resourceBookingService.bookResource(orgId, {
      ...data,
      startTime: new Date(data.startTime),
      endTime: new Date(data.endTime),
      bookedBy: (req as any).user.id,
    })
    res.status(201).json({ booking })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to book resource' })
  }
})

resourceBookingRouter.delete('/bookings/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await resourceBookingService.cancelBooking(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to cancel booking' })
  }
})

resourceBookingRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const resources = await resourceBookingService.getResources(orgId)
    res.json({ resources })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch resources' })
  }
})

resourceBookingRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const resource = await resourceBookingService.getResource(orgId, req.params.id)
    if (!resource) return res.status(404).json({ error: 'Not found' })
    res.json({ resource })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch resource' })
  }
})

resourceBookingRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      type: z.string().optional(),
      description: z.string().optional(),
      capacity: z.number().int().positive().optional(),
      color: z.string().optional(),
    }).parse(req.body)
    const resource = await resourceBookingService.createResource(orgId, data)
    res.status(201).json({ resource })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create resource' })
  }
})

resourceBookingRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await resourceBookingService.updateResource(orgId, req.params.id, req.body)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update resource' })
  }
})

resourceBookingRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await resourceBookingService.deleteResource(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete resource' })
  }
})
