import { Router } from 'express'
import { z } from 'zod'
import { chatWidgetService } from '../services/chat-widget.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const chatWidgetRouter = Router()

// Public: widget config + chat
chatWidgetRouter.get('/public/:orgId', async (req, res) => {
  try {
    const widget = await chatWidgetService.getWidgetPublic(req.params.orgId)
    if (!widget) return res.status(404).json({ error: 'Widget not found' })
    res.json({ widget })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch widget' })
  }
})

chatWidgetRouter.post('/public/:orgId/chat', async (req, res) => {
  try {
    const { visitorId, message } = z.object({ visitorId: z.string(), message: z.string() }).parse(req.body)
    const result = await chatWidgetService.chat(req.params.orgId, visitorId, message)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Chat failed' })
  }
})

chatWidgetRouter.use(authenticate)

chatWidgetRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const widget = await chatWidgetService.getWidget(orgId)
    res.json({ widget })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch widget' })
  }
})

chatWidgetRouter.put('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      greeting: z.string().optional(),
      primaryColor: z.string().optional(),
      position: z.string().optional(),
      useKnowledgeBase: z.boolean().optional(),
      isActive: z.boolean().optional(),
      allowedDomains: z.array(z.string()).optional(),
    }).parse(req.body)
    const widget = await chatWidgetService.upsertWidget(orgId, data)
    res.json({ widget })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update widget' })
  }
})

chatWidgetRouter.get('/sessions', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { page, limit } = req.query as Record<string, string>
    const result = await chatWidgetService.getSessions(orgId, page ? parseInt(page) : 1, limit ? parseInt(limit) : 20)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})
