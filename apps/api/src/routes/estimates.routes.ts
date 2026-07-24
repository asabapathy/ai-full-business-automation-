import { Router } from 'express'
import { z } from 'zod'
import { estimatesService } from '../services/estimates.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const estimatesRouter = Router()
estimatesRouter.use(authenticate)

const lineItemSchema = z.object({
  description: z.string().min(1),
  quantity: z.number().positive(),
  unitPrice: z.number().positive(),
  total: z.number(),
})

estimatesRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await estimatesService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

estimatesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as Record<string, string>
    const estimates = await estimatesService.getEstimates(orgId, status)
    res.json({ estimates })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

estimatesRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const estimate = await estimatesService.getEstimate(orgId, req.params.id)
    if (!estimate) return res.status(404).json({ error: 'Not found' })
    res.json({ estimate })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

estimatesRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid().optional(),
      lineItems: z.array(lineItemSchema),
      currency: z.string().optional(),
      notes: z.string().optional(),
      validUntil: z.string().datetime().optional(),
      taxRate: z.number().min(0).max(100).optional(),
    }).parse(req.body)
    const estimate = await estimatesService.createEstimate(orgId, {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    })
    res.status(201).json({ estimate })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

estimatesRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      lineItems: z.array(lineItemSchema).optional(),
      notes: z.string().optional(),
      validUntil: z.string().datetime().optional(),
      taxRate: z.number().min(0).max(100).optional(),
    }).parse(req.body)
    await estimatesService.updateEstimate(orgId, req.params.id, {
      ...data,
      validUntil: data.validUntil ? new Date(data.validUntil) : undefined,
    })
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

estimatesRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const estimate = await estimatesService.sendEstimate(orgId, req.params.id)
    res.json({ estimate })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

estimatesRouter.post('/:id/accept', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await estimatesService.acceptEstimate(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

estimatesRouter.post('/:id/reject', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await estimatesService.rejectEstimate(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

estimatesRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await estimatesService.deleteEstimate(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
