import { Router } from 'express'
import { z } from 'zod'
import { teamInboxService } from '../services/team-inbox.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const teamInboxRouter = Router()
teamInboxRouter.use(authenticate)

teamInboxRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await teamInboxService.getStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

teamInboxRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, assignedToId, page, limit } = req.query as Record<string, string>
    const result = await teamInboxService.getThreads(orgId, {
      status,
      assignedToId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch threads' })
  }
})

teamInboxRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const thread = await teamInboxService.getThread(orgId, req.params.id)
    if (!thread) return res.status(404).json({ error: 'Not found' })
    res.json({ thread })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch thread' })
  }
})

teamInboxRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      subject: z.string(),
      fromAddress: z.string().email(),
      toAddress: z.string().email(),
      body: z.string(),
      contactId: z.string().uuid().optional(),
    }).parse(req.body)
    const thread = await teamInboxService.createThread(orgId, data)
    res.status(201).json({ thread })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create thread' })
  }
})

teamInboxRouter.post('/:id/reply', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { body, fromAddress } = z.object({ body: z.string(), fromAddress: z.string().email() }).parse(req.body)
    const message = await teamInboxService.replyToThread(orgId, req.params.id, body, fromAddress)
    res.json({ message })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to reply' })
  }
})

teamInboxRouter.post('/:id/assign', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { assignedToId } = z.object({ assignedToId: z.string().uuid().nullable() }).parse(req.body)
    await teamInboxService.assignThread(orgId, req.params.id, assignedToId)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to assign thread' })
  }
})

teamInboxRouter.patch('/:id/status', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = z.object({ status: z.string() }).parse(req.body)
    await teamInboxService.updateThreadStatus(orgId, req.params.id, status)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update status' })
  }
})

teamInboxRouter.post('/:id/read', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await teamInboxService.markRead(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to mark read' })
  }
})

teamInboxRouter.get('/:id/suggest-reply', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const suggestion = await teamInboxService.suggestReply(orgId, req.params.id)
    res.json({ suggestion })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate suggestion' })
  }
})
