import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

const STRIPE_API = 'https://api.stripe.com/v1'

function stripeHeaders(secretKey: string) {
  return {
    Authorization: `Bearer ${secretKey}`,
    'Content-Type': 'application/x-www-form-urlencoded',
  }
}

async function getStripeKey(): Promise<string> {
  return process.env['STRIPE_SECRET_KEY'] ?? ''
}

export const paymentLinksService = {
  async createPaymentLink(orgId: string, data: {
    amount: number
    currency?: string
    description?: string
    invoiceId?: string
    contactId?: string
    expiresAt?: Date
  }) {
    const secretKey = await getStripeKey()
    const currency = (data.currency ?? 'usd').toLowerCase()
    const amountCents = Math.round(data.amount * 100)

    let stripeId: string | undefined
    let url: string

    if (secretKey) {
      try {
        // Create Stripe price
        const priceBody = new URLSearchParams({
          'unit_amount': String(amountCents),
          'currency': currency,
          'product_data[name]': data.description ?? 'Payment',
        })
        const priceRes = await fetch(`${STRIPE_API}/prices`, {
          method: 'POST', headers: stripeHeaders(secretKey), body: priceBody.toString(),
        })
        const price = await priceRes.json() as any

        // Create payment link
        const linkBody = new URLSearchParams({ 'line_items[0][price]': price.id, 'line_items[0][quantity]': '1' })
        if (data.expiresAt) linkBody.set('after_completion[type]', 'redirect')
        const linkRes = await fetch(`${STRIPE_API}/payment_links`, {
          method: 'POST', headers: stripeHeaders(secretKey), body: linkBody.toString(),
        })
        const link = await linkRes.json() as any
        stripeId = link.id
        url = link.url
      } catch (err) {
        logger.warn('Stripe unavailable, generating mock payment link')
        url = `https://pay.kanavu.app/mock/${orgId}/${Date.now()}`
      }
    } else {
      url = `https://pay.kanavu.app/mock/${orgId}/${Date.now()}`
    }

    return prisma.paymentLink.create({
      data: {
        organizationId: orgId,
        invoiceId: data.invoiceId,
        contactId: data.contactId,
        stripeId,
        url,
        amount: data.amount,
        currency: currency.toUpperCase(),
        description: data.description,
        expiresAt: data.expiresAt,
      },
    })
  },

  async getLinks(orgId: string, filters?: { status?: string; contactId?: string }) {
    return prisma.paymentLink.findMany({
      where: {
        organizationId: orgId,
        ...(filters?.status && { status: filters.status }),
        ...(filters?.contactId && { contactId: filters.contactId }),
      },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getLink(orgId: string, id: string) {
    return prisma.paymentLink.findFirst({ where: { id, organizationId: orgId } })
  },

  async deactivateLink(orgId: string, id: string) {
    const link = await prisma.paymentLink.findFirst({ where: { id, organizationId: orgId } })
    if (!link) throw new Error('Not found')

    if (link.stripeId) {
      const secretKey = await getStripeKey()
      if (secretKey) {
        await fetch(`${STRIPE_API}/payment_links/${link.stripeId}`, {
          method: 'POST',
          headers: stripeHeaders(secretKey),
          body: new URLSearchParams({ active: 'false' }).toString(),
        })
      }
    }

    return prisma.paymentLink.update({ where: { id }, data: { status: 'deactivated' } })
  },

  async markPaid(orgId: string, id: string) {
    return prisma.paymentLink.update({
      where: { id },
      data: { status: 'paid', paidAt: new Date() },
    })
  },

  async getStats(orgId: string) {
    const [total, paid, active, links] = await Promise.all([
      prisma.paymentLink.count({ where: { organizationId: orgId } }),
      prisma.paymentLink.count({ where: { organizationId: orgId, status: 'paid' } }),
      prisma.paymentLink.count({ where: { organizationId: orgId, status: 'active' } }),
      prisma.paymentLink.findMany({ where: { organizationId: orgId, status: 'paid' } }),
    ])
    const totalRevenue = links.reduce((s, l) => s + l.amount, 0)
    return { total, paid, active, totalRevenue }
  },
}
