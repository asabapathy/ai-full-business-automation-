import { Router } from 'express'
import { z } from 'zod'
import { chatService } from '../services/chat.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'

export const chatRouter = Router()

async function getOrgBySlug(slug: string) {
  return prisma.organization.findUnique({ where: { slug }, select: { id: true } })
}

// Public: widget endpoints (no auth)
chatRouter.post('/:slug/session', async (req, res) => {
  try {
    const { slug } = req.params
    const { visitorId, channel } = z.object({
      visitorId: z.string(),
      channel: z.string().optional(),
    }).parse(req.body)

    const org = await getOrgBySlug(slug)
    if (!org) return res.status(404).json({ error: 'Organization not found' })

    const sessionId = await chatService.getOrCreateSession(org.id, visitorId, channel)
    const messages = await chatService.getSessionMessages(sessionId)
    res.json({ sessionId, messages })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create session' })
  }
})

chatRouter.post('/:slug/message', async (req, res) => {
  try {
    const { slug } = req.params
    const { sessionId, message } = z.object({
      sessionId: z.string().uuid(),
      message: z.string().min(1).max(2000),
    }).parse(req.body)

    const org = await getOrgBySlug(slug)
    if (!org) return res.status(404).json({ error: 'Organization not found' })

    await chatService.streamChatResponse(org.id, sessionId, message, res)
  } catch (err) {
    logger.error(err)
    if (!res.headersSent) res.status(500).json({ error: 'Failed to send message' })
  }
})

chatRouter.post('/:slug/visitor', async (req, res) => {
  try {
    const { sessionId, name, email, phone } = z.object({
      sessionId: z.string().uuid(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
    }).parse(req.body)

    await chatService.captureVisitorInfo(sessionId, { name, email, phone })
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update visitor info' })
  }
})

chatRouter.post('/:slug/close', async (req, res) => {
  try {
    const { sessionId } = z.object({ sessionId: z.string().uuid() }).parse(req.body)
    await chatService.closeSession(sessionId)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to close session' })
  }
})

// Public: embeddable widget script
chatRouter.get('/:slug/widget.js', (req, res) => {
  const { slug } = req.params
  res.type('application/javascript').send(chatService.getWidgetScript(slug))
})

// Authenticated: staff view of all sessions
chatRouter.get('/sessions', authenticate, async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as { status?: string }
    const sessions = await chatService.getSessions(orgId, status)
    res.json({ sessions })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch sessions' })
  }
})

chatRouter.get('/sessions/:id/messages', authenticate, async (req, res) => {
  try {
    const messages = await chatService.getSessionMessages(req.params.id)
    res.json({ messages })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})
