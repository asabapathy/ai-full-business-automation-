import { prisma } from '@kanavu/database'

export const timeTrackingService = {
  async getEntries(orgId: string, filters?: { userId?: string; contactId?: string; projectId?: string }) {
    const where: any = { organizationId: orgId }
    if (filters?.userId) where.userId = filters.userId
    if (filters?.contactId) where.contactId = filters.contactId
    if (filters?.projectId) where.projectId = filters.projectId
    return prisma.timeEntry.findMany({ where, orderBy: { startTime: 'desc' } })
  },

  async getEntry(orgId: string, id: string) {
    return prisma.timeEntry.findFirst({ where: { id, organizationId: orgId } })
  },

  async createEntry(orgId: string, data: {
    userId: string
    description?: string
    startTime: Date
    endTime?: Date
    duration?: number
    billable?: boolean
    hourlyRate?: number
    contactId?: string
    projectId?: string
  }) {
    let duration = data.duration
    if (!duration && data.endTime) {
      duration = Math.round((data.endTime.getTime() - data.startTime.getTime()) / 60000)
    }
    return prisma.timeEntry.create({
      data: {
        organizationId: orgId,
        userId: data.userId,
        description: data.description,
        startTime: data.startTime,
        endTime: data.endTime,
        duration,
        billable: data.billable ?? true,
        hourlyRate: data.hourlyRate,
        contactId: data.contactId,
        projectId: data.projectId,
      },
    })
  },

  async stopTimer(orgId: string, id: string) {
    const entry = await prisma.timeEntry.findFirst({ where: { id, organizationId: orgId } })
    if (!entry) throw new Error('Entry not found')
    if (entry.endTime) throw new Error('Timer already stopped')
    const endTime = new Date()
    const duration = Math.round((endTime.getTime() - entry.startTime.getTime()) / 60000)
    return prisma.timeEntry.update({ where: { id }, data: { endTime, duration } })
  },

  async updateEntry(orgId: string, id: string, data: {
    description?: string
    startTime?: Date
    endTime?: Date
    billable?: boolean
    hourlyRate?: number
    contactId?: string
    projectId?: string
  }) {
    return prisma.timeEntry.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async deleteEntry(orgId: string, id: string) {
    return prisma.timeEntry.deleteMany({ where: { id, organizationId: orgId } })
  },

  async getStats(orgId: string) {
    const entries = await prisma.timeEntry.findMany({
      where: { organizationId: orgId, endTime: { not: null } },
      select: { duration: true, billable: true, hourlyRate: true },
    })
    const totalMinutes = entries.reduce((sum, e) => sum + (e.duration ?? 0), 0)
    const billableMinutes = entries.filter(e => e.billable).reduce((sum, e) => sum + (e.duration ?? 0), 0)
    const billableRevenue = entries
      .filter(e => e.billable && e.hourlyRate)
      .reduce((sum, e) => sum + (Number(e.hourlyRate ?? 0) * (e.duration ?? 0) / 60), 0)
    return {
      totalHours: (totalMinutes / 60).toFixed(1),
      billableHours: (billableMinutes / 60).toFixed(1),
      billableRevenue,
      entries: entries.length,
    }
  },
}
