import { Router } from 'express'
import { z } from 'zod'
import { smsInboxService } from '../services/sms-inbox.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'

export const smsInboxRouter = Router()

// Public: Twilio inbound webhook
smsInboxRouter.post('/inbound', async (req, res) => {
  try {
    const body = req.body as Record<string, string>
    const from = body.From ?? ''
    const msgBody = body.Body ?? ''
    const sid = body.MessageSid ?? ''
    const toNumber = body.To ?? ''

    // Find org by Twilio number
    const org = await prisma.organization.findFirst({
      where: { phone: toNumber },
      select: { id: true },
    })

    if (org) {
      await smsInboxService.handleInbound(org.id, from, msgBody, sid)
    }

    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>')
  } catch (err) {
    logger.error(err, 'SMS inbound error')
    res.sendStatus(200)
  }
})

smsInboxRouter.use(authenticate)

smsInboxRouter.get('/conversations', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const conversations = await smsInboxService.getConversations(orgId)
    res.json({ conversations })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch conversations' })
  }
})

smsInboxRouter.get('/conversations/:id/messages', async (req, res) => {
  try {
    const messages = await smsInboxService.getMessages(req.params.id)
    res.json({ messages })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch messages' })
  }
})

smsInboxRouter.post('/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { to, body } = z.object({
      to: z.string(),
      body: z.string().max(1600),
    }).parse(req.body)

    const result = await smsInboxService.sendMessage(orgId, to, body)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to send SMS' })
  }
})

smsInboxRouter.post('/conversations/:id/suggest-reply', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const suggestion = await smsInboxService.suggestReply(orgId, req.params.id)
    res.json({ suggestion })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to suggest reply' })
  }
})

smsInboxRouter.post('/bulk', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { message } = z.object({ message: z.string().max(160) }).parse(req.body)
    const result = await smsInboxService.sendBulk(orgId, {}, message)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to send bulk SMS' })
  }
})
