import { AIProviderFactory, FinanceAgent } from '@kanavu/ai-core'
import type { AgentContext } from '@kanavu/types'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface CreateInvoiceRequest {
  contactId?: string
  title: string
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; unit?: string }>
  dueDate?: string
  notes?: string
  taxRate?: number
}

interface CreateExpenseRequest {
  description: string
  amount: number
  category?: string
  date?: string
  vendorName?: string
  receiptUrl?: string
}

export class FinanceService {
  private provider = AIProviderFactory.createFromEnv()

  private buildContext(organizationId: string, orgData: { name: string; industry: string }): AgentContext {
    return {
      organizationId,
      agentType: 'finance',
      businessContext: { name: orgData.name, industry: orgData.industry },
    }
  }

  async getInvoices(organizationId: string, filters: { status?: string; contactId?: string; page?: number; limit?: number }) {
    const { status, contactId, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = {
      organizationId,
      ...(status ? { status: status as never } : {}),
      ...(contactId ? { contactId } : {}),
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ])

    return { invoices, total, page, limit }
  }

  async createInvoice(organizationId: string, data: CreateInvoiceRequest) {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxRate = data.taxRate ?? 0
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return prisma.invoice.create({
      data: {
        organizationId,
        contactId: data.contactId,
        title: data.title,
        lineItems: data.lineItems as never,
        subtotal,
        tax,
        total,
        dueDate: data.dueDate ? new Date(data.dueDate) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        notes: data.notes,
        status: 'DRAFT',
        invoiceNumber: `INV-${Date.now().toString().slice(-6)}`,
      },
    })
  }

  async updateInvoiceStatus(organizationId: string, invoiceId: string, status: string) {
    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId } })
    if (!invoice) throw new Error('Invoice not found')

    const data: Record<string, unknown> = { status: status as never }
    if (status === 'SENT') data['sentAt'] = new Date()
    if (status === 'PAID') data['paidAt'] = new Date()

    return prisma.invoice.update({ where: { id: invoiceId }, data })
  }

  async sendPaymentReminder(organizationId: string, invoiceId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: { contact: { select: { firstName: true, lastName: true, email: true } } },
    })
    if (!invoice) throw new Error('Invoice not found')

    const context = this.buildContext(organizationId, org)
    const agent = new FinanceAgent({ provider: this.provider }, context)
    const daysOverdue = Math.max(0, Math.floor((Date.now() - (invoice.dueDate?.getTime() ?? Date.now())) / 86400000))

    const response = await agent.run(
      `Generate a payment reminder for ${invoice.contact?.firstName ?? 'client'} for invoice #${invoice.invoiceNumber} of $${invoice.total.toFixed(2)}, ${daysOverdue} days overdue.`
    )

    logger.info({ invoiceId, daysOverdue }, 'Payment reminder generated')
    return { reminder: response.content, invoice, daysOverdue }
  }

  async getExpenses(organizationId: string, filters: { category?: string; page?: number; limit?: number }) {
    const { category, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = { organizationId, ...(category ? { category } : {}) }

    const [expenses, total] = await Promise.all([
      prisma.expense.findMany({
        where,
        orderBy: { date: 'desc' },
        skip,
        take: limit,
      }),
      prisma.expense.count({ where }),
    ])

    return { expenses, total, page, limit }
  }

  async createExpense(organizationId: string, data: CreateExpenseRequest) {
    return prisma.expense.create({
      data: {
        organizationId,
        description: data.description,
        amount: data.amount,
        category: data.category ?? 'Other',
        date: data.date ? new Date(data.date) : new Date(),
        vendorName: data.vendorName,
        receiptUrl: data.receiptUrl,
        status: 'PENDING',
      },
    })
  }

  async getFinancialSummary(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [invoiceStats, expenseStats, overdueInvoices, recentPayments] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        _sum: { total: true },
        _count: true,
      }),
      prisma.expense.aggregate({
        where: { organizationId, date: { gte: thirtyDaysAgo } },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.invoice.count({
        where: {
          organizationId,
          status: { notIn: ['PAID', 'CANCELLED'] as never[] },
          dueDate: { lt: new Date() },
        },
      }),
      prisma.payment.aggregate({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo }, status: 'COMPLETED' as never },
        _sum: { amount: true },
        _count: true,
      }),
    ])

    const revenue = invoiceStats._sum.total ?? 0
    const expenses = expenseStats._sum.amount ?? 0
    const collected = recentPayments._sum.amount ?? 0

    return {
      period: '30 days',
      revenue,
      expenses,
      profit: revenue - expenses,
      collected,
      outstanding: revenue - collected,
      overdueInvoices,
      totalInvoices: invoiceStats._count,
      totalExpenses: expenseStats._count,
      cashFlowHealth: revenue > expenses ? 'positive' : 'negative',
    }
  }

  async generateAiAnalysis(organizationId: string, request: { query: string }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const summary = await this.getFinancialSummary(organizationId)
    const context = this.buildContext(organizationId, org)
    const agent = new FinanceAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `Financial context: ${JSON.stringify(summary)}. User query: ${request.query}`
    )

    return { analysis: response.content, summary }
  }
}

export const financeService = new FinanceService()
