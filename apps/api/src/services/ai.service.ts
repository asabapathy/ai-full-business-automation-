import { AIProviderFactory, BusinessBrainAgent, MemoryManager } from '@kanavu/ai-core'
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
      businessContext: org
        ? {
            name: org.name,
            industry: org.industry,
          }
        : undefined,
    }

    const history = await prisma.message.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'asc' },
      take: 20,
    })

    const agent = new BusinessBrainAgent(
      { provider: this.provider, memory: this.memoryManager, maxIterations: 5 },
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
      { provider: this.provider, memory: this.memoryManager },
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
