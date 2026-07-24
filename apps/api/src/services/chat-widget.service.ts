import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { knowledgeBaseService } from './knowledge-base.service.js'
import { logger } from '../utils/logger.js'

export class ChatWidgetService {
  async getWidget(orgId: string) {
    return prisma.chatWidget.findFirst({ where: { organizationId: orgId } })
  }

  async upsertWidget(orgId: string, data: {
    name?: string
    greeting?: string
    primaryColor?: string
    position?: string
    useKnowledgeBase?: boolean
    isActive?: boolean
    allowedDomains?: string[]
  }) {
    const existing = await prisma.chatWidget.findFirst({ where: { organizationId: orgId } })
    if (existing) {
      return prisma.chatWidget.update({ where: { id: existing.id }, data })
    }
    return prisma.chatWidget.create({ data: { organizationId: orgId, ...data } })
  }

  async getSession(widgetId: string, visitorId: string) {
    return prisma.chatWidgetSession.findFirst({ where: { widgetId, visitorId } })
  }

  async createSession(widgetId: string, visitorId: string) {
    return prisma.chatWidgetSession.create({ data: { widgetId, visitorId, messages: [] } })
  }

  async chat(orgId: string, visitorId: string, userMessage: string): Promise<{ reply: string; sessionId: string }> {
    const widget = await prisma.chatWidget.findFirst({ where: { organizationId: orgId, isActive: true } })
    if (!widget) throw new Error('Widget not configured')

    let session = await prisma.chatWidgetSession.findFirst({ where: { widgetId: widget.id, visitorId } })
    if (!session) {
      session = await prisma.chatWidgetSession.create({ data: { widgetId: widget.id, visitorId, messages: [] } })
    }

    const messages = (session.messages as any[])

    let systemPrompt = `You are a helpful customer service assistant for a business. Be friendly, concise, and helpful. If you don't know something, say so politely.`

    if (widget.useKnowledgeBase) {
      try {
        const context = await knowledgeBaseService.searchRelevant(orgId, userMessage, 3)
        if (context) {
          systemPrompt += `\n\nKnowledge base context:\n${context}`
        }
      } catch (err) {
        logger.error(err, 'KB search failed in chat widget')
      }
    }

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-10).map((m: any) => ({ role: m.role as any, content: m.content })),
      { role: 'user' as const, content: userMessage },
    ]

    const reply = await aiService.chat(chatMessages)

    const updatedMessages = [
      ...messages,
      { role: 'user', content: userMessage, at: new Date().toISOString() },
      { role: 'assistant', content: reply, at: new Date().toISOString() },
    ]

    await prisma.chatWidgetSession.update({ where: { id: session.id }, data: { messages: updatedMessages } })

    return { reply, sessionId: session.id }
  }

  async getWidgetPublic(orgId: string) {
    return prisma.chatWidget.findFirst({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, greeting: true, primaryColor: true, position: true },
    })
  }

  async getSessions(orgId: string, page = 1, limit = 20) {
    const widget = await prisma.chatWidget.findFirst({ where: { organizationId: orgId } })
    if (!widget) return { sessions: [], total: 0 }

    const skip = (page - 1) * limit
    const [sessions, total] = await Promise.all([
      prisma.chatWidgetSession.findMany({
        where: { widgetId: widget.id },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.chatWidgetSession.count({ where: { widgetId: widget.id } }),
    ])
    return { sessions, total, page, limit }
  }
}

export const chatWidgetService = new ChatWidgetService()
