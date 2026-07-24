import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class TeamInboxService {
  async getThreads(orgId: string, filters: { status?: string; assignedToId?: string; page?: number; limit?: number }) {
    const { status, assignedToId, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where: any = { organizationId: orgId }
    if (status) where.status = status
    if (assignedToId) where.assignedToId = assignedToId

    const [threads, total] = await Promise.all([
      prisma.emailThread.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        include: {
          emailMessages: { orderBy: { sentAt: 'desc' }, take: 1 },
        },
      }),
      prisma.emailThread.count({ where }),
    ])

    return { threads, total, page, limit }
  }

  async getThread(orgId: string, threadId: string) {
    return prisma.emailThread.findFirst({
      where: { id: threadId, organizationId: orgId },
      include: {
        emailMessages: { orderBy: { sentAt: 'asc' } },
      },
    })
  }

  async createThread(orgId: string, data: {
    subject: string
    fromAddress: string
    toAddress: string
    body: string
    contactId?: string
  }) {
    const thread = await prisma.emailThread.create({
      data: {
        organizationId: orgId,
        subject: data.subject,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        contactId: data.contactId,
        snippet: data.body.slice(0, 200),
        status: 'open',
      },
    })

    await prisma.emailMessage.create({
      data: {
        threadId: thread.id,
        fromAddress: data.fromAddress,
        toAddress: data.toAddress,
        subject: data.subject,
        body: data.body,
        direction: 'inbound',
      },
    })

    return thread
  }

  async replyToThread(orgId: string, threadId: string, body: string, fromAddress: string) {
    const thread = await prisma.emailThread.findFirst({
      where: { id: threadId, organizationId: orgId },
    })
    if (!thread) throw new Error('Thread not found')

    const message = await prisma.emailMessage.create({
      data: {
        threadId,
        fromAddress,
        toAddress: thread.fromAddress,
        subject: `Re: ${thread.subject}`,
        body,
        direction: 'outbound',
      },
    })

    await prisma.emailThread.update({
      where: { id: threadId },
      data: { updatedAt: new Date(), snippet: body.slice(0, 200) },
    })

    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv()
      await emailSvc.sendRaw?.({
        to: thread.fromAddress,
        subject: `Re: ${thread.subject}`,
        html: `<div style="font-family:sans-serif">${body.replace(/\n/g, '<br>')}</div>`,
      })
    } catch (err) {
      logger.error(err, 'Failed to send email reply')
    }

    return message
  }

  async assignThread(orgId: string, threadId: string, assignedToId: string | null) {
    return prisma.emailThread.updateMany({
      where: { id: threadId, organizationId: orgId },
      data: { assignedToId: assignedToId ?? undefined },
    })
  }

  async updateThreadStatus(orgId: string, threadId: string, status: string) {
    return prisma.emailThread.updateMany({
      where: { id: threadId, organizationId: orgId },
      data: { status },
    })
  }

  async markRead(orgId: string, threadId: string) {
    return prisma.emailThread.updateMany({
      where: { id: threadId, organizationId: orgId },
      data: { isRead: true },
    })
  }

  async suggestReply(orgId: string, threadId: string): Promise<string> {
    const thread = await prisma.emailThread.findFirst({
      where: { id: threadId, organizationId: orgId },
      include: { emailMessages: { orderBy: { sentAt: 'desc' }, take: 5 } },
    })
    if (!thread) throw new Error('Thread not found')

    const history = thread.emailMessages
      .reverse()
      .map(m => `${m.direction === 'inbound' ? 'Customer' : 'Us'}: ${m.body}`)
      .join('\n\n')

    const suggestion = await aiService.chat([{
      role: 'user',
      content: `You are a helpful business assistant. Write a professional, friendly email reply to this conversation:\n\n${history}\n\nWrite only the reply body, no subject line.`,
    }])

    return suggestion
  }

  async getStats(orgId: string) {
    const [total, open, closed, unread] = await Promise.all([
      prisma.emailThread.count({ where: { organizationId: orgId } }),
      prisma.emailThread.count({ where: { organizationId: orgId, status: 'open' } }),
      prisma.emailThread.count({ where: { organizationId: orgId, status: 'closed' } }),
      prisma.emailThread.count({ where: { organizationId: orgId, isRead: false } }),
    ])
    return { total, open, closed, unread }
  }
}

export const teamInboxService = new TeamInboxService()
