import { Router } from 'express'
import { z } from 'zod'
import jwt from 'jsonwebtoken'
import { prisma } from '../services/database.js'
import { authenticate } from '../middleware/auth.js'
import { requireSuperAdmin } from '../middleware/super-admin.js'
import { validate } from '../middleware/validate.js'
import { NotFoundError } from '../utils/errors.js'
import { config } from '../config/index.js'

export const adminRouter = Router()
adminRouter.use(authenticate)
adminRouter.use(requireSuperAdmin)

// ── Platform overview stats ──────────────────────────────────────────────────

adminRouter.get('/stats', async (_req, res) => {
  const [totalOrgs, subscriptions, recentOrgs] = await Promise.all([
    prisma.organization.count({ where: { isActive: true } }),
    prisma.subscription.findMany({
      select: { plan: true, status: true, currentPeriodEnd: true, trialEndsAt: true },
    }),
    prisma.organization.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        name: true,
        industry: true,
        createdAt: true,
        subscription: { select: { plan: true } },
        _count: { select: { members: true } },
      },
    }),
  ])

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const activeTrials = subscriptions.filter(s => s.status === 'TRIALING' && s.trialEndsAt && s.trialEndsAt > now).length
  const activeSubscriptions = subscriptions.filter(s => s.status === 'ACTIVE').length
  const newSignupsThisMonth = await prisma.organization.count({
    where: { isActive: true, createdAt: { gte: monthStart } },
  })

  const planPrices: Record<string, number> = { STARTER: 49, PRO: 97, BUSINESS: 197, ENTERPRISE: 297 }
  const totalMRR = subscriptions
    .filter(s => s.status === 'ACTIVE')
    .reduce((acc, s) => acc + (planPrices[s.plan] ?? 0), 0)

  const planBreakdown: Record<string, number> = {}
  const industryBreakdown: Record<string, number> = {}

  for (const s of subscriptions) {
    planBreakdown[s.plan] = (planBreakdown[s.plan] ?? 0) + 1
  }

  const allOrgs = await prisma.organization.findMany({
    where: { isActive: true },
    select: { industry: true },
  })
  for (const o of allOrgs) {
    const key = o.industry ?? 'OTHER'
    industryBreakdown[key] = (industryBreakdown[key] ?? 0) + 1
  }

  res.json({
    success: true,
    data: {
      totalOrgs,
      activeTrials,
      totalMRR,
      activeSubscriptions,
      newSignupsThisMonth,
      planBreakdown,
      industryBreakdown,
      recentOrgs: recentOrgs.map(o => ({
        id: o.id,
        name: o.name,
        industry: o.industry,
        plan: o.subscription?.plan ?? 'FREE',
        createdAt: o.createdAt,
        memberCount: o._count.members,
      })),
    },
  })
})

// ── List all organizations ───────────────────────────────────────────────────

adminRouter.get('/organizations', async (req, res) => {
  const { search, plan, status } = req.query as Record<string, string>

  const orgs = await prisma.organization.findMany({
    where: {
      isActive: true,
      ...(search ? { name: { contains: search, mode: 'insensitive' } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      subscription: { select: { plan: true, status: true, trialEndsAt: true } },
      _count: { select: { members: true } },
    },
  })

  const planPrices: Record<string, number> = { STARTER: 49, PRO: 97, BUSINESS: 197, ENTERPRISE: 297 }

  let rows = orgs.map(o => ({
    id: o.id,
    name: o.name,
    slug: o.slug,
    industry: o.industry,
    plan: o.subscription?.plan ?? 'FREE',
    status: o.subscription?.status ?? 'TRIALING',
    trialEndsAt: o.subscription?.trialEndsAt ?? null,
    mrr: o.subscription?.status === 'ACTIVE' ? (planPrices[o.subscription.plan] ?? 0) : 0,
    memberCount: o._count.members,
    createdAt: o.createdAt,
    lastActiveAt: o.updatedAt,
  }))

  if (plan && plan !== 'all') {
    rows = rows.filter(r => r.plan === plan.toUpperCase())
  }
  if (status && status !== 'all') {
    rows = rows.filter(r => r.status === status.toUpperCase())
  }

  res.json({ success: true, data: { organizations: rows } })
})

// ── Organization detail ──────────────────────────────────────────────────────

adminRouter.get('/organizations/:id', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      subscription: true,
      featureFlags: true,
      members: {
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true, avatarUrl: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
      _count: {
        select: { contacts: true, appointments: true, invoices: true },
      },
    },
  })

  if (!org) throw new NotFoundError('Organization')

  res.json({ success: true, data: { organization: org } })
})

