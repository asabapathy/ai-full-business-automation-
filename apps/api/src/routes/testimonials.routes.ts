import { Router } from 'express'
import { z } from 'zod'
import { testimonialService } from '../services/testimonial.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const testimonialsRouter = Router()

// Public: capture page and video submission
testimonialsRouter.get('/capture/:token', async (req, res) => {
  try {
    const testimonial = await testimonialService.getByToken(req.params.token)
    if (!testimonial) return res.status(404).json({ error: 'Not found or expired' })
    res.json({ testimonial })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to load capture page' })
  }
})

testimonialsRouter.post('/capture/:token/submit', async (req, res) => {
  try {
    const data = z.object({
      videoUrl: z.string().url(),
      thumbnailUrl: z.string().url().optional(),
      rating: z.number().int().min(1).max(5).optional(),
    }).parse(req.body)

    await testimonialService.submitVideo(req.params.token, data)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to submit video' })
  }
})

testimonialsRouter.use(authenticate)

testimonialsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as { status?: string }
    const testimonials = await testimonialService.getTestimonials(orgId, status)
    res.json({ testimonials })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch testimonials' })
  }
})

testimonialsRouter.post('/request', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid().optional(),
      appointmentId: z.string().uuid().optional(),
    }).parse(req.body)

    const result = await testimonialService.createRequest(orgId, data)
    res.status(201).json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create testimonial request' })
  }
})

testimonialsRouter.post('/:id/publish', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { platforms } = z.object({
      platforms: z.array(z.string()),
    }).parse(req.body)

    await testimonialService.publishTestimonial(orgId, req.params.id, platforms)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to publish testimonial' })
  }
})

testimonialsRouter.post('/:id/regenerate-summary', async (req, res) => {
  try {
    const testimonial = await testimonialService.getByToken(req.params.id)
    if (!testimonial) return res.status(404).json({ error: 'Not found' })
    await testimonialService.generateSummary(testimonial.token)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to regenerate summary' })
  }
})

testimonialsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await testimonialService.deleteTestimonial(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete testimonial' })
  }
})
