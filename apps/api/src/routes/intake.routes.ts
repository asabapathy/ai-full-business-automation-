import { Router } from 'express'
import { z } from 'zod'
import { intakeService } from '../services/intake.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const intakeRouter = Router()

// Public: complete intake form
intakeRouter.get('/public/:token', async (req, res) => {
  try {
    const intake = await intakeService.getIntakeByToken(req.params.token)
    if (!intake) return res.status(404).json({ error: 'Intake form not found' })
    if (intake.completedAt) return res.json({ intake, alreadyCompleted: true })
    res.json({ intake })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch intake' })
  }
})

intakeRouter.post('/public/:token/submit', async (req, res) => {
  try {
    const intake = await intakeService.submitIntake(req.params.token, req.body)
    res.json({ intake })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Submission failed' })
  }
})

intakeRouter.use(authenticate)

intakeRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const forms = await intakeService.getForms(orgId)
    res.json({ forms })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch forms' })
  }
})

intakeRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const form = await intakeService.getForm(orgId, req.params.id)
    if (!form) return res.status(404).json({ error: 'Not found' })
    res.json({ form })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch form' })
  }
})

intakeRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      description: z.string().optional(),
      serviceId: z.string().uuid().optional(),
      fields: z.array(z.any()),
    }).parse(req.body)
    const form = await intakeService.createForm(orgId, data)
    res.status(201).json({ form })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create form' })
  }
})

intakeRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await intakeService.updateForm(orgId, req.params.id, req.body)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update form' })
  }
})

intakeRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await intakeService.deleteForm(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete form' })
  }
})

intakeRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { contactId, appointmentId } = z.object({
      contactId: z.string().uuid(),
      appointmentId: z.string().uuid().optional(),
    }).parse(req.body)
    const result = await intakeService.sendIntakeLink(orgId, req.params.id, contactId, appointmentId)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to send intake' })
  }
})

intakeRouter.get('/:id/submissions', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { page, limit } = req.query as Record<string, string>
    const result = await intakeService.getSubmissions(orgId, req.params.id, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})
