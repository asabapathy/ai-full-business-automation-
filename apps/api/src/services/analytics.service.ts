import { prisma } from './database.js'

export class AnalyticsService {
  async getOverview(organizationId: string, period: '7d' | '30d' | '90d' | '1y' = '30d') {
    const days = { '7d': 7, '30d': 30, '90d': 90, '1y': 365 }[period]
    const from = new Date(Date.now() - days * 86400000)
    const prevFrom = new Date(Date.now() - days * 2 * 86400000)

    const [
      revenue, prevRevenue,
      newContacts, prevContacts,
      appointments, prevAppointments,
      activeCampaigns,
      dealsWon, prevDealsWon,
      pipelineValue,
    ] = await Promise.all([
      prisma.invoice.aggregate({ where: { organizationId, createdAt: { gte: from } }, _sum: { total: true } }),
      prisma.invoice.aggregate({ where: { organizationId, createdAt: { gte: prevFrom, lt: from } }, _sum: { total: true } }),
      prisma.contact.count({ where: { organizationId, createdAt: { gte: from } } }),
      prisma.contact.count({ where: { organizationId, createdAt: { gte: prevFrom, lt: from } } }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: from } } }),
      prisma.appointment.count({ where: { organizationId, startTime: { gte: prevFrom, lt: from } } }),
      prisma.campaign.count({ where: { organizationId, status: 'ACTIVE' as never } }),
      prisma.deal.aggregate({ where: { organizationId, stage: 'WON' as never, updatedAt: { gte: from } }, _sum: { value: true }, _count: true }),
      prisma.deal.aggregate({ where: { organizationId, stage: 'WON' as never, updatedAt: { gte: prevFrom, lt: from } }, _sum: { value: true }, _count: true }),
      prisma.deal.aggregate({ where: { organizationId, stage: { notIn: ['WON', 'LOST'] as never[] } }, _sum: { value: true } }),
    ])

    const revenueVal = Number(revenue._sum.total ?? 0)
    const prevRevenueVal = Number(prevRevenue._sum.total ?? 0)

    const pct = (curr: number, prev: number) =>
      prev === 0 ? (curr > 0 ? 100 : 0) : Math.round(((curr - prev) / prev) * 100)

    return {
      period,
      metrics: {
        revenue: { value: revenueVal, change: pct(revenueVal, prevRevenueVal), trend: revenueVal >= prevRevenueVal ? 'up' : 'down' },
        newContacts: { value: newContacts, change: pct(newContacts, prevContacts), trend: newContacts >= prevContacts ? 'up' : 'down' },
        appointments: { value: appointments, change: pct(appointments, prevAppointments), trend: appointments >= prevAppointments ? 'up' : 'down' },
        activeCampaigns: { value: activeCampaigns, change: 0, trend: 'neutral' },
        dealsWon: { value: dealsWon._count, change: pct(dealsWon._count, prevDealsWon._count), trend: dealsWon._count >= prevDealsWon._count ? 'up' : 'down' },
        pipelineValue: { value: Number(pipelineValue._sum.value ?? 0), change: 0, trend: 'neutral' },
      },
    }
  }

  async getRevenueChart(organizationId: string, period: '30d' | '90d' | '1y' = '30d') {
    const days = { '30d': 30, '90d': 90, '1y': 365 }[period]
    const from = new Date(Date.now() - days * 86400000)

    const invoices = await prisma.invoice.findMany({
      where: { organizationId, createdAt: { gte: from } },
      select: { total: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    })

    const buckets: Record<string, number> = {}
    for (let i = 0; i < (days <= 30 ? days : Math.ceil(days / 7)); i++) {
      const d = new Date(from)
      if (days <= 30) d.setDate(d.getDate() + i)
      else d.setDate(d.getDate() + i * 7)
      const key = d.toISOString().split('T')[0]!
      buckets[key] = 0
    }

    for (const inv of invoices) {
      const key = inv.createdAt.toISOString().split('T')[0]!
      if (key in buckets) buckets[key] = (buckets[key] ?? 0) + Number(inv.total)
    }

    return Object.entries(buckets).map(([date, value]) => ({ date, value }))
  }

  async getPipelineFunnel(organizationId: string) {
    const stages = await prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId },
      _count: true,
      _sum: { value: true },
    })

    const stageOrder = ['PROSPECTING', 'QUALIFICATION', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']
    return stages
      .sort((a, b) => stageOrder.indexOf(a.stage) - stageOrder.indexOf(b.stage))
      .map(s => ({ stage: s.stage, count: s._count, value: Number(s._sum.value ?? 0) }))
  }

  async getTopChannels(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const campaigns = await prisma.campaign.groupBy({
      by: ['type'],
      where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
      _count: true,
    })
    return campaigns.map(c => ({ channel: c.type, campaigns: c._count }))
  }

  async getContactGrowth(organizationId: string) {
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const contacts = await prisma.contact.findMany({
      where: { organizationId, createdAt: { gte: sixMonthsAgo } },
      select: { createdAt: true, type: true },
    })

    const byMonth: Record<string, { leads: number; customers: number }> = {}
    for (const c of contacts) {
      const key = `${c.createdAt.getFullYear()}-${String(c.createdAt.getMonth() + 1).padStart(2, '0')}`
      if (!byMonth[key]) byMonth[key] = { leads: 0, customers: 0 }
      if (c.type === 'CUSTOMER') byMonth[key]!.customers++
      else byMonth[key]!.leads++
    }

    return Object.entries(byMonth).map(([month, vals]) => ({ month, ...vals }))
  }

  async getAppointmentStats(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000)
    const byStatus = await prisma.appointment.groupBy({
      by: ['status'],
      where: { organizationId, startTime: { gte: thirtyDaysAgo } },
      _count: true,
    })

    const total = byStatus.reduce((s, b) => s + b._count, 0)
    return {
      total,
      byStatus: byStatus.map(b => ({ status: b.status, count: b._count, pct: total > 0 ? Math.round((b._count / total) * 100) : 0 })),
    }
  }
}

export const analyticsService = new AnalyticsService()
