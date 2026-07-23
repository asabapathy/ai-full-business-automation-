import { Router } from 'express'
import { z } from 'zod'
import { financeService } from '../services/finance.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const financeRouter = Router()
financeRouter.use(authenticate)
financeRouter.use(requireOrganization)

const createInvoiceSchema = z.object({
  contactId: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  lineItems: z.array(z.object({
    description: z.string().min(1),
    quantity: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    unit: z.string().optional(),
  })).min(1),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  taxRate: z.number().min(0).max(1).optional(),
})

const createExpenseSchema = z.object({
  description: z.string().min(1).max(200),
  amount: z.number().positive(),
  category: z.string().optional(),
  date: z.string().optional(),
  vendorName: z.string().optional(),
  receiptUrl: z.string().url().optional(),
})

const aiAnalysisSchema = z.object({
  query: z.string().min(1).max(500),
})

// Invoices
financeRouter.get('/invoices', async (req, res) => {
  const { status, contactId, page, limit } = req.query as Record<string, string>
  const result = await financeService.getInvoices(req.organizationId!, {
    status,
    contactId,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

financeRouter.post('/invoices', validate(createInvoiceSchema), async (req, res) => {
  const invoice = await financeService.createInvoice(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { invoice } })
})

financeRouter.patch('/invoices/:id/status', async (req, res) => {
  const { status } = req.body as { status: string }
  const invoice = await financeService.updateInvoiceStatus(req.organizationId!, req.params['id']!, status)
  res.json({ success: true, data: { invoice } })
})

financeRouter.post('/invoices/:id/remind', async (req, res) => {
  const result = await financeService.sendPaymentReminder(req.organizationId!, req.params['id']!)
  res.json({ success: true, data: result })
})

// Expenses
financeRouter.get('/expenses', async (req, res) => {
  const { category, page, limit } = req.query as Record<string, string>
  const result = await financeService.getExpenses(req.organizationId!, {
    category,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

financeRouter.post('/expenses', validate(createExpenseSchema), async (req, res) => {
  const expense = await financeService.createExpense(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { expense } })
})

// Summary & AI
financeRouter.get('/summary', async (req, res) => {
  const summary = await financeService.getFinancialSummary(req.organizationId!)
  res.json({ success: true, data: summary })
})

financeRouter.post('/analyze', validate(aiAnalysisSchema), async (req, res) => {
  const result = await financeService.generateAiAnalysis(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})
