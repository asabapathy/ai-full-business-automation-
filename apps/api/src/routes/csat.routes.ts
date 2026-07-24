import { Router } from 'express'
import { z } from 'zod'
import { csatService } from '../services/csat.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const csatRouter = Router()

// Public: submit CSAT response
csatRouter.get('/respond/:token', async (req, res) => {
  try {
    const response = await csatService.getResponseByToken(req.params.token)
    if (!response) return res.status(404).json({ error: 'Not found' })
    res.json({ response })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

csatRouter.post('/respond/:token', async (req, res) => {
  try {
    const { score, comment } = z.object({
      score: z.number().int().min(1).max(5),
      comment: z.string().optional(),
    }).parse(req.body)
    const response = await csatService.submitResponse(req.params.token, score, comment)
    res.json({ response })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

csatRouter.use(authenticate)

csatRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await csatService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

csatRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const surveys = await csatService.getSurveys(orgId)
    res.json({ surveys })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

csatRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const survey = await csatService.getSurvey(orgId, req.params.id)
    if (!survey) return res.status(404).json({ error: 'Not found' })
    res.json({ survey })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

csatRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      question: z.string().min(1),
    }).parse(req.body)
    const survey = await csatService.createSurvey(orgId, data)
    res.status(201).json({ survey })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

csatRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1).optional(),
      question: z.string().min(1).optional(),
    }).parse(req.body)
    const survey = await csatService.updateSurvey(orgId, req.params.id, data)
    res.json({ survey })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

csatRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await csatService.deleteSurvey(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

csatRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { contactId } = z.object({ contactId: z.string().uuid() }).parse(req.body)
    const response = await csatService.sendSurvey(orgId, req.params.id, contactId)
    res.json({ response })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
