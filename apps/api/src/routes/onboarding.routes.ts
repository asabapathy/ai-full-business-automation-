import { Router } from 'express'
import { z } from 'zod'
import { onboardingService } from '../services/onboarding.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const onboardingRouter = Router()
onboardingRouter.use(authenticate)

onboardingRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await onboardingService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

onboardingRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as Record<string, string>
    const checklists = await onboardingService.getChecklists(orgId, status)
    res.json({ checklists })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

onboardingRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const checklist = await onboardingService.getChecklist(orgId, req.params.id)
    if (!checklist) return res.status(404).json({ error: 'Not found' })
    res.json({ checklist })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

onboardingRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid(),
      title: z.string().min(1),
      customItems: z.array(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        order: z.number().int().optional(),
      })).optional(),
    }).parse(req.body)
    const checklist = await onboardingService.createChecklist(orgId, data)
    res.status(201).json({ checklist })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

onboardingRouter.post('/:id/items/:itemId/toggle', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const item = await onboardingService.toggleItem(orgId, req.params.id, req.params.itemId)
    res.json({ item })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

onboardingRouter.post('/:id/items', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
    }).parse(req.body)
    const item = await onboardingService.addItem(orgId, req.params.id, data)
    res.status(201).json({ item })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

onboardingRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await onboardingService.deleteChecklist(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
