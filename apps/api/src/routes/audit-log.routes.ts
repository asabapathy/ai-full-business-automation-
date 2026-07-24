import { Router } from 'express'
import { auditLogService } from '../services/audit-log.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const auditLogRouter = Router()
auditLogRouter.use(authenticate)

auditLogRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await auditLogService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

auditLogRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { entity, action, userId, from, to, page, limit } = req.query as Record<string, string>
    const result = await auditLogService.getLogs(orgId, {
      entity,
      action,
      userId,
      from: from ? new Date(from) : undefined,
      to: to ? new Date(to) : undefined,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch logs' })
  }
})

auditLogRouter.get('/entity/:entity/:entityId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const logs = await auditLogService.getEntityHistory(orgId, req.params.entity, req.params.entityId)
    res.json({ logs })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch history' })
  }
})

auditLogRouter.get('/recent', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { limit } = req.query as Record<string, string>
    const logs = await auditLogService.getRecentActivity(orgId, limit ? parseInt(limit) : 20)
    res.json({ logs })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch recent activity' })
  }
})
