import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

export class WaitlistService {
  async getEntries(orgId: string, filters: { status?: string; serviceId?: string; page?: number; limit?: number } = {}) {
    const { status, serviceId, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where: any = { organizationId: orgId }
    if (status) where.status = status
    if (serviceId) where.serviceId = serviceId

    const [entries, total] = await Promise.all([
      prisma.waitlistEntry.findMany({
        where,
        orderBy: { createdAt: 'asc' },
        skip,
        take: limit,
      }),
      prisma.waitlistEntry.count({ where }),
    ])
    return { entries, total, page, limit }
  }

  async addToWaitlist(orgId: string, data: {
    contactId: string
    serviceId?: string
    employeeId?: string
    preferredDate?: Date
    preferredTimeFrom?: string
    preferredTimeTo?: string
    notes?: string
  }) {
    return prisma.waitlistEntry.create({
      data: { organizationId: orgId, ...data },
    })
  }

  async notifyWaitlist(orgId: string, slotDate: Date, serviceId?: string) {
    const entries = await prisma.waitlistEntry.findMany({
      where: {
        organizationId: orgId,
        status: 'WAITING',
        ...(serviceId ? { serviceId } : {}),
      },
      orderBy: { createdAt: 'asc' },
      take: 5,
    })

    const accountSid = process.env['TWILIO_ACCOUNT_SID']
    const authToken = process.env['TWILIO_AUTH_TOKEN']
    const fromNumber = process.env['TWILIO_PHONE_NUMBER']

    const notified: string[] = []
    for (const entry of entries) {
      try {
        const contact = await prisma.contact.findUnique({ where: { id: entry.contactId }, select: { phone: true, firstName: true } })
        if (!contact?.phone || !accountSid || !authToken || !fromNumber) continue

        const dateStr = slotDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
        const body = `Hi ${contact.firstName ?? 'there'}! A slot opened up on ${dateStr}. Reply YES to book or call us to schedule.`

        const form = new URLSearchParams({ To: contact.phone, From: fromNumber, Body: body })
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: form.toString(),
        })

        await prisma.waitlistEntry.update({
          where: { id: entry.id },
          data: { notifiedAt: new Date(), status: 'NOTIFIED' },
        })
        notified.push(entry.id)
      } catch (err) {
        logger.error(err, 'Failed to notify waitlist contact')
      }
    }
    return { notified: notified.length }
  }

  async updateStatus(orgId: string, id: string, status: string) {
    return prisma.waitlistEntry.updateMany({
      where: { id, organizationId: orgId },
      data: { status },
    })
  }

  async removeEntry(orgId: string, id: string) {
    return prisma.waitlistEntry.updateMany({
      where: { id, organizationId: orgId },
      data: { status: 'REMOVED' },
    })
  }

  async getStats(orgId: string) {
    const [waiting, notified, booked] = await Promise.all([
      prisma.waitlistEntry.count({ where: { organizationId: orgId, status: 'WAITING' } }),
      prisma.waitlistEntry.count({ where: { organizationId: orgId, status: 'NOTIFIED' } }),
      prisma.waitlistEntry.count({ where: { organizationId: orgId, status: 'BOOKED' } }),
    ])
    return { waiting, notified, booked, total: waiting + notified + booked }
  }
}

export const waitlistService = new WaitlistService()
