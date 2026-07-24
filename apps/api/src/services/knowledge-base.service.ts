import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class KnowledgeBaseService {
  async getItems(orgId: string, filters: { category?: string; search?: string; page?: number; limit?: number }) {
    const { category, search, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where: any = { organizationId: orgId, isActive: true }
    if (category) where.category = category
    if (search) {
      where.OR = [
        { title: { contains: search, mode: 'insensitive' } },
        { content: { contains: search, mode: 'insensitive' } },
      ]
    }

    const [items, total] = await Promise.all([
      prisma.knowledgeItem.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: { id: true, title: true, category: true, tags: true, fileUrl: true, fileType: true, createdAt: true, updatedAt: true, version: true },
      }),
      prisma.knowledgeItem.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async getItem(orgId: string, id: string) {
    return prisma.knowledgeItem.findFirst({ where: { id, organizationId: orgId } })
  }

  async createItem(orgId: string, data: {
    title: string
    content: string
    category?: string
    tags?: string[]
    fileUrl?: string
    fileType?: string
    createdBy?: string
  }) {
    const item = await prisma.knowledgeItem.create({
      data: {
        organizationId: orgId,
        title: data.title,
        content: data.content,
        category: data.category,
        tags: data.tags ?? [],
        fileUrl: data.fileUrl,
        fileType: data.fileType,
        createdBy: data.createdBy,
      },
    })

    this.generateSummary(orgId, item.id).catch(err => logger.error(err, 'Failed to summarize knowledge item'))

    return item
  }

  async updateItem(orgId: string, id: string, data: Partial<{ title: string; content: string; category: string; tags: string[]; isActive: boolean }>) {
    const current = await prisma.knowledgeItem.findFirst({ where: { id, organizationId: orgId } })
    if (!current) throw new Error('Item not found')

    return prisma.knowledgeItem.update({
      where: { id },
      data: { ...data, version: current.version + 1 },
    })
  }

  async deleteItem(orgId: string, id: string) {
    return prisma.knowledgeItem.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }

  async searchRelevant(orgId: string, query: string, limit = 5): Promise<string> {
    const items = await prisma.knowledgeItem.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        OR: [
          { title: { contains: query, mode: 'insensitive' } },
          { content: { contains: query, mode: 'insensitive' } },
          { tags: { has: query.toLowerCase() } },
        ],
      },
      take: limit,
      select: { title: true, content: true },
    })

    if (items.length === 0) return ''

    return items.map(i => `## ${i.title}\n${i.content}`).join('\n\n---\n\n')
  }

  async askKnowledgeBase(orgId: string, question: string): Promise<string> {
    const context = await this.searchRelevant(orgId, question, 5)

    if (!context) {
      return await aiService.chat([{
        role: 'user',
        content: question,
      }])
    }

    return await aiService.chat([
      {
        role: 'system',
        content: `You are a helpful assistant. Answer questions using the following knowledge base context. If the answer isn't in the context, say so and provide a general answer.\n\nContext:\n${context}`,
      },
      { role: 'user', content: question },
    ])
  }

  async getCategories(orgId: string) {
    const items = await prisma.knowledgeItem.findMany({
      where: { organizationId: orgId, isActive: true, category: { not: null } },
      select: { category: true },
      distinct: ['category'],
    })
    return items.map(i => i.category).filter(Boolean) as string[]
  }

  private async generateSummary(orgId: string, id: string) {
    const item = await prisma.knowledgeItem.findFirst({ where: { id, organizationId: orgId } })
    if (!item || item.content.length < 100) return

    try {
      const summary = await aiService.chat([{
        role: 'user',
        content: `Summarize this knowledge base article in 1-2 sentences:\n\nTitle: ${item.title}\n\n${item.content.slice(0, 2000)}`,
      }])

      await prisma.knowledgeItem.update({
        where: { id },
        data: { summary },
      })
    } catch (err) {
      logger.error(err, 'Knowledge summary failed')
    }
  }
}

export const knowledgeBaseService = new KnowledgeBaseService()
