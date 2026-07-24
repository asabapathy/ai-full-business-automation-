import { prisma } from './database.js'

export class MultiLocationReportService {
  async getLocationSummaries(orgId: string) {
    const locations = await prisma.location.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, name: true, city: true, state: true, phone: true },
    })

    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const summaries = await Promise.all(locations.map(async (loc) => {
      const [revenue, appointments, contacts, reviews] = await Promise.all([
        prisma.invoice.aggregate({
          where: {
            organizationId: orgId,
            status: 'PAID',
            paidAt: { gte: thirtyDaysAgo },
            metadata: { path: ['locationId'], equals: loc.id },
          },
          _sum: { total: true },
        }),
        prisma.appointment.count({
          where: {
            organizationId: orgId,
            startTime: { gte: thirtyDaysAgo },
            metadata: { path: ['locationId'], equals: loc.id },
          },
        }),
        prisma.contact.count({
          where: {
            organizationId: orgId,
            createdAt: { gte: thirtyDaysAgo },
            customFields: { path: ['locationId'], equals: loc.id },
          },
        }),
        prisma.review.aggregate({
          where: {
            organizationId: orgId,
            createdAt: { gte: thirtyDaysAgo },
          },
          _avg: { rating: true },
          _count: true,
        }),
      ])

      return {
        location: loc,
        revenue30d: Number(revenue._sum.total ?? 0),
        appointments30d: appointments,
        newContacts30d: contacts,
        avgRating: reviews._avg.rating ? Math.round(Number(reviews._avg.rating) * 10) / 10 : null,
        reviewCount: reviews._count,
      }
    }))

    return summaries
  }

  async getAggregateMetrics(orgId: string) {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)

    const [
      revenue30,
      revenue30to60,
      appts30,
      contacts30,
      invoicesPaid,
      invoicesOverdue,
      locationCount,
    ] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
        _sum: { total: true },
      }),
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: 'PAID', paidAt: { gte: sixtyDaysAgo, lt: thirtyDaysAgo } },
        _sum: { total: true },
      }),
      prisma.appointment.count({
        where: { organizationId: orgId, startTime: { gte: thirtyDaysAgo } },
      }),
      prisma.contact.count({
        where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } },
      }),
      prisma.invoice.count({ where: { organizationId: orgId, status: 'PAID' } }),
      prisma.invoice.count({ where: { organizationId: orgId, status: 'OVERDUE' } }),
      prisma.location.count({ where: { organizationId: orgId, isActive: true } }),
    ])

    const rev30 = Number(revenue30._sum.total ?? 0)
    const rev60 = Number(revenue30to60._sum.total ?? 0)
    const revenueChange = rev60 > 0 ? ((rev30 - rev60) / rev60) * 100 : 0

    return {
      revenue30d: rev30,
      revenueChange30d: Math.round(revenueChange * 10) / 10,
      appointments30d: appts30,
      newContacts30d: contacts30,
      invoicesPaid,
      invoicesOverdue,
      locationCount,
    }
  }

  async getLocationComparison(orgId: string, metric: 'revenue' | 'appointments' | 'contacts') {
    const summaries = await this.getLocationSummaries(orgId)
    return summaries
      .map(s => ({
        locationId: s.location.id,
        locationName: s.location.name,
        city: s.location.city,
        value: metric === 'revenue' ? s.revenue30d
          : metric === 'appointments' ? s.appointments30d
          : s.newContacts30d,
      }))
      .sort((a, b) => b.value - a.value)
  }

  async getTopPerformers(orgId: string) {
    const summaries = await this.getLocationSummaries(orgId)
    const topByRevenue = [...summaries].sort((a, b) => b.revenue30d - a.revenue30d)[0]
    const topByAppts = [...summaries].sort((a, b) => b.appointments30d - a.appointments30d)[0]
    const topByRating = [...summaries].filter(s => s.avgRating !== null).sort((a, b) => (b.avgRating ?? 0) - (a.avgRating ?? 0))[0]

    return {
      topByRevenue: topByRevenue?.location?.name ?? null,
      topByAppointments: topByAppts?.location?.name ?? null,
      topByRating: topByRating?.location?.name ?? null,
    }
  }
}

export const multiLocationReportService = new MultiLocationReportService()
