import { Router } from 'express'
import { z } from 'zod'
import { salesService } from '../services/sales.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const salesRouter = Router()
salesRouter.use(authenticate)
salesRouter.use(requireOrganization)

const createDealSchema = z.object({
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  value: z.number().positive().optional(),
  stage: z.string().optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
})

const createQuoteSchema = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unit: z.string().optional(),
  })).min(1),
  validDays: z.number().positive().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
})

const followUpSchema = z.object({
  dealId: z.string().uuid(),
  channel: z.enum(['email', 'sms', 'mixed']),
  touchpoints: z.number().min(1).max(10).optional(),
})

// Deals
salesRouter.get('/deals', async (req, res) => {
  const { stage, page, limit } = req.query as Record<string, string>
  const result = await salesService.getDeals(req.organizationId!, {
    stage,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

salesRouter.post('/deals', validate(createDealSchema), async (req, res) => {
  const deal = await salesService.createDeal(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { deal } })
})

salesRouter.patch('/deals/:id', async (req, res) => {
  const deal = await salesService.updateDeal(req.organizationId!, req.params['id']!, req.body as Record<string, unknown>)
  res.json({ success: true, data: { deal } })
})

// Quotes
salesRouter.get('/quotes', async (req, res) => {
  const { contactId, status, page, limit } = req.query as Record<string, string>
  const result = await salesService.getQuotes(req.organizationId!, {
    contactId,
    status,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

salesRouter.post('/quotes', validate(createQuoteSchema), async (req, res) => {
  const quote = await salesService.createQuote(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { quote } })
})

// AI
salesRouter.post('/follow-up', validate(followUpSchema), async (req, res) => {
  const result = await salesService.generateFollowUpSequence(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})

salesRouter.get('/analytics', async (req, res) => {
  const analytics = await salesService.getPipelineAnalytics(req.organizationId!)
  res.json({ success: true, data: analytics })
})
