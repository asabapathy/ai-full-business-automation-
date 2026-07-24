import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class SmsInboxService {
  async handleInbound(orgId: string, from: string, body: string, twilioSid: string): Promise<void> {
    const conv = await this.getOrCreateConversation(orgId, from)

    await prisma.smsMessage.create({
      data: {
        conversationId: conv.id,
        direction: 'inbound',
        body,
        status: 'received',
        twilioSid,
      },
    })

    await prisma.smsConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date(), unreadCount: { increment: 1 } },
    })

    // Auto-link to contact if found
    if (!conv.contactId) {
      const contact = await prisma.contact.findFirst({
        where: { organizationId: orgId, phone: from },
        select: { id: true },
      })
      if (contact) {
        await prisma.smsConversation.update({ where: { id: conv.id }, data: { contactId: contact.id } })
      }
    }
  }

  async sendMessage(orgId: string, to: string, body: string): Promise<{ success: boolean; sid?: string }> {
    const accountSid = process.env['TWILIO_ACCOUNT_SID']
    const authToken = process.env['TWILIO_AUTH_TOKEN']
    const from = process.env['TWILIO_PHONE_NUMBER']
    if (!accountSid || !authToken || !from) throw new Error('Twilio not configured')

    const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })

    if (!res.ok) {
      const err = await res.text()
      logger.error({ to, body, err }, 'Twilio send failed')
      return { success: false }
    }

    const data = await res.json() as { sid: string }
    const conv = await this.getOrCreateConversation(orgId, to)

    await prisma.smsMessage.create({
      data: { conversationId: conv.id, direction: 'outbound', body, status: 'sent', twilioSid: data.sid },
    })

    await prisma.smsConversation.update({
      where: { id: conv.id },
      data: { lastMessageAt: new Date() },
    })

    return { success: true, sid: data.sid }
  }

  async suggestReply(orgId: string, conversationId: string): Promise<string> {
    const messages = await prisma.smsMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: 6,
    })
    messages.reverse()

    const history = messages.map(m => `${m.direction === 'inbound' ? 'Customer' : 'Business'}: ${m.body}`).join('\n')
    const response = await aiService.chat(orgId, undefined, {
      message: `You are an AI assistant helping compose a business SMS reply. Here is the recent conversation:\n\n${history}\n\nWrite a helpful, professional reply in under 160 characters. Reply with ONLY the message text.`,
    })

    return response.content.slice(0, 160)
  }

  async getConversations(orgId: string) {
    return prisma.smsConversation.findMany({
      where: { organizationId: orgId },
      include: {
        messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
      orderBy: { lastMessageAt: 'desc' },
      take: 50,
    })
  }

  async getMessages(conversationId: string) {
    const messages = await prisma.smsMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'asc' },
      take: 100,
    })
    await prisma.smsConversation.update({
      where: { id: conversationId },
      data: { unreadCount: 0 },
    })
    return messages
  }

  async sendBulk(orgId: string, contactFilter: Record<string, unknown>, messageTemplate: string): Promise<{ sent: number; failed: number }> {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, phone: { not: null }, doNotSms: false },
      select: { id: true, firstName: true, lastName: true, phone: true },
      take: 500,
    })

    let sent = 0
    let failed = 0

    for (const contact of contacts) {
      if (!contact.phone) continue
      const body = messageTemplate
        .replace(/\{\{name\}\}/g, contact.firstName)
        .replace(/\{\{firstName\}\}/g, contact.firstName)
        .slice(0, 160)

      const result = await this.sendMessage(orgId, contact.phone, body).catch(() => ({ success: false }))
      if (result.success) sent++
      else failed++

      await new Promise(r => setTimeout(r, 100)) // rate limit
    }

    return { sent, failed }
  }

  private async getOrCreateConversation(orgId: string, phoneNumber: string) {
    const existing = await prisma.smsConversation.findUnique({
      where: { organizationId_phoneNumber: { organizationId: orgId, phoneNumber } },
    })
    if (existing) return existing

    return prisma.smsConversation.create({
      data: { organizationId: orgId, phoneNumber },
    })
  }
}

export const smsInboxService = new SmsInboxService()
