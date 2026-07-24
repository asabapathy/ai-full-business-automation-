import { prisma } from './database.js'

export class CommissionService {
  async getRules(orgId: string) {
    return prisma.commissionRule.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    })
  }

  async createRule(orgId: string, data: {
    name: string
    type: 'percentage' | 'flat'
    rate: number
    employeeId?: string
    minAmount?: number
    serviceIds?: string[]
  }) {
    return prisma.commissionRule.create({
      data: {
        organizationId: orgId,
        name: data.name,
        type: data.type,
        rate: data.rate,
        employeeId: data.employeeId,
        minAmount: data.minAmount,
        serviceIds: data.serviceIds ?? [],
      },
    })
  }

  async updateRule(orgId: string, id: string, data: Partial<{ name: string; rate: number; isActive: boolean; minAmount: number }>) {
    return prisma.commissionRule.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
  }

  async deleteRule(orgId: string, id: string) {
    return prisma.commissionRule.deleteMany({ where: { id, organizationId: orgId } })
  }

  async calculatePayouts(orgId: string, periodStart: string, periodEnd: string) {
    const start = new Date(periodStart)
    const end = new Date(periodEnd)

    const rules = await prisma.commissionRule.findMany({
      where: { organizationId: orgId, isActive: true },
    })

    const invoices = await prisma.invoice.findMany({
      where: {
        organizationId: orgId,
        status: 'PAID',
        paidAt: { gte: start, lte: end },
      },
      include: { contact: { select: { id: true } } },
    })

    const employees = await prisma.employee.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, firstName: true, lastName: true },
    })

    const payoutMap: Record<string, { employee: { id: string; firstName: string; lastName: string }; gross: number; commission: number; breakdown: any[] }> = {}

    for (const emp of employees) {
      const empRules = rules.filter(r => !r.employeeId || r.employeeId === emp.id)
      if (empRules.length === 0) continue

      let gross = 0
      let commission = 0
      const breakdown: any[] = []

      for (const inv of invoices) {
        const amt = Number(inv.total ?? 0)
        gross += amt
        for (const rule of empRules) {
          const min = rule.minAmount ? Number(rule.minAmount) : 0
          if (amt < min) continue
          const earned = rule.type === 'percentage'
            ? amt * (Number(rule.rate) / 100)
            : Number(rule.rate)
          commission += earned
          breakdown.push({ invoiceId: inv.id, amount: amt, rule: rule.name, earned })
        }
      }

      if (gross > 0) {
        payoutMap[emp.id] = { employee: emp, gross, commission, breakdown }
      }
    }

    const payouts = Object.values(payoutMap)

    const created = await Promise.all(payouts.map(p =>
      prisma.commissionPayout.create({
        data: {
          organizationId: orgId,
          employeeId: p.employee.id,
          periodStart: start,
          periodEnd: end,
          grossRevenue: p.gross,
          commissionAmount: p.commission,
          breakdown: p.breakdown,
          status: 'pending',
        },
      })
    ))

    return { payouts: created, count: created.length }
  }

  async getPayouts(orgId: string, filters: { employeeId?: string; status?: string }) {
    return prisma.commissionPayout.findMany({
      where: {
        organizationId: orgId,
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
        ...(filters.status ? { status: filters.status } : {}),
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async markPaid(orgId: string, id: string) {
    return prisma.commissionPayout.updateMany({
      where: { id, organizationId: orgId },
      data: { status: 'paid', paidAt: new Date() },
    })
  }

  async getSummary(orgId: string) {
    const [pending, paid, totalCommission] = await Promise.all([
      prisma.commissionPayout.count({ where: { organizationId: orgId, status: 'pending' } }),
      prisma.commissionPayout.count({ where: { organizationId: orgId, status: 'paid' } }),
      prisma.commissionPayout.aggregate({
        where: { organizationId: orgId },
        _sum: { commissionAmount: true },
      }),
    ])
    return {
      pendingPayouts: pending,
      paidPayouts: paid,
      totalCommissionEarned: Number(totalCommission._sum.commissionAmount ?? 0),
    }
  }
}

export const commissionService = new CommissionService()
