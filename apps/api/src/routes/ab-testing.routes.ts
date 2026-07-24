import { Router } from 'express'
import { abTestingService } from '../services/ab-testing.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const abTestingRouter = Router()
abTestingRouter.use(authenticate)

abTestingRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await abTestingService.listExperiments(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'ab testing list error')
    res.status(500).json({ success: false, error: 'Failed to list experiments' })
  }
})

abTestingRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await abTestingService.createExperiment(orgId, req.body)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'ab testing create error')
    res.status(500).json({ success: false, error: 'Failed to create experiment' })
  }
})

abTestingRouter.get('/:id/results', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await abTestingService.getResults(orgId, req.params.id)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'ab testing results error')
    res.status(500).json({ success: false, error: 'Failed to get results' })
  }
})

abTestingRouter.patch('/:id/status', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.body as { status: 'DRAFT' | 'RUNNING' | 'PAUSED' | 'COMPLETED' }
    await abTestingService.updateStatus(orgId, req.params.id, status)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'ab testing status error')
    res.status(500).json({ success: false, error: 'Failed to update status' })
  }
})

abTestingRouter.post('/:id/events', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { variantId, type, revenue, userId } = req.body as { variantId: string; type: 'impression' | 'conversion'; revenue?: number; userId: string }
    await abTestingService.recordEvent(orgId, req.params.id, variantId, type, revenue)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'ab testing event error')
    res.status(500).json({ success: false, error: 'Failed to record event' })
  }
})

abTestingRouter.post('/:id/assign', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { userId } = req.body as { userId: string }
    const variantId = await abTestingService.assignVariant(orgId, req.params.id, userId)
    res.json({ success: true, data: { variantId } })
  } catch (err) {
    logger.error(err, 'ab testing assign error')
    res.status(500).json({ success: false, error: 'Failed to assign variant' })
  }
})

abTestingRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await abTestingService.deleteExperiment(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'ab testing delete error')
    res.status(500).json({ success: false, error: 'Failed to delete experiment' })
  }
})
