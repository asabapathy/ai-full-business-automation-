import { Router } from 'express'
import { appointmentReschedulerService } from '../services/appointment-rescheduler.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const appointmentReschedulerRouter = Router()

// Public: email confirmation link
appointmentReschedulerRouter.get('/:appointmentId/confirm-email', async (req, res) => {
  try {
    const result = await appointmentReschedulerService.confirmReschedule(req.params.appointmentId)
    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    if (result.success) {
      res.redirect(`${webBase}/portal/booking-confirmed?id=${result.newAppointmentId}`)
    } else {
      res.redirect(`${webBase}/portal/booking-expired`)
    }
  } catch (err) {
    logger.error(err)
    res.status(500).send('Error processing your request')
  }
})

appointmentReschedulerRouter.use(authenticate)

appointmentReschedulerRouter.post('/:appointmentId/trigger', async (req, res) => {
  try {
    const result = await appointmentReschedulerService.handleCancellation(req.params.appointmentId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Reschedule failed' })
  }
})

appointmentReschedulerRouter.post('/:appointmentId/confirm', async (req, res) => {
  try {
    const result = await appointmentReschedulerService.confirmReschedule(req.params.appointmentId)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Confirm failed' })
  }
})
