import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

export class BillingPortalService {
  async createPortalSession(orgId: string, returnUrl: string): Promise<{ url: string }> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { stripeCustomerId: true, plan: true, status: true },
    })

    if (!subscription?.stripeCustomerId) {
      throw new Error('No Stripe customer found for this organization')
    }

    const stripeKey = process.env['STRIPE_SECRET_KEY']
    if (!stripeKey) throw new Error('Stripe not configured')

    const form = new URLSearchParams({
      customer: subscription.stripeCustomerId,
      return_url: returnUrl,
    })

    const resp = await fetch('https://api.stripe.com/v1/billing_portal/sessions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: form.toString(),
    })

    if (!resp.ok) {
      const err = await resp.json() as { error?: { message?: string } }
      throw new Error(err?.error?.message ?? 'Failed to create billing portal session')
    }

    const session = await resp.json() as { url: string }
    return { url: session.url }
  }

  async getSubscriptionDetails(orgId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      include: {
        invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
        usageRecords: { orderBy: { recordedAt: 'desc' }, take: 10 },
      },
    })
    return subscription
  }

  async getInvoiceHistory(orgId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
    })
    if (!subscription) return []

    return prisma.billingInvoice.findMany({
      where: { subscriptionId: subscription.id },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  async syncFromStripe(orgId: string) {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: orgId },
      select: { stripeSubscriptionId: true, stripeCustomerId: true },
    })
    if (!subscription?.stripeSubscriptionId) return null

    const stripeKey = process.env['STRIPE_SECRET_KEY']
    if (!stripeKey) return null

    try {
      const resp = await fetch(`https://api.stripe.com/v1/subscriptions/${subscription.stripeSubscriptionId}`, {
        headers: { Authorization: `Bearer ${stripeKey}` },
      })
      if (!resp.ok) return null

      const stripeData = await resp.json() as {
        status: string
        current_period_start: number
        current_period_end: number
        cancel_at_period_end: boolean
      }

      await prisma.subscription.update({
        where: { organizationId: orgId },
        data: {
          status: stripeData.status.toUpperCase() as any,
          currentPeriodStart: new Date(stripeData.current_period_start * 1000),
          currentPeriodEnd: new Date(stripeData.current_period_end * 1000),
          cancelAtPeriodEnd: stripeData.cancel_at_period_end,
        },
      })

      return stripeData
    } catch (err) {
      logger.error(err, 'Failed to sync from Stripe')
      return null
    }
  }
}

export const billingPortalService = new BillingPortalService()
