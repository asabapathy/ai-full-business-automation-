import { prisma } from './database.js'

export class ResourceBookingService {
  async getResources(orgId: string) {
    return prisma.resource.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { name: 'asc' },
      include: { _count: { select: { bookings: true } } },
    })
  }

  async getResource(orgId: string, id: string) {
    return prisma.resource.findFirst({ where: { id, organizationId: orgId } })
  }

  async createResource(orgId: string, data: {
    name: string
    type?: string
    description?: string
    capacity?: number
    color?: string
  }) {
    return prisma.resource.create({ data: { organizationId: orgId, ...data } })
  }

  async updateResource(orgId: string, id: string, data: Partial<{ name: string; type: string; description: string; capacity: number; isActive: boolean; color: string }>) {
    return prisma.resource.updateMany({ where: { id, organizationId: orgId }, data })
  }

  async deleteResource(orgId: string, id: string) {
    return prisma.resource.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
  }

  async checkAvailability(resourceId: string, startTime: Date, endTime: Date, excludeBookingId?: string): Promise<boolean> {
    const conflict = await prisma.resourceBooking.findFirst({
      where: {
        resourceId,
        status: { not: 'CANCELED' },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
        OR: [
          { startTime: { lt: endTime }, endTime: { gt: startTime } },
        ],
      },
    })
    return !conflict
  }

  async bookResource(orgId: string, data: {
    resourceId: string
    startTime: Date
    endTime: Date
    title?: string
    appointmentId?: string
    bookedBy?: string
    notes?: string
  }) {
    const available = await this.checkAvailability(data.resourceId, data.startTime, data.endTime)
    if (!available) throw new Error('Resource is not available during this time slot')

    return prisma.resourceBooking.create({
      data: { organizationId: orgId, ...data },
    })
  }

  async cancelBooking(orgId: string, bookingId: string) {
    return prisma.resourceBooking.updateMany({
      where: { id: bookingId, organizationId: orgId },
      data: { status: 'CANCELED' },
    })
  }

  async getBookings(orgId: string, resourceId?: string, from?: Date, to?: Date) {
    const where: any = { organizationId: orgId }
    if (resourceId) where.resourceId = resourceId
    if (from || to) {
      where.startTime = {}
      if (from) where.startTime.gte = from
      if (to) where.startTime.lte = to
    }

    return prisma.resourceBooking.findMany({
      where,
      orderBy: { startTime: 'asc' },
      include: { resource: { select: { name: true, type: true, color: true } } },
    })
  }

  async getResourceSchedule(orgId: string, startDate: Date, endDate: Date) {
    const resources = await this.getResources(orgId)
    const bookings = await this.getBookings(orgId, undefined, startDate, endDate)

    return resources.map(r => ({
      resource: r,
      bookings: bookings.filter(b => b.resourceId === r.id),
    }))
  }
}

export const resourceBookingService = new ResourceBookingService()
