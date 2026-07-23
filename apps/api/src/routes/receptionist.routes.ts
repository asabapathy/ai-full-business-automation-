import { Router } from 'express'
import { z } from 'zod'
import { receptionistService } from '../services/receptionist.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const receptionistRouter = Router()
receptionistRouter.use(authenticate)
receptionistRouter.use(requireOrganization)

const createAppointmentSchema = z.object({
  contactId: z.string().uuid().optional(),
  serviceId: z.string().uuid().optional(),
  staffId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  startTime: z.string(),
  duration: z.number().positive(),
  notes: z.string().optional(),
  sendConfirmation: z.boolean().optional(),
})

const aiBookingSchema = z.object({
  contactName: z.string().min(1),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
  serviceType: z.string().min(1),
  preferredDate: z.string().optional(),
  preferredTime: z.string().optional(),
  notes: z.string().optional(),
})

// Appointments
receptionistRouter.get('/appointments', async (req, res) => {
  const { status, date, staffId, page, limit } = req.query as Record<string, string>
  const result = await receptionistService.getAppointments(req.organizationId!, {
    status,
    date,
    staffId,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

receptionistRouter.post('/appointments', validate(createAppointmentSchema), async (req, res) => {
  const appointment = await receptionistService.createAppointment(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { appointment } })
})

receptionistRouter.patch('/appointments/:id/status', async (req, res) => {
  const { status } = req.body as { status: string }
  const appointment = await receptionistService.updateAppointmentStatus(req.organizationId!, req.params['id']!, status)
  res.json({ success: true, data: { appointment } })
})

// Availability
receptionistRouter.get('/availability', async (req, res) => {
  const { date, serviceId, staffId } = req.query as Record<string, string>
  const slots = await receptionistService.getAvailableSlots(req.organizationId!, { date, serviceId, staffId })
  res.json({ success: true, data: slots })
})

// Services
receptionistRouter.get('/services', async (req, res) => {
  const services = await receptionistService.getServices(req.organizationId!)
  res.json({ success: true, data: { services } })
})

// AI booking
receptionistRouter.post('/book', validate(aiBookingSchema), async (req, res) => {
  const result = await receptionistService.handleAiBooking(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})

// Analytics
receptionistRouter.get('/analytics', async (req, res) => {
  const analytics = await receptionistService.getAnalytics(req.organizationId!)
  res.json({ success: true, data: analytics })
})