// ── Change plan ──────────────────────────────────────────────────────────────

const changePlanSchema = z.object({
  plan: z.enum(['FREE', 'STARTER', 'PRO', 'ENTERPRISE', 'CUSTOM']),
})

adminRouter.patch('/organizations/:id/plan', validate(changePlanSchema), async (req, res) => {
  const { plan } = req.body as { plan: string }

  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) throw new NotFoundError('Organization')

  const subscription = await prisma.subscription.upsert({
    where: { organizationId: req.params.id },
    update: { plan: plan as any, status: 'ACTIVE' },
    create: {
      organizationId: req.params.id,
      plan: plan as any,
      status: 'ACTIVE',
    },
  })

  res.json({ success: true, data: { subscription }, message: `Plan updated to ${plan}` })
})

// ── Suspend / Reactivate ─────────────────────────────────────────────────────

adminRouter.post('/organizations/:id/suspend', async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) throw new NotFoundError('Organization')

  await prisma.organization.update({
    where: { id: req.params.id },
    data: { isActive: false },
  })

  res.json({ success: true, message: 'Organization suspended' })
})

adminRouter.post('/organizations/:id/reactivate', async (req, res) => {
  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) throw new NotFoundError('Organization')

  await prisma.organization.update({
    where: { id: req.params.id },
    data: { isActive: true },
  })

  res.json({ success: true, message: 'Organization reactivated' })
})

// ── Impersonate ──────────────────────────────────────────────────────────────

adminRouter.post('/organizations/:id/impersonate', async (req, res) => {
  const org = await prisma.organization.findUnique({
    where: { id: req.params.id },
    include: {
      members: {
        where: { role: 'ADMIN' },
        include: { user: true },
        take: 1,
      },
    },
  })

  if (!org) throw new NotFoundError('Organization')

  const adminMember = org.members[0]
  if (!adminMember) throw new NotFoundError('Admin member for this organization')

  const { user } = adminMember
  const payload = { sub: user.id, email: user.email, organizationId: org.id, role: adminMember.role, type: 'access' }
  const refreshPayload = { ...payload, type: 'refresh' }
  const accessToken = jwt.sign(payload, config.JWT_SECRET, { expiresIn: config.JWT_EXPIRES_IN } as jwt.SignOptions)
  const refreshToken = jwt.sign(refreshPayload, config.JWT_REFRESH_SECRET, { expiresIn: config.JWT_REFRESH_EXPIRES_IN } as jwt.SignOptions)

  res.json({
    success: true,
    data: {
      tokens: { accessToken, refreshToken, expiresIn: 15 * 60 },
      organization: { id: org.id, name: org.name, slug: org.slug },
    },
  })
})

// ── Feature flag overrides ───────────────────────────────────────────────────

const featureFlagsSchema = z.object({
  flags: z.record(z.boolean()),
})

adminRouter.put('/organizations/:id/features', validate(featureFlagsSchema), async (req, res) => {
  const { flags } = req.body as { flags: Record<string, boolean> }

  const org = await prisma.organization.findUnique({ where: { id: req.params.id } })
  if (!org) throw new NotFoundError('Organization')

  await prisma.$transaction(
    Object.entries(flags).map(([flag, enabled]) =>
      prisma.organizationFeatureFlag.upsert({
        where: { organizationId_flag: { organizationId: req.params.id, flag } },
        update: { enabled },
        create: { organizationId: req.params.id, flag, enabled },
      })
    )
  )

  res.json({ success: true, message: 'Feature flags updated' })
})
