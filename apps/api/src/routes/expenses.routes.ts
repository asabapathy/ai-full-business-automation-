import { Router } from 'express'
import { z } from 'zod'
import { expensesService } from '../services/expenses.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const expensesRouter = Router()
expensesRouter.use(authenticate)

expensesRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await expensesService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

expensesRouter.get('/categories', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const categories = await expensesService.getCategories(orgId)
    res.json({ categories })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

expensesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category, vendorId } = req.query as Record<string, string>
    const expenses = await expensesService.getExpenses(orgId, { category, vendorId })
    res.json({ expenses })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

expensesRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const expense = await expensesService.getExpense(orgId, req.params.id)
    if (!expense) return res.status(404).json({ error: 'Not found' })
    res.json({ expense })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

expensesRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      category: z.string().min(1),
      description: z.string().min(1),
      amount: z.number().positive(),
      currency: z.string().optional(),
      vendorId: z.string().uuid().optional(),
      receiptUrl: z.string().url().optional(),
      date: z.string().datetime(),
      isRecurring: z.boolean().optional(),
    }).parse(req.body)
    const expense = await expensesService.createExpense(orgId, { ...data, date: new Date(data.date) })
    res.status(201).json({ expense })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

expensesRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      category: z.string().optional(),
      description: z.string().optional(),
      amount: z.number().positive().optional(),
      currency: z.string().optional(),
      vendorId: z.string().uuid().optional(),
      receiptUrl: z.string().url().optional(),
      date: z.string().datetime().optional(),
    }).parse(req.body)
    await expensesService.updateExpense(orgId, req.params.id, {
      ...data,
      date: data.date ? new Date(data.date) : undefined,
    })
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

expensesRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await expensesService.deleteExpense(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
