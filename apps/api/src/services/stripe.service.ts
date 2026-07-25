import Stripe from 'stripe'
import { config } from '../config/index.js'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

export class StripeService {
  private stripe: Stripe

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey, { apiVersion: '2024-12-18.acacia' })
  }

  static fromEnv(): StripeService {
    if (!config.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY not configured')
    return new StripeService(config.STRIPE_SECRET_KEY)
  }

  async createPaymentIntent(opts: {
    amount: number
    currency: string
    metadata?: Record<string, string>
    customerId?: string
  }) {
    return this.stripe.paymentIntents.create({
      amount: opts.amount,
      currency: opts.currency,
      customer: opts.customerId,
      metadata: opts.metadata ?? {},
      automatic_payment_methods: { enabled: true },
    })
  }

  async createOrUpdateCustomer(opts: {
    organizationId: string
    email: string
    name: string
    metadata?: Record<string, string>
  }): Promise<string> {
    const subscription = await prisma.subscription.findUnique({
      where: { organizationId: opts.organizationId },
      select: { stripeCustomerId: true },
    })

    if (subscription?.stripeCustomerId) return subscription.stripeCustomerId

    const customer = await this.stripe.customers.create({
      email: opts.email,
      name: opts.name,
      metadata: { organizationId: opts.organizationId, ...opts.metadata },
    })

    await prisma.subscription.upsert({
      where: { organizationId: opts.organizationId },
      update: { stripeCustomerId: customer.id },
      create: {
        organizationId: opts.organizationId,
        stripeCustomerId: customer.id,
      },
    })

    return customer.id
  }

  async createCheckoutSession(opts: {
    organizationId: string
    priceId: string
    customerId: string
    successUrl: string
    cancelUrl: string
    metadata?: Record<string, string>
  }) {
    return this.stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: opts.customerId,
      line_items: [{ price: opts.priceId, quantity: 1 }],
      success_url: opts.successUrl,
      cancel_url: opts.cancelUrl,
      metadata: { organizationId: opts.organizationId, ...opts.metadata },
      subscription_data: { metadata: { organizationId: opts.organizationId } },
    })
  }

  async createBillingPortalSession(customerId: string, returnUrl: string) {
    return this.stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: returnUrl,
    })
  }

  constructWebhookEvent(payload: Buffer, signature: string): Stripe.Event {
    if (!config.STRIPE_WEBHOOK_SECRET) throw new Error('STRIPE_WEBHOOK_SECRET not configured')
    return this.stripe.webhooks.constructEvent(payload, signature, config.STRIPE_WEBHOOK_SECRET)
  }

  async handleWebhookEvent(event: Stripe.Event): Promise<void> {
    switch (event.type) {
      case 'payment_intent.succeeded': {
        const pi = event.data.object as Stripe.PaymentIntent
        await this.handleInvoicePayment(pi)
        break
      }
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.CheckoutSession
        await this.handleCheckoutCompleted(session)
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        await this.syncSubscription(sub)
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice
        await this.handlePaymentFailed(inv)
        break
      }
      default:
        logger.debug({ type: event.type }, 'Unhandled Stripe event')
    }
  }

  private async handleInvoicePayment(pi: Stripe.PaymentIntent) {
    const { invoiceId, organizationId } = pi.metadata
    if (!invoiceId || !organizationId) return

    const amountPaid = pi.amount_received / 100

    const invoice = await prisma.invoice.findFirst({ where: { id: invoiceId, organizationId } })
    if (!invoice) return

    const newAmountPaid = Number(invoice.amountPaid) + amountPaid
    const total = Number(invoice.total)
    const newStatus = newAmountPaid >= total ? 'PAID' : newAmountPaid > 0 ? 'PARTIAL' : invoice.status

    await prisma.invoice.update({
      where: { id: invoiceId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus as never,
        paidAt: newStatus === 'PAID' ? new Date() : undefined,
      },
    })

    await prisma.payment.create({
      data: {
        invoiceId,
        amount: amountPaid,
        method: 'CARD',
        reference: pi.id,
        paidAt: new Date(),
      },
    })

    logger.info({ invoiceId, amountPaid, newStatus }, 'Invoice payment recorded')
  }

  private async handleCheckoutCompleted(session: Stripe.CheckoutSession) {
    if (session.mode !== 'subscription') return
    const { organizationId } = session.metadata ?? {}
    if (!organizationId || !session.subscription) return

    const stripeSub = await this.stripe.subscriptions.retrieve(session.subscription as string)
    await this.syncSubscription(stripeSub, organizationId)
  }

  private async syncSubscription(stripeSub: Stripe.Subscription, orgId?: string) {
    const organizationId = orgId ?? (stripeSub.metadata['organizationId'] as string)
    if (!organizationId) return

    const priceId = stripeSub.items.data[0]?.price.id ?? ''

    // Map env-configured price IDs → plan names, with legacy fallback keys
    const planMap: Record<string, string> = {
      // Env-configured Stripe price IDs
      ...(config.STRIPE_PRICE_STARTER ? { [config.STRIPE_PRICE_STARTER]: 'STARTER' } : {}),
      ...(config.STRIPE_PRICE_PRO ? { [config.STRIPE_PRICE_PRO]: 'PRO' } : {}),
      ...(config.STRIPE_PRICE_BUSINESS ? { [config.STRIPE_PRICE_BUSINESS]: 'BUSINESS' } : {}),
      // Fallback substring matching for legacy/dev price IDs
      price_starter: 'STARTER',
      price_pro: 'PRO',
      price_business: 'BUSINESS',
      price_enterprise: 'ENTERPRISE',
    }

    const plan = planMap[priceId]
      ?? Object.entries(planMap).find(([k]) => priceId.toLowerCase().includes(k.toLowerCase()))?.[1]
      ?? 'STARTER'

    const statusMap: Record<string, string> = {
      active: 'ACTIVE',
      trialing: 'TRIALING',
      canceled: 'CANCELED',
      past_due: 'PAST_DUE',
      unpaid: 'PAST_DUE',
      paused: 'PAUSED',
      incomplete: 'INCOMPLETE',
      incomplete_expired: 'CANCELED',
    }

    await prisma.subscription.upsert({
      where: { organizationId },
      update: {
        plan: plan as never,
        status: (statusMap[stripeSub.status] ?? 'ACTIVE') as never,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date((stripeSub.current_period_start ?? 0) * 1000),
        currentPeriodEnd: new Date((stripeSub.current_period_end ?? 0) * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
      create: {
        organizationId,
        plan: plan as never,
        status: (statusMap[stripeSub.status] ?? 'ACTIVE') as never,
        stripeSubscriptionId: stripeSub.id,
        stripePriceId: priceId,
        currentPeriodStart: new Date((stripeSub.current_period_start ?? 0) * 1000),
        currentPeriodEnd: new Date((stripeSub.current_period_end ?? 0) * 1000),
        cancelAtPeriodEnd: stripeSub.cancel_at_period_end,
      },
    })

    logger.info({ organizationId, plan, status: stripeSub.status }, 'Subscription synced')
  }

  private async handlePaymentFailed(stripeInvoice: Stripe.Invoice) {
    const organizationId = stripeInvoice.subscription_details?.metadata?.['organizationId']
    if (!organizationId) return

    await prisma.notification.create({
      data: {
        organizationId,
        title: 'Payment Failed',
        message: `Your subscription payment of $${((stripeInvoice.amount_due ?? 0) / 100).toFixed(2)} failed. Please update your payment method.`,
        type: 'WARNING',
        channel: 'IN_APP',
      },
    })
  }

  get stripeClient() {
    return this.stripe
  }
}
