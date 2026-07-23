import { Router } from 'express'
import { z } from 'zod'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { socialService } from '../services/social.service.js'
import { config } from '../config/index.js'

export const socialRouter = Router()

// OAuth callbacks — public, no auth
socialRouter.get('/oauth/callback/:platform', async (req, res) => {
  const { platform } = req.params as { platform: string }
  const { code, state, error } = req.query as { code?: string; state?: string; error?: string }
  const appUrl = config.APP_URL

  if (error || !code || !state) {
    res.redirect(`${appUrl}/dashboard/social?error=${encodeURIComponent(error ?? 'oauth_failed')}`)
    return
  }

  try {
    const result = await socialService.handleOAuthCallback(
      platform as 'facebook' | 'instagram' | 'twitter' | 'linkedin',
      code,
      state,
    )
    res.redirect(`${appUrl}/dashboard/social?connected=true&org=${result.organizationId}`)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'oauth_failed'
    res.redirect(`${appUrl}/dashboard/social?error=${encodeURIComponent(message)}`)
  }
})

// All routes below require auth
socialRouter.use(authenticate)
socialRouter.use(requireOrganization)

// GET /social/accounts
socialRouter.get('/accounts', async (req, res) => {
  const accounts = await socialService.getAccounts(req.organizationId!)
  res.json({ success: true, data: { accounts } })
})

// POST /social/accounts/:id/disconnect
socialRouter.post('/accounts/:id/disconnect', async (req, res) => {
  await socialService.disconnectAccount(req.organizationId!, req.params['id']!)
  res.json({ success: true, message: 'Account disconnected' })
})

// GET /social/oauth/:platform — get OAuth URL to connect account
socialRouter.get('/oauth/:platform', async (req, res) => {
  try {
    const url = await socialService.generateOAuthUrl(
      req.params['platform'] as 'facebook' | 'instagram' | 'twitter' | 'linkedin',
      req.organizationId!,
    )
    res.json({ success: true, data: { url } })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to generate OAuth URL'
    res.status(503).json({ success: false, error: message })
  }
})

// GET /social/posts
socialRouter.get('/posts', async (req, res) => {
  const { status, accountId, page, limit } = req.query as Record<string, string>
  const result = await socialService.getPosts(req.organizationId!, {
    status,
    accountId,
    page: page ? parseInt(page) : undefined,
    limit: limit ? parseInt(limit) : undefined,
  })
  res.json({ success: true, data: result })
})

const createPostSchema = z.object({
  accountId: z.string().uuid(),
  content: z.string().min(1).max(5000),
  mediaUrls: z.array(z.string().url()).optional(),
  scheduledAt: z.string().optional(),
})

// POST /social/posts
socialRouter.post('/posts', validate(createPostSchema), async (req, res) => {
  const post = await socialService.createPost(req.organizationId!, req.body.accountId, {
    content: req.body.content,
    mediaUrls: req.body.mediaUrls,
    scheduledAt: req.body.scheduledAt,
  })
  res.status(201).json({ success: true, data: { post } })
})

const generatePostSchema = z.object({
  platform: z.enum(['facebook', 'instagram', 'twitter', 'linkedin']),
  topic: z.string().min(1).max(500),
  tone: z.string().optional(),
  includeHashtags: z.boolean().optional(),
})

// POST /social/posts/generate — AI-generated post
socialRouter.post('/posts/generate', validate(generatePostSchema), async (req, res) => {
  const result = await socialService.generateAiPost(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})

// POST /social/posts/:id/publish — publish a draft post now
socialRouter.post('/posts/:id/publish', async (req, res) => {
  await socialService.publishPost(req.params['id']!)
  res.json({ success: true, message: 'Post published' })
})

// DELETE /social/posts/:id
socialRouter.delete('/posts/:id', async (req, res) => {
  await socialService.deletePost(req.organizationId!, req.params['id']!)
  res.json({ success: true, message: 'Post deleted' })
})

// GET /social/stats
socialRouter.get('/stats', async (req, res) => {
  const stats = await socialService.getStats(req.organizationId!)
  res.json({ success: true, data: stats })
})
