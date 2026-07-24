import { Router } from 'express'
import { z } from 'zod'
import { giftCardService } from '../services/gift-card.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const giftCardsRouter = Router()

// Public: lookup and redeem (used at POS / checkout)
giftCardsRouter.get('/public/:orgId/lookup/:code', async (req, res) => {
  try {
    const card = await giftCardService.lookupByCode(req.params.orgId, req.params.code)
    if (!card) return res.status(404).json({ error: 'Gift card not found' })
    res.json({ card: { code: card.code, balance: card.balance, status: card.status, expiresAt: card.expiresAt } })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to lookup card' })
  }
})

giftCardsRouter.use(authenticate)

giftCardsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await giftCardService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

giftCardsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, page, limit } = req.query as Record<string, string>
    const result = await giftCardService.getCards(orgId, {
      status,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch cards' })
  }
})

giftCardsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      amount: z.number().positive(),
      purchasedByContactId: z.string().uuid().optional(),
      expiresAt: z.string().datetime().optional(),
      notes: z.string().optional(),
    }).parse(req.body)
    const card = await giftCardService.issueGiftCard(orgId, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    })
    res.status(201).json({ card })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to issue gift card' })
  }
})

giftCardsRouter.post('/redeem', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { code, amount, invoiceId } = z.object({
      code: z.string(),
      amount: z.number().positive(),
      invoiceId: z.string().optional(),
    }).parse(req.body)
    const result = await giftCardService.redeemGiftCard(orgId, code, amount, invoiceId)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to redeem card' })
  }
})

giftCardsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await giftCardService.voidCard(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to void card' })
  }
})
