import { Router } from 'express'
import { z } from 'zod'
import { marketingService } from '../services/marketing.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const marketingRouter = Router()
marketingRouter.use(authenticate)
marketingRouter.use(requireOrganization)

const createCampaignSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(['EMAIL', 'SMS', 'SOCIAL_FACEBOOK', 'SOCIAL_INSTAGRAM', 'SOCIAL_TIKTOK', 'SOCIAL_LINKEDIN', 'GOOGLE_ADS', 'REFERRAL', 'REVIEW_REQUEST', 'LOYALTY']),
  subject: z.string().optional(),
  content: z.string().optional(),
  audience: z.record(z.unknown()).optional(),
  scheduledAt: z.string().optional(),
})

const generateContentSchema = z.object({
  prompt: z.string().min(1).max(500),
  type: z.enum(['social_post', 'email', 'sms', 'ad_copy']),
  platform: z.string().optional(),
})

const generateCampaignSchema = z.object({
  goal: z.string().min(1).max(500),
  type: z.string(),
  platform: z.string().optional(),
})

const socialPostSchema = z.object({
  socialAccountId: z.string().uuid(),
  content: z.string().min(1),
  mediaUrls: z.array(z.string()).optional(),
  scheduledAt: z.string().optional(),
  aiGenerated: z.boolean().optional(),
})

// Campaign routes
marketingRouter.get('/campaigns', async (req, res) => {
  const { type, status, page, limit } = req.query as Record<string, string>
  const result = await marketingService.getCampaigns(req.organizationId!, {
    type,
    status,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 20,
  })
  res.json({ success: true, data: result })
})

marketingRouter.post('/campaigns', validate(createCampaignSchema), async (req, res) => {
  const campaign = await marketingService.createCampaign(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { campaign } })
})

marketingRouter.post('/campaigns/generate', validate(generateCampaignSchema), async (req, res) => {
  const result = await marketingService.generateAndCreateCampaign(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: result })
})

marketingRouter.patch('/campaigns/:id', async (req, res) => {
  const campaign = await marketingService.updateCampaign(req.organizationId!, req.params['id']!, req.body as Record<string, unknown>)
  res.json({ success: true, data: { campaign } })
})

marketingRouter.post('/campaigns/:id/launch', async (req, res) => {
  const campaign = await marketingService.launchCampaign(req.organizationId!, req.params['id']!)
  res.json({ success: true, data: { campaign }, message: 'Campaign launched' })
})

// AI content generation
marketingRouter.post('/generate', validate(generateContentSchema), async (req, res) => {
  const result = await marketingService.generateContent(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})

// Social media
marketingRouter.get('/social/accounts', async (req, res) => {
  const accounts = await marketingService.getSocialAccounts(req.organizationId!)
  res.json({ success: true, data: { accounts } })
})

marketingRouter.post('/social/posts', validate(socialPostSchema), async (req, res) => {
  const post = await marketingService.scheduleSocialPost(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { post } })
})

// Analytics
marketingRouter.get('/analytics', async (req, res) => {
  const analytics = await marketingService.getAnalytics(req.organizationId!)
  res.json({ success: true, data: analytics })
})
