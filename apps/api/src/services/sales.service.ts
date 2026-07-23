import { AIProviderFactory, SalesAgent } from '@kanavu/ai-core'
import type { AgentContext } from '@kanavu/types'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface CreateDealRequest {
  contactId?: string
  companyId?: string
  title: string
  value?: number
  stage?: string
  expectedCloseDate?: string
  notes?: string
}

interface CreateQuoteRequest {
  contactId?: string
  title: string
  lineItems: Array<{ description: string; quantity: number; unitPrice: number; unit?: string }>
  validDays?: number
  notes?: string
  taxRate?: number
}

export class SalesService {
  private provider = AIProviderFactory.createFromEnv()

  private buildContext(organizationId: string, orgData: { name: string; industry: string }): AgentContext {
    return {
      organizationId,
      agentType: 'sales',
      businessContext: { name: orgData.name, industry: orgData.industry },
    }
  }

  async getDeals(organizationId: string, filters: { stage?: string; page?: number; limit?: number }) {
    const { stage, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = { organizationId, ...(stage ? { stage: stage as never } : {}) }

    const [deals, total] = await Promise.all([
      prisma.deal.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } }, company: { select: { id: true, name: true } } },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.deal.count({ where }),
    ])

    return { deals, total, page, limit }
  }

  async createDeal(organizationId: string, data: CreateDealRequest) {
    return prisma.deal.create({
      data: {
        organizationId,
        title: data.title,
        value: data.value,
        stage: (data.stage?.toUpperCase() as never) ?? 'NEW',
        expectedCloseDate: data.expectedCloseDate ? new Date(data.expectedCloseDate) : null,
        contactId: data.contactId,
        companyId: data.companyId,
        notes: data.notes,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true } },
        company: { select: { id: true, name: true } },
      },
    })
  }

  async updateDeal(organizationId: string, dealId: string, data: Partial<CreateDealRequest>) {
    return prisma.deal.update({
      where: { id: dealId, organizationId },
      data: {
        ...data,
        ...(data.stage ? { stage: data.stage.toUpperCase() as never } : {}),
        ...(data.expectedCloseDate ? { expectedCloseDate: new Date(data.expectedCloseDate) } : {}),
      },
    })
  }

  async getQuotes(organizationId: string, filters: { contactId?: string; status?: string; page?: number; limit?: number }) {
    const { contactId, status, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = {
      organizationId,
      ...(contactId ? { contactId } : {}),
      ...(status ? { status: status as never } : {}),
    }

    const [quotes, total] = await Promise.all([
      prisma.quote.findMany({
        where,
        include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.quote.count({ where }),
    ])

    return { quotes, total, page, limit }
  }

  async createQuote(organizationId: string, data: CreateQuoteRequest) {
    const subtotal = data.lineItems.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
    const taxRate = data.taxRate ?? 0
    const tax = subtotal * taxRate
    const total = subtotal + tax

    return prisma.quote.create({
      data: {
        organizationId,
        contactId: data.contactId,
        title: data.title,
        lineItems: data.lineItems as never,
        subtotal,
        tax,
        total,
        validUntil: new Date(Date.now() + (data.validDays ?? 30) * 24 * 60 * 60 * 1000),
        notes: data.notes,
        status: 'DRAFT',
      },
    })
  }

  async generateFollowUpSequence(organizationId: string, request: { dealId: string; channel: string; touchpoints?: number }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const deal = await prisma.deal.findFirst({
      where: { id: request.dealId, organizationId },
      include: { contact: { select: { firstName: true, lastName: true } } },
    })
    if (!deal) throw new Error('Deal not found')

    const context = this.buildContext(organizationId, org)
    const agent = new SalesAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `Create a ${request.channel} follow-up sequence for deal "${deal.title}" currently in ${deal.stage} stage. Contact: ${deal.contact?.firstName ?? 'Prospect'}. Generate ${request.touchpoints ?? 5} personalized touchpoints.`
    )

    return { sequence: response.content, actions: response.actions, deal }
  }

  async generateAiInsights(organizationId: string) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const [totalDeals, activeDeals, dealsByStage, totalQuotes] = await Promise.all([
      prisma.deal.count({ where: { organizationId } }),
      prisma.deal.count({ where: { organizationId, stage: { notIn: ['WON', 'LOST'] as never[] } } }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId },
        _count: true,
        _sum: { value: true },
      }),
      prisma.quote.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
    ])

    const pipelineValue = dealsByStage.reduce((sum, s) => sum + (s._sum.value ?? 0), 0)

    return { totalDeals, activeDeals, dealsByStage, totalQuotes, pipelineValue }
  }

  async getPipelineAnalytics(organizationId: string) {
    const [deals, wonDeals] = await Promise.all([
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId },
        _count: true,
        _sum: { value: true },
      }),
      prisma.deal.aggregate({
        where: { organizationId, stage: 'WON' as never },
        _sum: { value: true },
        _count: true,
      }),
    ])

    return {
      pipeline: deals,
      wonRevenue: wonDeals._sum.value ?? 0,
      wonDeals: wonDeals._count,
      conversionRate: deals.length > 0
        ? Math.round((wonDeals._count / deals.reduce((s, d) => s + d._count, 0)) * 100)
        : 0,
    }
  }
}

export const salesService = new SalesService()
