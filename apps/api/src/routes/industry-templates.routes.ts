import { Router } from 'express'
import { industryTemplatesService } from '../services/industry-templates.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const industryTemplatesRouter = Router()
industryTemplatesRouter.use(authenticate)

industryTemplatesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await industryTemplatesService.listTemplates(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'industry templates list error')
    res.status(500).json({ success: false, error: 'Failed to list templates' })
  }
})

industryTemplatesRouter.get('/:id', async (req, res) => {
  try {
    const template = industryTemplatesService.getBuiltinTemplate(req.params.id)
    if (!template) return res.status(404).json({ success: false, error: 'Template not found' })
    res.json({ success: true, data: template })
  } catch (err) {
    logger.error(err, 'industry template get error')
    res.status(500).json({ success: false, error: 'Failed to get template' })
  }
})

industryTemplatesRouter.post('/:id/apply', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await industryTemplatesService.applyTemplate(orgId, req.params.id)
    res.json({ success: true, data: result })
  } catch (err) {
    logger.error(err, 'industry template apply error')
    res.status(500).json({ success: false, error: 'Failed to apply template' })
  }
})
