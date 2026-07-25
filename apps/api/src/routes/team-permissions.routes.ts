import { Router } from 'express'
import { z } from 'zod'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { teamPermissionsService } from '../services/team-permissions.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'
import { prisma } from '../services/database.js'
import { sendEmail, buildTeamInviteEmail } from '../services/email.service.js'
import { config } from '../config/index.js'

export const teamPermissionsRouter = Router()
teamPermissionsRouter.use(authenticate)

teamPermissionsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await teamPermissionsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

teamPermissionsRouter.get('/role-defaults', async (_req, res) => {
  try {
    res.json(await teamPermissionsService.getRoleDefaults())
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

teamPermissionsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const members = await teamPermissionsService.getMembers(orgId)
    res.json({ members })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

teamPermissionsRouter.get('/:userId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const member = await teamPermissionsService.getMember(orgId, req.params.userId)
    if (!member) return res.status(404).json({ error: 'Not found' })
    res.json({ member })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

teamPermissionsRouter.put('/:userId/role', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { role, customPermissions } = z.object({
      role: z.enum(['viewer', 'staff', 'manager', 'admin', 'owner']),
      customPermissions: z.array(z.string()).optional(),
    }).parse(req.body)
    const member = await teamPermissionsService.updateRole(orgId, req.params.userId, role, customPermissions)
    res.json({ member })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

teamPermissionsRouter.put('/:userId/permissions', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { permissions } = z.object({ permissions: z.array(z.string()) }).parse(req.body)
    const member = await teamPermissionsService.updatePermissions(orgId, req.params.userId, permissions)
    res.json({ member })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

teamPermissionsRouter.delete('/:userId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await teamPermissionsService.removeMember(orgId, req.params.userId)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

// POST /team-permissions/invite — invite a user to the organization by email
teamPermissionsRouter.post('/invite', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const inviterId: string = (req as any).user.id
    const { email, role = 'MEMBER' } = z.object({
      email: z.string().email(),
      role: z.string().optional(),
    }).parse(req.body)

    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
    const inviter = await prisma.user.findUnique({ where: { id: inviterId }, select: { firstName: true, lastName: true } })
    if (!org || !inviter) { res.status(404).json({ error: 'Not found' }); return }

    let user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } })

    const inviteToken = nanoid(32)
    const appUrl = config.APP_URL ?? 'http://localhost:3000'

    if (!user) {
      // Create a placeholder user with a temporary password
      const tempPassword = nanoid(16)
      const passwordHash = await bcrypt.hash(tempPassword, 12)
      user = await prisma.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName: email.split('@')[0] ?? 'New',
          lastName: 'User',
        },
      })
    }

    // Check if already a member
    const existing = await prisma.organizationMember.findFirst({ where: { organizationId: orgId, userId: user.id } })
    if (!existing) {
      await prisma.organizationMember.create({
        data: {
          organizationId: orgId,
          userId: user.id,
          role: (role.toUpperCase() as never) ?? 'MEMBER',
          invitedBy: inviterId,
          invitedAt: new Date(),
          isActive: false, // activate on first login
        },
      })
    }

    const inviteUrl = `${appUrl}/sign-in?invite=${inviteToken}&email=${encodeURIComponent(email)}&org=${orgId}`
    const emailContent = buildTeamInviteEmail({
      inviterName: `${inviter.firstName} ${inviter.lastName}`,
      orgName: org.name,
      inviteUrl,
    })

    await sendEmail({ to: email, ...emailContent })
    res.json({ success: true, message: `Invitation sent to ${email}` })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Failed to send invitation' })
  }
})
