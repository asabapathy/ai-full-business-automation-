import { Router } from 'express'
import { z } from 'zod'
import { commissionService } from '../services/commission.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const commissionRouter = Router()
commissionRouter.use(authenticate)

commissionRouter.get('/summary', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const summary = await commissionService.getSummary(orgId)
    res.json(summary)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch summary' })
  }
})

commissionRouter.get('/rules', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const rules = await commissionService.getRules(orgId)
    res.json({ rules })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch rules' })
  }
})

commissionRouter.post('/rules', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      type: z.enum(['percentage', 'flat']),
      rate: z.number().positive(),
      employeeId: z.string().uuid().optional(),
      minAmount: z.number().optional(),
      serviceIds: z.array(z.string()).optional(),
    }).parse(req.body)
    const rule = await commissionService.createRule(orgId, data)
    res.status(201).json({ rule })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create rule' })
  }
})

commissionRouter.patch('/rules/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const rule = await commissionService.updateRule(orgId, req.params.id, req.body)
    res.json({ rule })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update rule' })
  }
})

commissionRouter.delete('/rules/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await commissionService.deleteRule(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete rule' })
  }
})

commissionRouter.get('/payouts', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { employeeId, status } = req.query as Record<string, string>
    const payouts = await commissionService.getPayouts(orgId, { employeeId, status })
    res.json({ payouts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch payouts' })
  }
})

commissionRouter.post('/payouts/calculate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { periodStart, periodEnd } = z.object({
      periodStart: z.string().datetime(),
      periodEnd: z.string().datetime(),
    }).parse(req.body)
    const payouts = await commissionService.calculatePayouts(orgId, new Date(periodStart), new Date(periodEnd))
    res.json({ payouts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to calculate payouts' })
  }
})

commissionRouter.post('/payouts/:id/pay', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const payout = await commissionService.markPaid(orgId, req.params.id)
    res.json({ payout })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to mark as paid' })
  }
})
