import { Router } from 'express'
import { z } from 'zod'
import { loyaltyService } from '../services/loyalty.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const loyaltyRouter = Router()
loyaltyRouter.use(authenticate)

loyaltyRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await loyaltyService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

loyaltyRouter.get('/leaderboard', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { limit } = req.query as Record<string, string>
    const leaderboard = await loyaltyService.getLeaderboard(orgId, limit ? parseInt(limit) : 10)
    res.json({ leaderboard })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch leaderboard' })
  }
})

loyaltyRouter.get('/accounts', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { page, limit } = req.query as Record<string, string>
    const result = await loyaltyService.getAllAccounts(orgId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch accounts' })
  }
})

loyaltyRouter.get('/accounts/:contactId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const account = await loyaltyService.getAccount(orgId, req.params.contactId)
    if (!account) return res.status(404).json({ error: 'No loyalty account found' })
    const transactions = await loyaltyService.getTransactions(orgId, req.params.contactId)
    res.json({ account, transactions })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch account' })
  }
})

loyaltyRouter.post('/accounts/:contactId/add', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { points, description, referenceId } = z.object({
      points: z.number().int().positive(),
      description: z.string(),
      referenceId: z.string().optional(),
    }).parse(req.body)
    const account = await loyaltyService.addPoints(orgId, req.params.contactId, points, description, referenceId)
    res.json({ account })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to add points' })
  }
})

loyaltyRouter.post('/accounts/:contactId/redeem', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { points, description } = z.object({
      points: z.number().int().positive(),
      description: z.string(),
    }).parse(req.body)
    const account = await loyaltyService.redeemPoints(orgId, req.params.contactId, points, description)
    res.json({ account })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to redeem points' })
  }
})
