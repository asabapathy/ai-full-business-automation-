import { AIProviderFactory, BusinessBrainAgent, MemoryManager } from '@kanavu/ai-core'
import type { BusinessDataProvider } from '@kanavu/ai-core'
import type { AgentContext, ChatRequest, ChatResponse, GoalRequest, GoalResponse } from '@kanavu/types'
import { config } from '../config/index.js'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'
import type { MemoryRepository } from '@kanavu/ai-core/memory'
import type { MemoryItem, VectorSearchResult } from '@kanavu/types'

// Prisma-backed memory repository
const prismaMemoryRepo: MemoryRepository = {
  async store(options) {
    const memory = await prisma.memory.create({
      data: {
        organizationId: options.organizationId,
        type: (options.type?.toUpperCase() as never) ?? 'EPISODIC',
        content: options.content,
        sourceType: options.sourceType,
        sourceId: options.sourceId,
        importance: options.importance ?? 0.5,
        metadata: options.metadata ?? {},
      },
    })
    return {
      id: memory.id,
      content: memory.content,
      type: options.type ?? 'episodic',
      importance: memory.importance,
      createdAt: memory.createdAt.toISOString(),
      metadata: (memory.metadata as Record<string, unknown>) ?? {},
    }
  },

  async search(_embedding, organizationId, limit) {
    // In production this uses pgvector similarity search
    // For now, return recent memories as a fallback
    const memories = await prisma.memory.findMany({
      where: { organizationId },
      orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    })
    return memories.map(m => ({
      id: m.id,
      content: m.content,
      score: m.importance,
      metadata: { type: m.type, importance: m.importance, createdAt: m.createdAt.toISOString() },
    } satisfies VectorSearchResult))
  },

  async getRecent(organizationId, limit, type?) {
    const memories = await prisma.memory.findMany({
      where: {
        organizationId,
        ...(type ? { type: type.toUpperCase() as never } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
    return memories.map(m => ({
      id: m.id,
      content: m.content,
      type: m.type.toLowerCase() as MemoryItem['type'],
      importance: m.importance,
      createdAt: m.createdAt.toISOString(),
    }))
  },

  async updateImportance(id, importance) {
    await prisma.memory.update({ where: { id }, data: { importance } })
  },

  async delete(id) {
    await prisma.memory.delete({ where: { id } })
  },
}

const buildDataProvider = (): BusinessDataProvider => ({
  async getRevenueStats(organizationId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const [inv, exp, overdue] = await Promise.all([
      prisma.invoice.aggregate({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } }, _sum: { total: true, amountPaid: true } }),
      prisma.expense.aggregate({ where: { organizationId, date: { gte: thirtyDaysAgo } }, _sum: { amount: true } }),
      prisma.invoice.count({ where: { organizationId, status: { notIn: ['PAID', 'VOID', 'REFUNDED'] as never[] }, dueAt: { lt: new Date() } } }),
    ])
    const revenue30d = Number(inv._sum.total ?? 0)
    const collected = Number(inv._sum.amountPaid ?? 0)
    return { revenue30d, outstanding: revenue30d - collected, overdueCount: overdue, expenses30d: Number(exp._sum.amount ?? 0) }
  },
  async getContactStats(organizationId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const [total, newLast30d, leads] = await Promise.all([
      prisma.contact.count({ where: { organizationId } }),
      prisma.contact.count({ where: { organizationId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.contact.count({ where: { organizationId, type: 'LEAD' as never } }),
    ])
    return { total, newLast30d, leads }
  },
  async getDealStats(organizationId) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const [all, won, lost] = await Promise.all([
      prisma.deal.aggregate({ where: { organizationId, stage: { notIn: ['WON', 'LOST'] as never[] } }, _count: true, _sum: { value: true } }),
      prisma.deal.count({ where: { organizationId, stage: 'WON' as never, updatedAt: { gte: thirtyDaysAgo } } }),
      prisma.deal.count({ where: { organizationId, stage: 'LOST' as never, updatedAt: { gte: thirtyDaysAgo } } }),
    ])
    return { total: all._count, pipeline: Number(all._sum.value ?? 0), wonLast30d: won, lostLast30d: lost }
  },
  async getAppointmentStats(organizationId) {
    const now = new Date()
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0)
    const todayEnd = new Date(now); todayEnd.setHours(23, 59, 59, 999)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const [upcoming, today, completed, total30d] = await Promise.all([
      prisma.appointment.count({ where: { organizationId, startTime: { gte: now }, status: 'SCHEDULED' as never } }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: todayStart, lte: todayEnd } } }),
      prisma.appointment.count({ where: { organizationId, status: 'COMPLETED' as never, startTime: { gte: thirtyDaysAgo } } }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: thirtyDaysAgo } } }),
    ])
    return { upcoming, today, completionRate: total30d > 0 ? Math.round((completed / total30d) * 100) : 0 }
  },
  async getReviewStats(organizationId) {
    const [agg, total, unresponded] = await Promise.all([
      prisma.review.aggregate({ where: { organizationId }, _avg: { rating: true } }),
      prisma.review.count({ where: { organizationId } }),
      prisma.review.count({ where: { organizationId, respondedAt: null } }),
    ])
    return { avgRating: Number((agg._avg.rating ?? 0).toFixed(1)), total, unresponded }
  },
  async getUpcomingTasks(organizationId) {
    const overdueInvoices = await prisma.invoice.count({
      where: { organizationId, status: { notIn: ['PAID', 'VOID', 'REFUNDED'] as never[] }, dueAt: { lt: new Date() } },
    })
    const unrespondedReviews = await prisma.review.count({ where: { organizationId, respondedAt: null } })
    const tasks = []
    if (overdueInvoices > 0) tasks.push({ type: 'finance', description: `${overdueInvoices} overdue invoice(s) need payment reminders` })
    if (unrespondedReviews > 0) tasks.push({ type: 'reviews', description: `${unrespondedReviews} review(s) waiting for a response` })
    return tasks
  },
  async getLowStockItems(organizationId) {
    const items = await prisma.inventoryItem.findMany({ where: { organizationId, isActive: true } })
    return items.filter(i => i.quantity <= i.reorderPoint).map(i => ({ name: i.name, quantity: i.quantity, reorderPoint: i.reorderPoint }))
  },
})

