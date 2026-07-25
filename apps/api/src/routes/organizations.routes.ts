import { Router } from 'express'
import { z } from 'zod'
import { prisma } from '../services/database.js'
import { authenticate, requireOrganization, requireRole } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError } from '../utils/errors.js'

export const orgRouter = Router()
orgRouter.use(authenticate)
orgRouter.use(requireOrganization)

const updateOrgSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  website: z.string().url().optional(),
  industry: z.string().optional(),
  timezone: z.string().optional(),
  locale: z.string().optional(),
  currency: z.string().optional(),
  address: z.record(z.unknown()).optional(),
  businessHours: z.record(z.unknown()).optional(),
  aiPersonality: z.record(z.unknown()).optional(),
  settings: z.record(z.unknown()).optional(),
})

orgRouter.get('/', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.organizationId! },
    include: {
      subscription: true,
      _count: {
        select: {
          members: true,
          contacts: true,
          deals: true,
          campaigns: true,
        },
      },
    },
  })
  if (!org) throw new NotFoundError('Organization')
  res.json({ success: true, data: { organization: org } })
})

orgRouter.patch('/', requireRole('ADMIN', 'SUPER_ADMIN'), validate(updateOrgSchema), async (req, res) => {
  const org = await prisma.organization.update({
    where: { id: req.organizationId! },
    data: req.body as Record<string, unknown>,
  })
  res.json({ success: true, data: { organization: org } })
})

orgRouter.get('/members', async (req, res) => {
  const members = await prisma.organizationMember.findMany({
    where: { organizationId: req.organizationId!, isActive: true },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true, lastLoginAt: true } },
    },
    orderBy: { joinedAt: 'asc' },
  })
  res.json({ success: true, data: { members } })
})

orgRouter.patch('/members/:userId/role', requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  const { role } = req.body as { role: string }
  await prisma.organizationMember.updateMany({
    where: { organizationId: req.organizationId!, userId: req.params['userId'] },
    data: { role: role as never },
  })
  res.json({ success: true, message: 'Role updated' })
})

orgRouter.delete('/members/:userId', requireRole('ADMIN', 'SUPER_ADMIN'), async (req, res) => {
  await prisma.organizationMember.updateMany({
    where: { organizationId: req.organizationId!, userId: req.params['userId'] },
    data: { isActive: false },
  })
  res.json({ success: true, message: 'Member removed' })
})

// PATCH /org/onboarding — mark onboarding done and save industry
orgRouter.patch('/onboarding', async (req, res) => {
  const { industry, onboardingStep, onboardingDone } = req.body as {
    industry?: string
    onboardingStep?: number
    onboardingDone?: boolean
  }
  const org = await prisma.organization.update({
    where: { id: req.organizationId! },
    data: {
      ...(industry ? { industry: industry as any } : {}),
      ...(onboardingStep !== undefined ? { onboardingStep } : {}),
      ...(onboardingDone !== undefined ? { onboardingDone } : {}),
    },
  })
  res.json({ success: true, data: { organization: org } })
})

// Dashboard analytics
orgRouter.get('/analytics/overview', async (req, res) => {
  const orgId = req.organizationId!
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [contacts, newContacts, deals, revenue, tasks, upcomingAppointments] = await Promise.all([
    prisma.contact.count({ where: { organizationId: orgId, isActive: true } }),
    prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
    prisma.deal.groupBy({
      by: ['stage'],
      where: { organizationId: orgId },
      _count: true,
      _sum: { value: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
    }),
    prisma.aITask.count({ where: { organizationId: orgId, status: { notIn: ['COMPLETED', 'CANCELED'] } } }),
    prisma.appointment.count({
      where: { organizationId: orgId, startTime: { gte: new Date() }, status: { in: ['SCHEDULED', 'CONFIRMED'] } },
    }),
  ])

  const pipelineValue = deals.reduce((sum, d) => sum + Number(d._sum.value ?? 0), 0)
  const wonDeals = deals.find(d => d.stage === 'CLOSED_WON')

  res.json({
    success: true,
    data: {
      contacts: { total: contacts, new30Days: newContacts },
      pipeline: { value: pipelineValue, byStage: deals },
      revenue: { last30Days: Number(revenue._sum.total ?? 0) },
      deals: { won30Days: wonDeals?._count ?? 0 },
      activeTasks: tasks,
      upcomingAppointments,
    },
  })
})
