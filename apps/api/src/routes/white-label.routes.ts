import { Router } from 'express'
import { z } from 'zod'
import { nanoid } from 'nanoid'
import { whiteLabelService } from '../services/white-label.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'

export const whiteLabelRouter = Router()
whiteLabelRouter.use(authenticate)

whiteLabelRouter.get('/config', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await whiteLabelService.getConfig(orgId)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label get config error')
    res.status(500).json({ success: false, error: 'Failed to get config' })
  }
})

whiteLabelRouter.post('/config', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await whiteLabelService.saveConfig(orgId, req.body)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label save config error')
    res.status(500).json({ success: false, error: 'Failed to save config' })
  }
})

whiteLabelRouter.post('/verify-domain', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { domain } = req.body as { domain: string }
    if (!domain) return res.status(400).json({ success: false, error: 'domain required' })
    const data = await whiteLabelService.verifyDomain(orgId, domain)
    res.json({ success: true, data })
  } catch (err) {
    logger.error(err, 'white label verify domain error')
    res.status(500).json({ success: false, error: 'Failed to verify domain' })
  }
})

// ── Sub-account management ──────────────────────────────────────────────────

// GET /white-label/accounts — list sub-accounts created by this reseller
whiteLabelRouter.get('/accounts', async (req, res) => {
  try {
    const parentOrgId = (req as any).user.organizationId as string
    const rows = await prisma.organization.findMany({
      where: { parentOrganizationId: parentOrgId },
      include: {
        subscription: { select: { plan: true, status: true, trialEndsAt: true } },
        _count: { select: { members: true } },
        settings: false,
      },
      orderBy: { createdAt: 'desc' },
    })

    const planPrices: Record<string, number> = { STARTER: 49, PRO: 97, BUSINESS: 197, ENTERPRISE: 297 }

    const accounts = rows.map(org => ({
      id: org.id,
      name: org.name,
      slug: org.slug,
      plan: org.subscription?.plan ?? 'FREE_TRIAL',
      industry: (org as any).industry ?? null,
      status: org.subscription?.status ?? 'ACTIVE',
      memberCount: org._count.members,
      mrr: planPrices[(org.subscription?.plan ?? '')] ?? 0,
      createdAt: org.createdAt,
      customDomain: (org.settings as any)?.whiteLabel?.customDomain ?? null,
    }))

    res.json({ success: true, accounts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, error: 'Failed to list accounts' })
  }
})

// POST /white-label/accounts — create a new sub-account
whiteLabelRouter.post('/accounts', async (req, res) => {
  try {
    const parentOrgId = (req as any).user.organizationId as string

    const { name, plan = 'STARTER', industry } = z.object({
      name: z.string().min(1).max(120),
      plan: z.string().optional(),
      industry: z.string().optional(),
    }).parse(req.body)

    const slug = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')}-${nanoid(5)}`

    const org = await prisma.organization.create({
      data: {
        name,
        slug,
        industry: (industry as never) ?? undefined,
        parentOrganizationId: parentOrgId,
        onboardingDone: true,
        subscription: {
          create: {
            plan: (plan.toUpperCase() as never),
            status: 'ACTIVE',
          },
        },
      },
      include: {
        subscription: { select: { plan: true, status: true } },
        _count: { select: { members: true } },
      },
    })

    const planPrices: Record<string, number> = { STARTER: 49, PRO: 97, BUSINESS: 197, ENTERPRISE: 297 }

    res.status(201).json({
      success: true,
      account: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        plan: org.subscription?.plan ?? plan,
        industry: (org as any).industry ?? null,
        status: org.subscription?.status ?? 'ACTIVE',
        memberCount: 0,
        mrr: planPrices[plan.toUpperCase()] ?? 0,
        createdAt: org.createdAt,
      },
    })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ success: false, error: err.message ?? 'Failed to create account' })
  }
})

// DELETE /white-label/accounts/:id — remove sub-account (suspend only)
whiteLabelRouter.delete('/accounts/:id', async (req, res) => {
  try {
    const parentOrgId = (req as any).user.organizationId as string
    const org = await prisma.organization.findFirst({
      where: { id: req.params.id, parentOrganizationId: parentOrgId },
    })
    if (!org) return res.status(404).json({ success: false, error: 'Not found' })

    await prisma.organization.update({ where: { id: req.params.id }, data: { isActive: false } })
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ success: false, error: 'Failed to remove account' })
  }
})
