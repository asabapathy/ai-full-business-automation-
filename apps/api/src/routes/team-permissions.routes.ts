import { Router } from 'express'
import { z } from 'zod'
import { teamPermissionsService } from '../services/team-permissions.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

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