export class AIService {
  private provider = AIProviderFactory.createFromEnv()
  private memoryManager = new MemoryManager(this.provider, prismaMemoryRepo)

  async chat(organizationId: string, userId: string | undefined, request: ChatRequest): Promise<ChatResponse> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true, settings: true },
    })

    let conversation = request.conversationId
      ? await prisma.conversation.findFirst({ where: { id: request.conversationId, organizationId } })
      : null

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: {
          organizationId,
          userId,
          agentType: 'BUSINESS_BRAIN',
          channel: 'web',
          title: request.message.slice(0, 80),
        },
      })
    }

    const agentContext: AgentContext = {
      organizationId,
      userId,
      conversationId: conversation.id,
      agentType: 'business_brain',
      businessContext: org ? { name: org.name, industry: org.industry } : undefined,
    }

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const agent = new BusinessBrainAgent(
      { provider: this.provider, memory: this.memoryManager, maxIterations: 5, dataProvider: buildDataProvider() },
      agentContext,
    )

    for (const msg of history) {
      agent['messages'].push({
        role: msg.role.toLowerCase() as 'user' | 'assistant',
        content: msg.content,
      })
    }

    const agentResponse = await agent.run(request.message)

    await prisma.message.createMany({
      data: [
        {
          conversationId: conversation.id,
          role: 'USER',
          content: request.message,
          metadata: {},
        },
        {
          conversationId: conversation.id,
          role: 'ASSISTANT',
          content: agentResponse.content,
          metadata: { actions: agentResponse.actions ?? [] },
        },
      ],
    })

    return {
      conversationId: conversation.id,
      messageId: crypto.randomUUID(),
      content: agentResponse.content,
      actions: agentResponse.actions,
      requiresApproval: agentResponse.requiresApproval,
    }
  }

  async *chatStream(organizationId: string, userId: string | undefined, request: ChatRequest): AsyncGenerator<string> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })

    const agentContext: AgentContext = {
      organizationId,
      userId,
      agentType: 'business_brain',
      businessContext: org ? { name: org.name, industry: org.industry } : undefined,
    }

    const agent = new BusinessBrainAgent(
      { provider: this.provider, memory: this.memoryManager, dataProvider: buildDataProvider() },
      agentContext,
    )

    let fullContent = ''
    for await (const chunk of agent.stream(request.message)) {
      if (chunk.type === 'text' && chunk.content) {
        fullContent += chunk.content
        yield `data: ${JSON.stringify({ type: 'text', content: chunk.content })}\n\n`
      } else if (chunk.type === 'done') {
        yield `data: ${JSON.stringify({ type: 'done' })}\n\n`
        break
      }
    }

    // Persist to DB asynchronously
    if (request.conversationId && fullContent) {
      prisma.message.createMany({
        data: [
          { conversationId: request.conversationId, role: 'USER', content: request.message, metadata: {} },
          { conversationId: request.conversationId, role: 'ASSISTANT', content: fullContent, metadata: {} },
        ],
      }).catch(err => logger.error({ err }, 'Failed to persist stream messages'))
    }
  }

  async submitGoal(organizationId: string, request: GoalRequest): Promise<GoalResponse> {
    const chatResponse = await this.chat(organizationId, undefined, {
      message: `I have a new business goal: ${request.goal}${request.deadline ? `. I need this done by ${request.deadline}` : ''}. Please create a detailed plan to achieve this.`,
    })

    return {
      goalId: chatResponse.conversationId,
      plan: { content: chatResponse.content },
      tasks: chatResponse.actions ?? [],
    }
  }

  async storeKnowledge(organizationId: string, content: string, title: string, category?: string): Promise<void> {
    const [embedding] = await this.provider.embed(content)
    await prisma.knowledgeItem.create({
      data: {
        organizationId,
        title,
        content,
        category,
      },
    })
    await this.memoryManager.store({
      organizationId,
      content: `Knowledge: ${title}\n${content.slice(0, 500)}`,
      type: 'semantic',
      importance: 0.8,
    })
  }
}

export const aiService = new AIService()
