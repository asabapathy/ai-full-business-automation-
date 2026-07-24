import { Router } from 'express'
import { z } from 'zod'
import { emailTemplatesService } from '../services/email-templates.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const emailTemplatesRouter = Router()
emailTemplatesRouter.use(authenticate)

emailTemplatesRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await emailTemplatesService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailTemplatesRouter.get('/categories', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const categories = await emailTemplatesService.getCategories(orgId)
    res.json({ categories })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailTemplatesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category } = req.query as Record<string, string>
    const templates = await emailTemplatesService.getTemplates(orgId, category)
    res.json({ templates })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailTemplatesRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const template = await emailTemplatesService.getTemplate(orgId, req.params.id)
    if (!template) return res.status(404).json({ error: 'Not found' })
    res.json({ template })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

emailTemplatesRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      subject: z.string().min(1),
      htmlContent: z.string().min(1),
      category: z.string().optional(),
      variables: z.array(z.string()).optional(),
    }).parse(req.body)
    const template = await emailTemplatesService.createTemplate(orgId, data)
    res.status(201).json({ template })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailTemplatesRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      subject: z.string().optional(),
      htmlContent: z.string().optional(),
      category: z.string().optional(),
      variables: z.array(z.string()).optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    await emailTemplatesService.updateTemplate(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailTemplatesRouter.post('/:id/duplicate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const template = await emailTemplatesService.duplicateTemplate(orgId, req.params.id)
    res.status(201).json({ template })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

emailTemplatesRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await emailTemplatesService.deleteTemplate(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
