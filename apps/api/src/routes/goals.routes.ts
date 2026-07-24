import { Router } from 'express'
import { z } from 'zod'
import { goalsService } from '../services/goals.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const goalsRouter = Router()
goalsRouter.use(authenticate)

goalsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await goalsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

goalsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as Record<string, string>
    const goals = await goalsService.getGoals(orgId, status)
    res.json({ goals })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

goalsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const goal = await goalsService.getGoal(orgId, req.params.id)
    if (!goal) return res.status(404).json({ error: 'Not found' })
    res.json({ goal })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

goalsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      category: z.string().optional(),
      targetValue: z.number().positive(),
      currentValue: z.number().min(0).optional(),
      unit: z.string().optional(),
      dueDate: z.string().datetime().optional(),
    }).parse(req.body)
    const goal = await goalsService.createGoal(orgId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
    res.status(201).json({ goal })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

goalsRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      targetValue: z.number().positive().optional(),
      currentValue: z.number().min(0).optional(),
      unit: z.string().optional(),
      dueDate: z.string().datetime().optional(),
      status: z.string().optional(),
    }).parse(req.body)
    await goalsService.updateGoal(orgId, req.params.id, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

goalsRouter.patch('/:id/progress', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { currentValue } = z.object({ currentValue: z.number().min(0) }).parse(req.body)
    const goal = await goalsService.updateProgress(orgId, req.params.id, currentValue)
    res.json({ goal })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

goalsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await goalsService.deleteGoal(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
