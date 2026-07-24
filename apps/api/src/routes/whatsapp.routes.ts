import { Router } from 'express'
import { z } from 'zod'
import { whatsappService } from '../services/whatsapp.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const whatsappRouter = Router()

// Public webhook for Twilio inbound messages
whatsappRouter.post('/webhook/:orgId', async (req, res) => {
  try {
    const { orgId } = req.params
    await whatsappService.receiveMessage(orgId, req.body)
    res.set('Content-Type', 'text/xml').send('<Response></Response>')
  } catch (err) { logger.error(err); res.status(500).send('<Response></Response>') }
})

whatsappRouter.use(authenticate)

whatsappRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await whatsappService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

whatsappRouter.get('/messages', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 30
    res.json(await whatsappService.getMessages(orgId, page, limit))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

whatsappRouter.get('/conversation/:phone', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const messages = await whatsappService.getConversation(orgId, decodeURIComponent(req.params.phone))
    res.json({ messages })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

whatsappRouter.post('/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      to: z.string().min(1),
      body: z.string().min(1),
      contactId: z.string().uuid().optional(),
    }).parse(req.body)
    const message = await whatsappService.sendMessage(orgId, data)
    res.json({ message })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
