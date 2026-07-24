import { prisma } from '@kanavu/database'

export const emailBroadcastService = {
  async getBroadcasts(orgId: string) {
    return prisma.emailBroadcast.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getBroadcast(orgId: string, id: string) {
    return prisma.emailBroadcast.findFirst({ where: { id, organizationId: orgId } })
  },

  async createBroadcast(orgId: string, data: {
    subject: string
    htmlContent: string
    fromName?: string
    replyTo?: string
    tags?: string[]
    scheduledAt?: Date
  }) {
    return prisma.emailBroadcast.create({
      data: {
        organizationId: orgId,
        subject: data.subject,
        htmlContent: data.htmlContent,
        fromName: data.fromName,
        replyTo: data.replyTo,
        tags: data.tags ?? [],
        scheduledAt: data.scheduledAt,
      },
    })
  },

  async updateBroadcast(orgId: string, id: string, data: Partial<{
    subject: string
    htmlContent: string
    fromName: string
    replyTo: string
    tags: string[]
    scheduledAt: Date
  }>) {
    return prisma.emailBroadcast.updateMany({
      where: { id, organizationId: orgId, status: 'draft' },
      data,
    })
  },

  async deleteBroadcast(orgId: string, id: string) {
    return prisma.emailBroadcast.deleteMany({ where: { id, organizationId: orgId, status: 'draft' } })
  },

  async sendBroadcast(orgId: string, id: string) {
    const broadcast = await prisma.emailBroadcast.findFirst({ where: { id, organizationId: orgId } })
    if (!broadcast) throw new Error('Broadcast not found')
    if (broadcast.status !== 'draft') throw new Error('Only draft broadcasts can be sent')

    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, isActive: true, email: { not: null } },
      select: { id: true, email: true, firstName: true, lastName: true },
    })

    await prisma.emailBroadcast.update({ where: { id }, data: { status: 'sending', recipientCount: contacts.length } })

    const { EmailService } = await import('@kanavu/integrations')
    const emailSvc = EmailService.fromEnv()
    let sentCount = 0

    for (const contact of contacts) {
      if (!contact.email) continue
      try {
        await emailSvc.sendRaw?.({
          to: contact.email,
          subject: broadcast.subject,
          html: broadcast.htmlContent.replace(/{{firstName}}/g, contact.firstName).replace(/{{lastName}}/g, contact.lastName),
        })
        sentCount++
      } catch {}
    }

    return prisma.emailBroadcast.update({
      where: { id },
      data: { status: 'sent', sentCount, sentAt: new Date() },
    })
  },

  async getStats(orgId: string) {
    const [total, drafts, sent, broadcasts] = await Promise.all([
      prisma.emailBroadcast.count({ where: { organizationId: orgId } }),
      prisma.emailBroadcast.count({ where: { organizationId: orgId, status: 'draft' } }),
      prisma.emailBroadcast.count({ where: { organizationId: orgId, status: 'sent' } }),
      prisma.emailBroadcast.findMany({ where: { organizationId: orgId, status: 'sent' } }),
    ])
    const totalSent = broadcasts.reduce((s, b) => s + b.sentCount, 0)
    const totalOpens = broadcasts.reduce((s, b) => s + b.openCount, 0)
    const avgOpenRate = totalSent > 0 ? (totalOpens / totalSent) * 100 : 0
    return { total, drafts, sent, totalSent, avgOpenRate }
  },
}
