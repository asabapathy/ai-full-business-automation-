import { Router } from 'express'
import { z } from 'zod'
import { dripCampaignService } from '../services/drip-campaign.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const dripCampaignsRouter = Router()
dripCampaignsRouter.use(authenticate)

dripCampaignsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const campaigns = await dripCampaignService.getCampaigns(orgId)
    res.json({ campaigns })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

dripCampaignsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const campaign = await dripCampaignService.getCampaign(orgId, req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Not found' })
    res.json({ campaign })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch campaign' })
  }
})

dripCampaignsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      trigger: z.string().optional(),
      triggerValue: z.string().optional(),
      steps: z.array(z.any()),
    }).parse(req.body)
    const campaign = await dripCampaignService.createCampaign(orgId, data)
    res.status(201).json({ campaign })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

dripCampaignsRouter.post('/generate-steps', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { goal, stepCount } = z.object({ goal: z.string(), stepCount: z.number().optional() }).parse(req.body)
    const steps = await dripCampaignService.generateAiSteps(orgId, goal, stepCount)
    res.json({ steps })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate steps' })
  }
})

dripCampaignsRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await dripCampaignService.updateCampaign(orgId, req.params.id, req.body)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

dripCampaignsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await dripCampaignService.deleteCampaign(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete campaign' })
  }
})

dripCampaignsRouter.post('/:id/enroll', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { contactId } = z.object({ contactId: z.string().uuid() }).parse(req.body)
    const enrollment = await dripCampaignService.enrollContact(orgId, req.params.id, contactId)
    res.json({ enrollment })
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to enroll' })
  }
})

dripCampaignsRouter.get('/:id/enrollments', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const enrollments = await dripCampaignService.getEnrollments(orgId, req.params.id)
    res.json({ enrollments })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch enrollments' })
  }
})
