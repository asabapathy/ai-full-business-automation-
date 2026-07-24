import { Router } from 'express'
import { z } from 'zod'
import { referralService } from '../services/referral.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const referralsRouter = Router()

// Public: convert via referral code
referralsRouter.post('/public/:orgId/convert', async (req, res) => {
  try {
    const { code, contactId } = z.object({ code: z.string(), contactId: z.string().uuid() }).parse(req.body)
    const referral = await referralService.convertReferral(req.params.orgId, code, contactId)
    res.json({ referral })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to convert referral' })
  }
})

referralsRouter.use(authenticate)

referralsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await referralService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

referralsRouter.get('/program', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const program = await referralService.getProgram(orgId)
    res.json({ program })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch program' })
  }
})

referralsRouter.put('/program', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      rewardType: z.string().optional(),
      rewardAmount: z.number().positive(),
      referredReward: z.number().optional(),
      terms: z.string().optional(),
    }).parse(req.body)
    const program = await referralService.upsertProgram(orgId, data)
    res.json({ program })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update program' })
  }
})

referralsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, referrerContactId } = req.query as Record<string, string>
    const referrals = await referralService.getReferrals(orgId, { status, referrerContactId })
    res.json({ referrals })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch referrals' })
  }
})

referralsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { referrerContactId } = z.object({ referrerContactId: z.string().uuid() }).parse(req.body)
    const referral = await referralService.createReferral(orgId, referrerContactId)
    res.status(201).json({ referral })
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to create referral' })
  }
})

referralsRouter.post('/:id/pay', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await referralService.markRewardPaid(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to mark as paid' })
  }
})
