import { Router } from 'express'
import { z } from 'zod'
import { contentCalendarService } from '../services/content-calendar.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const contentCalendarRouter = Router()
contentCalendarRouter.use(authenticate)

contentCalendarRouter.get('/calendar', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { month } = req.query as Record<string, string>
    const posts = await contentCalendarService.getCalendarView(orgId, month)
    res.json({ posts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch calendar' })
  }
})

contentCalendarRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { platform, status, from, to } = req.query as Record<string, string>
    const posts = await contentCalendarService.getPosts(orgId, { platform, status, from, to })
    res.json({ posts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch posts' })
  }
})

contentCalendarRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const post = await contentCalendarService.getPost(orgId, req.params.id)
    if (!post) return res.status(404).json({ error: 'Not found' })
    res.json({ post })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch post' })
  }
})

contentCalendarRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string(),
      body: z.string(),
      platform: z.string(),
      scheduledAt: z.string().datetime().optional(),
      hashtags: z.array(z.string()).optional(),
      mediaUrl: z.string().optional(),
    }).parse(req.body)
    const post = await contentCalendarService.createPost(orgId, data)
    res.status(201).json({ post })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create post' })
  }
})

contentCalendarRouter.post('/generate-week', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { topic } = z.object({ topic: z.string() }).parse(req.body)
    const plan = await contentCalendarService.generateWeekPlan(orgId, topic)
    res.json({ plan })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate week plan' })
  }
})

contentCalendarRouter.post('/bulk', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { posts } = z.object({ posts: z.array(z.any()) }).parse(req.body)
    const created = await contentCalendarService.bulkCreateFromPlan(orgId, posts)
    res.status(201).json({ posts: created })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to bulk create posts' })
  }
})

contentCalendarRouter.post('/:id/generate-draft', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const post = await contentCalendarService.generateAiDraft(orgId, req.params.id)
    res.json({ post })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate draft' })
  }
})

contentCalendarRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const post = await contentCalendarService.updatePost(orgId, req.params.id, req.body)
    res.json({ post })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update post' })
  }
})

contentCalendarRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await contentCalendarService.deletePost(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete post' })
  }
})
