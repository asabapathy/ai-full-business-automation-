import crypto from 'crypto'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

const SUPPORTED_EVENTS = [
  'contact.created', 'contact.updated',
  'deal.created', 'deal.updated', 'deal.won', 'deal.lost',
  'appointment.created', 'appointment.confirmed', 'appointment.cancelled',
  'invoice.created', 'invoice.paid',
  'review.received',
  'lead.scored',
] as const

export type WebhookEvent = typeof SUPPORTED_EVENTS[number]

export class WebhookDeliveryService {
  async createWebhook(orgId: string, data: { name: string; url: string; events: string[]; secret?: string; headers?: Record<string, string> }) {
    return prisma.outboundWebhook.create({
      data: {
        organizationId: orgId,
        name: data.name,
        url: data.url,
        events: data.events,
        secret: data.secret ?? crypto.randomBytes(24).toString('hex'),
        headers: data.headers ?? {},
      },
    })
  }

  async getWebhooks(orgId: string) {
    return prisma.outboundWebhook.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: {
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 5,
          select: { id: true, event: true, success: true, statusCode: true, createdAt: true },
        } as any,
      },
    })
  }

  async updateWebhook(orgId: string, id: string, data: Partial<{ name: string; url: string; events: string[]; isActive: boolean }>) {
    return prisma.outboundWebhook.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
  }

  async deleteWebhook(orgId: string, id: string): Promise<void> {
    await prisma.outboundWebhook.deleteMany({ where: { id, organizationId: orgId } })
  }

  async dispatch(orgId: string, event: WebhookEvent, payload: Record<string, unknown>): Promise<void> {
    const webhooks = await prisma.outboundWebhook.findMany({
      where: { organizationId: orgId, isActive: true, events: { has: event } },
    })

    for (const wh of webhooks) {
      void this.deliverWithRetry(wh, event, payload)
    }
  }

  private async deliverWithRetry(
    wh: { id: string; url: string; secret: string | null; headers: unknown },
    event: string,
    payload: Record<string, unknown>,
    attempt = 1,
  ): Promise<void> {
    const body = JSON.stringify({ event, payload, timestamp: new Date().toISOString() })
    const sig = wh.secret
      ? crypto.createHmac('sha256', wh.secret).update(body).digest('hex')
      : undefined

    const customHeaders = (wh.headers as Record<string, string>) ?? {}
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'User-Agent': 'Kanavu-AI/1.0',
      'X-Kanavu-Event': event,
      ...customHeaders,
      ...(sig && { 'X-Kanavu-Signature': `sha256=${sig}` }),
    }

    let statusCode: number | undefined
    let responseText: string | undefined
    let success = false

    try {
      const res = await fetch(wh.url, { method: 'POST', headers, body, signal: AbortSignal.timeout(10_000) })
      statusCode = res.status
      responseText = await res.text().catch(() => '')
      success = res.ok
    } catch (err) {
      responseText = String(err)
    }

    await prisma.outboundWebhookDelivery.create({
      data: { webhookId: wh.id, event, payload, statusCode, response: responseText, success, attempt },
    }).catch(() => {})

    if (!success) {
      await prisma.outboundWebhook.update({
        where: { id: wh.id },
        data: { failureCount: { increment: 1 } },
      }).catch(() => {})

      if (attempt < 3) {
        const delay = attempt * 2000
        setTimeout(() => void this.deliverWithRetry(wh, event, payload, attempt + 1), delay)
      }
    } else {
      await prisma.outboundWebhook.update({
        where: { id: wh.id },
        data: { lastTriggeredAt: new Date(), failureCount: 0 },
      }).catch(() => {})
    }
  }

  async testWebhook(orgId: string, id: string): Promise<{ success: boolean; statusCode?: number }> {
    const wh = await prisma.outboundWebhook.findFirst({ where: { id, organizationId: orgId } })
    if (!wh) throw new Error('Webhook not found')

    const body = JSON.stringify({ event: 'webhook.test', payload: { message: 'Test delivery from Kanavu AI' }, timestamp: new Date().toISOString() })
    const sig = wh.secret ? crypto.createHmac('sha256', wh.secret).update(body).digest('hex') : undefined
    const customHeaders = (wh.headers as Record<string, string>) ?? {}

    try {
      const res = await fetch(wh.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...customHeaders,
          ...(sig && { 'X-Kanavu-Signature': `sha256=${sig}` }),
        },
        body,
        signal: AbortSignal.timeout(10_000),
      })
      return { success: res.ok, statusCode: res.status }
    } catch {
      return { success: false }
    }
  }

  getSupportedEvents() {
    return SUPPORTED_EVENTS
  }
}

export const webhookDeliveryService = new WebhookDeliveryService()
