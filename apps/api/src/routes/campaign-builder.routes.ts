import { Router } from 'express'
import { z } from 'zod'
import { campaignBuilderService } from '../services/campaign-builder.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const campaignBuilderRouter = Router()

campaignBuilderRouter.use(authenticate)

campaignBuilderRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const campaigns = await campaignBuilderService.getCampaigns(orgId)
    res.json({ campaigns })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch campaigns' })
  }
})

campaignBuilderRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const campaign = await campaignBuilderService.getCampaign(orgId, req.params.id)
    if (!campaign) return res.status(404).json({ error: 'Campaign not found' })
    res.json({ campaign })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch campaign' })
  }
})

campaignBuilderRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      subject: z.string(),
      previewText: z.string().optional(),
      htmlBody: z.string(),
      textBody: z.string().optional(),
      scheduledAt: z.string().datetime().optional(),
    }).parse(req.body)

    const campaign = await campaignBuilderService.createCampaign(orgId, {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    })
    res.status(201).json({ campaign })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create campaign' })
  }
})

campaignBuilderRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      subject: z.string().optional(),
      previewText: z.string().optional(),
      htmlBody: z.string().optional(),
      textBody: z.string().optional(),
      scheduledAt: z.string().datetime().optional(),
    }).parse(req.body)

    const campaign = await campaignBuilderService.updateCampaign(orgId, req.params.id, {
      ...data,
      scheduledAt: data.scheduledAt ? new Date(data.scheduledAt) : undefined,
    })
    res.json({ campaign })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update campaign' })
  }
})

campaignBuilderRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const result = await campaignBuilderService.sendCampaign(orgId, req.params.id)
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to send campaign' })
  }
})

campaignBuilderRouter.post('/generate', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { prompt, tone } = z.object({
      prompt: z.string(),
      tone: z.enum(['professional', 'friendly', 'urgent', 'casual']).optional(),
    }).parse(req.body)

    const content = await campaignBuilderService.generateEmailContent(orgId, prompt, tone)
    res.json({ content })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate email content' })
  }
})

campaignBuilderRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await campaignBuilderService.deleteCampaign(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete campaign' })
  }
})
