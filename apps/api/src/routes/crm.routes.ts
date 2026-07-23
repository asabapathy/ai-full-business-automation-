import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../services/database.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError } from '../utils/errors.js'

export const crmRouter = Router()
crmRouter.use(authenticate)
crmRouter.use(requireOrganization)

// ─── CONTACTS ────────────────────────────────────────────────
const contactSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().max(100).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  type: z.enum(['LEAD', 'PROSPECT', 'CUSTOMER', 'PARTNER', 'VENDOR', 'EMPLOYEE', 'OTHER']).optional(),
  companyId: z.string().uuid().optional(),
  source: z.string().optional(),
  tags: z.array(z.string()).optional(),
  customFields: z.record(z.unknown()).optional(),
  notes: z.string().optional(),
})

crmRouter.get('/contacts', async (req, res) => {
  const { page = '1', limit = '20', type, status, q, tag } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    organizationId: req.organizationId!,
    isActive: true,
    ...(type ? { type: type as never } : {}),
    ...(status ? { status: status as never } : {}),
    ...(q ? {
      OR: [
        { firstName: { contains: q, mode: 'insensitive' as const } },
        { lastName: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
        { phone: { contains: q } },
      ],
    } : {}),
    ...(tag ? { tags: { has: tag } } : {}),
  }

  const [contacts, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      include: { company: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.contact.count({ where }),
  ])

  res.json({ success: true, data: { contacts, total, page: parseInt(page), limit: parseInt(limit) } })
})

crmRouter.post('/contacts', validate(contactSchema), async (req, res) => {
  const contact = await prisma.contact.create({
    data: { ...req.body, organizationId: req.organizationId!, ownerId: req.user!.id },
    include: { company: { select: { id: true, name: true } } },
  })
  res.status(201).json({ success: true, data: { contact } })
})

crmRouter.get('/contacts/:id', async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.params['id'], organizationId: req.organizationId! },
    include: {
      company: true,
      deals: { orderBy: { createdAt: 'desc' }, take: 5 },
      activities: { orderBy: { createdAt: 'desc' }, take: 10 },
      appointments: { orderBy: { startTime: 'desc' }, take: 5 },
      invoices: { orderBy: { createdAt: 'desc' }, take: 5 },
    },
  })
  if (!contact) throw new NotFoundError('Contact')
  res.json({ success: true, data: { contact } })
})

crmRouter.patch('/contacts/:id', async (req, res) => {
  const contact = await prisma.contact.findFirst({
    where: { id: req.params['id'], organizationId: req.organizationId! },
  })
  if (!contact) throw new NotFoundError('Contact')

  const updated = await prisma.contact.update({
    where: { id: req.params['id'] },
    data: req.body as Record<string, unknown>,
  })
  res.json({ success: true, data: { contact: updated } })
})

crmRouter.delete('/contacts/:id', async (req, res) => {
  await prisma.contact.update({
    where: { id: req.params['id'] },
    data: { isActive: false },
  })
  res.json({ success: true, message: 'Contact archived' })
})

// ─── DEALS ────────────────────────────────────────────────────
const dealSchema = z.object({
  title: z.string().min(1).max(200),
  contactId: z.string().uuid().optional(),
  companyId: z.string().uuid().optional(),
  value: z.number().min(0).optional(),
  stage: z.enum(['PROSPECTING', 'QUALIFICATION', 'NEEDS_ANALYSIS', 'VALUE_PROPOSITION', 'DECISION_MAKERS', 'PERCEPTION_ANALYSIS', 'PROPOSAL', 'NEGOTIATION', 'CLOSED_WON', 'CLOSED_LOST']).optional(),
  probability: z.number().min(0).max(100).optional(),
  expectedCloseDate: z.string().optional(),
  notes: z.string().optional(),
})

crmRouter.get('/deals', async (req, res) => {
  const { page = '1', limit = '20', stage } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    organizationId: req.organizationId!,
    ...(stage ? { stage: stage as never } : {}),
  }

  const [deals, total] = await Promise.all([
    prisma.deal.findMany({
      where,
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        company: { select: { id: true, name: true } },
        owner: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.deal.count({ where }),
  ])

  res.json({ success: true, data: { deals, total } })
})

crmRouter.post('/deals', validate(dealSchema), async (req, res) => {
  const deal = await prisma.deal.create({
    data: { ...req.body, organizationId: req.organizationId!, ownerId: req.user!.id },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true } },
      company: { select: { id: true, name: true } },
    },
  })
  res.status(201).json({ success: true, data: { deal } })
})

crmRouter.patch('/deals/:id', async (req, res) => {
  const deal = await prisma.deal.update({
    where: { id: req.params['id'] },
    data: req.body as Record<string, unknown>,
  })
  res.json({ success: true, data: { deal } })
})

// ─── COMPANIES ───────────────────────────────────────────────
crmRouter.get('/companies', async (req, res) => {
  const { q, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const where = {
    organizationId: req.organizationId!,
    isActive: true,
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
  }

  const [companies, total] = await Promise.all([
    prisma.company.findMany({
      where,
      include: { _count: { select: { contacts: true, deals: true } } },
      orderBy: { name: 'asc' },
      skip,
      take: parseInt(limit),
    }),
    prisma.company.count({ where }),
  ])

  res.json({ success: true, data: { companies, total } })
})

crmRouter.post('/companies', async (req, res) => {
  const company = await prisma.company.create({
    data: { ...req.body as Record<string, unknown>, organizationId: req.organizationId! },
  })
  res.status(201).json({ success: true, data: { company } })
})

// ─── ACTIVITIES ──────────────────────────────────────────────
crmRouter.post('/activities', async (req, res) => {
  const activity = await prisma.activity.create({
    data: { ...req.body as Record<string, unknown>, organizationId: req.organizationId!, userId: req.user!.id },
  })
  res.status(201).json({ success: true, data: { activity } })
})

crmRouter.get('/activities', async (req, res) => {
  const { contactId, dealId, page = '1', limit = '20' } = req.query as Record<string, string>
  const activities = await prisma.activity.findMany({
    where: {
      organizationId: req.organizationId!,
      ...(contactId ? { contactId } : {}),
      ...(dealId ? { dealId } : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip: (parseInt(page) - 1) * parseInt(limit),
    take: parseInt(limit),
  })
  res.json({ success: true, data: { activities } })
})
