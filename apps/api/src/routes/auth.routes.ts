import { Router } from 'express'
import { z } from 'zod'
import { authService } from '../services/auth.service.js'
import { validate } from '../middleware/validate.js'
import { authenticate } from '../middleware/auth.js'
import { prisma } from '../services/database.js'

export const authRouter = Router()

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  firstName: z.string().min(1).max(50),
  lastName: z.string().min(1).max(50),
  organizationName: z.string().min(2).max(100),
  industry: z.string().optional(),
  phone: z.string().optional(),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  organizationSlug: z.string().optional(),
})

const refreshSchema = z.object({
  refreshToken: z.string(),
})

authRouter.post('/register', validate(registerSchema), async (req, res) => {
  const result = await authService.register(req.body)
  res.status(201).json({
    success: true,
    data: result,
    message: 'Account created successfully',
  })
})

authRouter.post('/login', validate(loginSchema), async (req, res) => {
  const result = await authService.login(req.body)
  res.json({ success: true, data: result })
})

authRouter.post('/refresh', validate(refreshSchema), async (req, res) => {
  const tokens = await authService.refreshTokens(req.body.refreshToken)
  res.json({ success: true, data: { tokens } })
})

authRouter.post('/logout', authenticate, async (req, res) => {
  const { refreshToken } = req.body as { refreshToken?: string }
  if (refreshToken && req.user) {
    await authService.logout(req.user.id, refreshToken)
  }
  res.json({ success: true, message: 'Logged out successfully' })
})

authRouter.patch('/me', authenticate, async (req, res) => {
  const { firstName, lastName, phone } = req.body as {
    firstName?: string
    lastName?: string
    phone?: string
  }
  const user = await prisma.user.update({
    where: { id: req.user!.id },
    data: {
      ...(firstName ? { firstName } : {}),
      ...(lastName !== undefined ? { lastName } : {}),
      ...(phone !== undefined ? { phone } : {}),
    },
    select: { id: true, email: true, firstName: true, lastName: true, phone: true, avatarUrl: true },
  })
  res.json({ success: true, data: { user } })
})

authRouter.get('/me', authenticate, async (req, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.id },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      phone: true,
      isSuperAdmin: true,
      createdAt: true,
      memberships: {
        where: { isActive: true },
        include: {
          organization: {
            select: { id: true, name: true, slug: true, industry: true, logoUrl: true },
          },
        },
      },
    },
  })

  res.json({ success: true, data: { user } })
})

authRouter.post('/switch-org', authenticate, async (req, res) => {
  const { organizationId } = req.body as { organizationId: string }
  const membership = await prisma.organizationMember.findFirst({
    where: { userId: req.user!.id, organizationId, isActive: true },
    include: { organization: { select: { id: true, name: true, slug: true } } },
  })

  if (!membership) {
    res.status(403).json({ success: false, error: 'Not a member of this organization' })
    return
  }

  const tokens = await authService.refreshTokens(req.body.refreshToken ?? '')
  res.json({ success: true, data: { tokens, organization: membership.organization } })
})
