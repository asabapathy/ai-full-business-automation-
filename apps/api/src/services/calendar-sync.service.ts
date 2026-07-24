import { prisma } from '@kanavu/database'

function escapeIcal(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')
}

function toIcalDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '')
}

export const calendarSyncService = {
  async getFeeds(orgId: string) {
    return prisma.calendarFeed.findMany({ where: { organizationId: orgId }, orderBy: { createdAt: 'desc' } })
  },

  async createFeed(orgId: string, data: { name: string; staffUserId?: string }) {
    return prisma.calendarFeed.create({
      data: { organizationId: orgId, name: data.name, staffUserId: data.staffUserId },
    })
  },

  async deleteFeed(orgId: string, id: string) {
    return prisma.calendarFeed.deleteMany({ where: { id, organizationId: orgId } })
  },

  async toggleFeed(orgId: string, id: string, isActive: boolean) {
    return prisma.calendarFeed.updateMany({ where: { id, organizationId: orgId }, data: { isActive } })
  },

  async generateIcal(feedToken: string): Promise<string> {
    const feed = await prisma.calendarFeed.findUnique({ where: { feedToken } })
    if (!feed || !feed.isActive) throw new Error('Feed not found or inactive')

    const where: any = { organizationId: feed.organizationId }
    if (feed.staffUserId) where.staffId = feed.staffUserId

    const appointments = await prisma.appointment.findMany({
      where,
      include: { contact: { select: { firstName: true, lastName: true, email: true } }, service: { select: { name: true } } },
      orderBy: { startTime: 'asc' },
      take: 500,
    })

    const org = await prisma.organization.findUnique({ where: { id: feed.organizationId }, select: { name: true } })

    const lines: string[] = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      `PRODID:-//Kanavu AI//Calendar Sync//EN`,
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      `X-WR-CALNAME:${escapeIcal(feed.name)}`,
      `X-WR-CALDESC:${escapeIcal(`${org?.name ?? 'Kanavu'} appointments`)}`,
    ]

    for (const appt of appointments) {
      const uid = `${appt.id}@kanavu.ai`
      const summary = appt.service ? appt.service.name : (appt.title ?? 'Appointment')
      const contactName = appt.contact ? `${appt.contact.firstName} ${appt.contact.lastName}` : ''

      lines.push('BEGIN:VEVENT')
      lines.push(`UID:${uid}`)
      lines.push(`DTSTART:${toIcalDate(appt.startTime)}`)
      lines.push(`DTEND:${toIcalDate(appt.endTime)}`)
      lines.push(`SUMMARY:${escapeIcal(summary)}${contactName ? ` — ${escapeIcal(contactName)}` : ''}`)
      if (appt.notes) lines.push(`DESCRIPTION:${escapeIcal(appt.notes)}`)
      if (appt.location) lines.push(`LOCATION:${escapeIcal(appt.location)}`)
      if (appt.contact?.email) lines.push(`ATTENDEE;CN=${escapeIcal(contactName)}:mailto:${appt.contact.email}`)
      lines.push(`STATUS:${appt.status === 'cancelled' ? 'CANCELLED' : 'CONFIRMED'}`)
      lines.push(`DTSTAMP:${toIcalDate(new Date())}`)
      lines.push(`LAST-MODIFIED:${toIcalDate(appt.updatedAt)}`)
      lines.push('END:VEVENT')
    }

    lines.push('END:VCALENDAR')
    return lines.join('\r\n')
  },
}
