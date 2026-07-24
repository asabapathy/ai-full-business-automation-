import { Router } from 'express'
import { z } from 'zod'
import { aiEmailWriterService } from '../services/ai-email-writer.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const aiEmailWriterRouter = Router()
aiEmailWriterRouter.use(authenticate)

aiEmailWriterRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const drafts = await aiEmailWriterService.getDrafts(orgId)
    res.json({ drafts })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

aiEmailWriterRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const draft = await aiEmailWriterService.getDraft(orgId, req.params.id)
    if (!draft) return res.status(404).json({ error: 'Not found' })
    res.json({ draft })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

aiEmailWriterRouter.post('/generate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      prompt: z.string().min(1),
      tone: z.string().optional(),
      subject: z.string().optional(),
    }).parse(req.body)
    const draft = await aiEmailWriterService.generateDraft(orgId, data)
    res.status(201).json({ draft })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

aiEmailWriterRouter.post('/:id/refine', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { instruction } = z.object({ instruction: z.string().min(1) }).parse(req.body)
    const draft = await aiEmailWriterService.refineDraft(orgId, req.params.id, instruction)
    res.json({ draft })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

aiEmailWriterRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await aiEmailWriterService.deleteDraft(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
