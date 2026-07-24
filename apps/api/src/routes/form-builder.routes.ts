import { Router } from 'express'
import { z } from 'zod'
import { formBuilderService } from '../services/form-builder.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const formBuilderRouter = Router()

// Public: render form and submit
formBuilderRouter.get('/public/:id', async (req, res) => {
  try {
    const form = await formBuilderService.getFormByIdPublic(req.params.id)
    if (!form) return res.status(404).json({ error: 'Form not found' })
    res.json({ form })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch form' })
  }
})

formBuilderRouter.post('/public/:id/submit', async (req, res) => {
  try {
    const meta = {
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      referrer: req.headers['referer'],
    }
    const result = await formBuilderService.submitForm(req.params.id, req.body, meta)
    res.status(201).json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Submission failed' })
  }
})

formBuilderRouter.use(authenticate)

formBuilderRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const forms = await formBuilderService.getForms(orgId)
    res.json({ forms })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch forms' })
  }
})

formBuilderRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const form = await formBuilderService.getForm(orgId, req.params.id)
    if (!form) return res.status(404).json({ error: 'Not found' })
    res.json({ form })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch form' })
  }
})

formBuilderRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      description: z.string().optional(),
      fields: z.array(z.any()),
      settings: z.record(z.any()).optional(),
    }).parse(req.body)
    const form = await formBuilderService.createForm(orgId, data)
    res.status(201).json({ form })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create form' })
  }
})

formBuilderRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await formBuilderService.updateForm(orgId, req.params.id, req.body)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update form' })
  }
})

formBuilderRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await formBuilderService.deleteForm(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete form' })
  }
})

formBuilderRouter.get('/:id/submissions', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { page, limit } = req.query as Record<string, string>
    const result = await formBuilderService.getSubmissions(
      orgId,
      req.params.id,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    )
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch submissions' })
  }
})
