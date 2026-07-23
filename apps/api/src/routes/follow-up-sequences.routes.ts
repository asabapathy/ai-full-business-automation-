import { Router } from 'express'
import { z } from 'zod'
import { followUpSequenceService } from '../services/follow-up-sequence.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const followUpSequencesRouter = Router()

followUpSequencesRouter.use(authenticate)

followUpSequencesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const sequences = await followUpSequenceService.getSequences(orgId)
    res.json({ sequences })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch sequences' })
  }
})

followUpSequencesRouter.get('/triggers', async (req, res) => {
  res.json({ triggers: followUpSequenceService.getSupportedTriggers() })
})

followUpSequencesRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const sequence = await followUpSequenceService.getSequence(orgId, req.params.id)
    if (!sequence) return res.status(404).json({ error: 'Sequence not found' })
    res.json({ sequence })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch sequence' })
  }
})

followUpSequencesRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      trigger: z.string(),
      steps: z.array(z.object({
        stepOrder: z.number().int().positive(),
        channel: z.enum(['email', 'sms']),
        delayHours: z.number().min(0),
        body: z.string(),
        subject: z.string().optional(),
      })),
    }).parse(req.body)

    const sequence = await followUpSequenceService.createSequence(orgId, data)
    res.status(201).json({ sequence })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create sequence' })
  }
})

followUpSequencesRouter.patch('/:id/toggle', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { isActive } = z.object({ isActive: z.boolean() }).parse(req.body)
    await followUpSequenceService.toggleSequence(orgId, req.params.id, isActive)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to toggle sequence' })
  }
})

followUpSequencesRouter.post('/:id/enroll', async (req, res) => {
  try {
    const { contactId } = z.object({ contactId: z.string().uuid() }).parse(req.body)
    await followUpSequenceService.enrollContact(req.params.id, contactId)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to enroll contact' })
  }
})

followUpSequencesRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await followUpSequenceService.deleteSequence(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete sequence' })
  }
})

followUpSequencesRouter.post('/process', async (req, res) => {
  try {
    const result = await followUpSequenceService.processEnrollments()
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to process enrollments' })
  }
})
