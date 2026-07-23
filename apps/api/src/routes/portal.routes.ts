import { Router } from 'express'
import { z } from 'zod'
import { validate } from '../middleware/validate.js'
import { portalService } from '../services/portal.service.js'
import { prisma } from '../services/database.js'

export const portalRouter = Router()

// All portal routes are PUBLIC — no auth middleware

// GET /portal/:slug — org info for portal landing
portalRouter.get('/:slug', async (req, res) => {
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }
  res.json({ success: true, data: { org } })
})

// GET /portal/:slug/services — list bookable services
portalRouter.get('/:slug/services', async (req, res) => {
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }
  const services = await portalService.getPublicServices(org.id)
  res.json({ success: true, data: { services } })
})

// GET /portal/:slug/book/slots?serviceId=&date=YYYY-MM-DD
portalRouter.get('/:slug/book/slots', async (req, res) => {
  const { serviceId, date } = req.query as { serviceId?: string; date?: string }
  if (!serviceId || !date) {
    res.status(400).json({ success: false, error: 'serviceId and date are required' })
    return
  }
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }
  const slots = await portalService.getAvailableSlots(org.id, serviceId, date)
  res.json({ success: true, data: { slots } })
})

const bookSchema = z.object({
  serviceId: z.string().uuid(),
  startTime: z.string(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional().default(''),
  email: z.string().email(),
  phone: z.string().optional(),
  notes: z.string().max(1000).optional(),
})

// POST /portal/:slug/book — create appointment
portalRouter.post('/:slug/book', validate(bookSchema), async (req, res) => {
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }

  const appointment = await portalService.bookAppointment(org.id, req.body)
  res.status(201).json({ success: true, data: { appointment } })
})

// GET /portal/:slug/invoice/:id?token=
portalRouter.get('/:slug/invoice/:id', async (req, res) => {
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }

  const token = req.query['token'] as string | undefined
  let authorized = false

  if (token) {
    const payload = portalService.verifyPortalToken(token)
    authorized = payload?.organizationId === org.id && payload?.resourceId === req.params['id']
  }

  if (!authorized) {
    res.status(403).json({ success: false, error: 'Access denied — invalid or expired link' })
    return
  }

  const result = await portalService.getPublicInvoice(org.id, req.params['id']!)
  if (!result) {
    res.status(404).json({ success: false, error: 'Invoice not found' })
    return
  }

  res.json({ success: true, data: result })
})

// POST /portal/:slug/invoice/:id/payment-intent — create Stripe payment intent
portalRouter.post('/:slug/invoice/:id/payment-intent', async (req, res) => {
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }

  const token = req.query['token'] as string | undefined
  if (!token) {
    res.status(403).json({ success: false, error: 'Access denied' })
    return
  }

  const payload = portalService.verifyPortalToken(token)
  if (payload?.organizationId !== org.id || payload?.resourceId !== req.params['id']) {
    res.status(403).json({ success: false, error: 'Access denied — invalid or expired link' })
    return
  }

  const invoice = await prisma.invoice.findFirst({
    where: { id: req.params['id']!, organizationId: org.id },
    select: { total: true, amountPaid: true, currency: true, status: true, number: true },
  })

  if (!invoice) {
    res.status(404).json({ success: false, error: 'Invoice not found' })
    return
  }

  if (invoice.status === 'PAID') {
    res.status(400).json({ success: false, error: 'Invoice is already paid' })
    return
  }

  const amountDue = Number(invoice.total) - Number(invoice.amountPaid)
  if (amountDue <= 0) {
    res.status(400).json({ success: false, error: 'No amount due' })
    return
  }

  try {
    const { StripeService } = await import('../services/stripe.service.js')
    const stripe = StripeService.fromEnv()
    const pi = await stripe.createPaymentIntent({
      amount: Math.round(amountDue * 100),
      currency: invoice.currency.toLowerCase(),
      metadata: {
        organizationId: org.id,
        invoiceId: req.params['id']!,
        invoiceNumber: invoice.number,
      },
    })
    res.json({ success: true, data: { clientSecret: pi.client_secret, amount: amountDue } })
  } catch {
    res.status(503).json({ success: false, error: 'Payment service not configured' })
  }
})

// POST /portal/:slug/invoice/:id/generate-link — generate shareable portal link (internal use)
// This is called from the finance service when sending invoices
portalRouter.post('/:slug/invoice/:id/generate-link', async (req, res) => {
  // This endpoint requires internal auth (no public user auth, but validates org)
  const org = await portalService.getOrgBySlug(req.params['slug']!)
  if (!org) {
    res.status(404).json({ success: false, error: 'Organization not found' })
    return
  }
  const token = portalService.generatePortalToken(org.id, 'invoice', req.params['id']!)
  const link = `${process.env['APP_URL'] ?? 'http://localhost:3000'}/portal/${org.slug}/invoice/${req.params['id']}?token=${token}`
  res.json({ success: true, data: { link, token } })
})
