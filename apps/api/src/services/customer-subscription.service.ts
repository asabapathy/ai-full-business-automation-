import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface PlanData {
  contactId: string
  name: string
  description?: string
  amount: number
  currency?: string
  interval?: 'monthly' | 'quarterly' | 'yearly'
  stripeSubscriptionId?: string
  stripePriceId?: string
}

export class CustomerSubscriptionService {
  async createSubscription(orgId: string, data: PlanData) {
    return prisma.customerSubscription.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        name: data.name,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        interval: data.interval ?? 'monthly',
        status: 'active',
        stripeSubscriptionId: data.stripeSubscriptionId,
        stripePriceId: data.stripePriceId,
        currentPeriodStart: new Date(),
        currentPeriodEnd: this.nextPeriodEnd(data.interval ?? 'monthly'),
      },
      include: { contact: { select: { firstName: true, lastName: true, email: true } } },
    })
  }

  async getSubscriptions(orgId: string, status?: string) {
    return prisma.customerSubscription.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async getSubscription(orgId: string, id: string) {
    return prisma.customerSubscription.findFirst({
      where: { id, organizationId: orgId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
    })
  }

  async updateSubscription(orgId: string, id: string, data: { status?: string; cancelAtPeriodEnd?: boolean }) {
    return prisma.customerSubscription.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
  }

  async cancelSubscription(orgId: string, id: string, immediate = false): Promise<void> {
    if (immediate) {
      await prisma.customerSubscription.updateMany({
        where: { id, organizationId: orgId },
        data: { status: 'cancelled' },
      })
    } else {
      await prisma.customerSubscription.updateMany({
        where: { id, organizationId: orgId },
        data: { cancelAtPeriodEnd: true },
      })
    }
  }

  async getRevenueSummary(orgId: string) {
    const subs = await prisma.customerSubscription.findMany({
      where: { organizationId: orgId, status: 'active' },
      select: { amount: true, interval: true, currency: true },
    })

    let mrr = 0
    for (const sub of subs) {
      const amount = Number(sub.amount)
      if (sub.interval === 'monthly') mrr += amount
      else if (sub.interval === 'quarterly') mrr += amount / 3
      else if (sub.interval === 'yearly') mrr += amount / 12
    }

    return {
      mrr: Math.round(mrr * 100) / 100,
      arr: Math.round(mrr * 12 * 100) / 100,
      activeCount: subs.length,
    }
  }

  private nextPeriodEnd(interval: string): Date {
    const d = new Date()
    if (interval === 'monthly') d.setMonth(d.getMonth() + 1)
    else if (interval === 'quarterly') d.setMonth(d.getMonth() + 3)
    else if (interval === 'yearly') d.setFullYear(d.getFullYear() + 1)
    return d
  }
}

export const customerSubscriptionService = new CustomerSubscriptionService()
