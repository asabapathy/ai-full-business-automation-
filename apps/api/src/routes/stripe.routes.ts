import { Router, type Request, type Response } from 'express'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { StripeService } from '../services/stripe.service.js'
import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'

export const stripeRouter = Router()

// Webhook endpoint — must use raw body
stripeRouter.post('/webhook', async (req: Request, res: Response) => {
  const signature = req.headers['stripe-signature'] as string
  if (!signature) {
    res.status(400).json({ error: 'Missing stripe-signature header' })
    return
  }

  let stripe: StripeService
  try {
    stripe = StripeService.fromEnv()
  } catch {
    res.status(503).json({ error: 'Stripe not configured' })
    return
  }

  let event
  try {
    event = stripe.constructWebhookEvent(req.body as Buffer, signature)
  } catch (err) {
    logger.warn({ err }, 'Invalid Stripe webhook signature')
    res.status(400).json({ error: 'Invalid signature' })
    return
  }

  try {
    await stripe.handleWebhookEvent(event)
    res.json({ received: true })
  } catch (err) {
    logger.error({ err, eventType: event.type }, 'Failed to handle webhook')
    res.status(500).json({ error: 'Webhook handler failed' })
  }
})

// All routes below require auth
stripeRouter.use(authenticate)
stripeRouter.use(requireOrganization)

// GET /stripe/subscription — current subscription
stripeRouter.get('/subscription', async (req, res) => {
  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: req.organizationId! },
  })
  res.json({ success: true, data: { subscription } })
})

// POST /stripe/checkout — create checkout session for plan upgrade
stripeRouter.post('/checkout', async (req, res) => {
  const { priceId } = req.body as { priceId: string }
  if (!priceId) {
    res.status(400).json({ success: false, error: 'priceId is required' })
    return
  }

  let stripe: StripeService
  try {
    stripe = StripeService.fromEnv()
  } catch {
    res.status(503).json({ success: false, error: 'Payment service not configured' })
    return
  }

  const org = await prisma.organization.findUnique({
    where: { id: req.organizationId! },
    select: { name: true, email: true, slug: true },
  })
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }

  const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000'

  const customerId = await stripe.createOrUpdateCustomer({
    organizationId: req.organizationId!,
    email: org.email ?? req.user!.email,
    name: org.name,
  })

  const session = await stripe.createCheckoutSession({
    organizationId: req.organizationId!,
    priceId,
    customerId,
    successUrl: `${appUrl}/dashboard/settings?tab=billing&success=true`,
    cancelUrl: `${appUrl}/dashboard/settings?tab=billing`,
  })

  res.json({ success: true, data: { url: session.url } })
})

// POST /stripe/portal — billing portal session
stripeRouter.post('/portal', async (req, res) => {
  let stripe: StripeService
  try {
    stripe = StripeService.fromEnv()
  } catch {
    res.status(503).json({ success: false, error: 'Payment service not configured' })
    return
  }

  const subscription = await prisma.subscription.findUnique({
    where: { organizationId: req.organizationId! },
    select: { stripeCustomerId: true },
  })

  if (!subscription?.stripeCustomerId) {
    res.status(400).json({ success: false, error: 'No billing account found. Please subscribe first.' })
    return
  }

  const appUrl = process.env['APP_URL'] ?? 'http://localhost:3000'
  const portalSession = await stripe.createBillingPortalSession(
    subscription.stripeCustomerId,
    `${appUrl}/dashboard/settings?tab=billing`,
  )

  res.json({ success: true, data: { url: portalSession.url } })
})

// GET /stripe/plans — available pricing plans
stripeRouter.get('/plans', (_req, res) => {
  res.json({
    success: true,
    data: {
      plans: [
        {
          id: 'FREE',
          name: 'Free',
          price: 0,
          interval: 'month',
          priceId: null,
          features: ['1 user', '100 AI calls/month', '5GB storage', 'Core CRM', 'Basic automations'],
          limits: { seats: 1, aiCallsPerMonth: 100, storageGb: 5 },
        },
        {
          id: 'STARTER',
          name: 'Starter',
          price: 49,
          interval: 'month',
          priceId: process.env['STRIPE_PRICE_STARTER'] ?? 'price_starter',
          features: ['5 users', '1,000 AI calls/month', '20GB storage', 'All modules', 'Automations', 'Reviews'],
          limits: { seats: 5, aiCallsPerMonth: 1000, storageGb: 20 },
        },
        {
          id: 'PRO',
          name: 'Pro',
          price: 149,
          interval: 'month',
          priceId: process.env['STRIPE_PRICE_PRO'] ?? 'price_pro',
          features: ['20 users', '10,000 AI calls/month', '100GB storage', 'Social media', 'Advanced analytics', 'Priority support'],
          limits: { seats: 20, aiCallsPerMonth: 10000, storageGb: 100 },
        },
        {
          id: 'ENTERPRISE',
          name: 'Enterprise',
          price: 499,
          interval: 'month',
          priceId: process.env['STRIPE_PRICE_ENTERPRISE'] ?? 'price_enterprise',
          features: ['Unlimited users', 'Unlimited AI calls', '1TB storage', 'Custom AI agents', 'SLA', 'Dedicated support'],
          limits: { seats: 999, aiCallsPerMonth: 999999, storageGb: 1000 },
        },
      ],
    },
  })
})

// POST /stripe/invoice/:id/payment-intent — pay a specific invoice
stripeRouter.post('/invoice/:id/payment-intent', async (req, res) => {
  let stripe: StripeService
  try {
    stripe = StripeService.fromEnv()
  } catch {
    res.status(503).json({ success: false, error: 'Payment service not configured' })
    return
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params['id']!, organizationId: req.organizationId! },
    include: { contact: { select: { email: true, firstName: true, lastName: true } } },
  })

  if (!invoice) {
    res.status(404).json({ success: false, error: 'Invoice not found' })
    return
  }

  if (invoice.status === 'PAID') {
    res.status(400).json({ success: false, error: 'Invoice already paid' })
    return
  }

  const amountDue = Number(invoice.total) - Number(invoice.amountPaid)

  const pi = await stripe.createPaymentIntent({
    amount: Math.round(amountDue * 100),
    currency: invoice.currency.toLowerCase(),
    metadata: {
      organizationId: req.organizationId!,
      invoiceId: invoice.id,
      invoiceNumber: invoice.number,
    },
  })

  res.json({ success: true, data: { clientSecret: pi.client_secret, amount: amountDue } })
})
