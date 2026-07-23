import { Router } from 'express'
import { z } from 'zod'
import { websiteService } from '../services/website.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'

export const websiteRouter = Router()
websiteRouter.use(authenticate)
websiteRouter.use(requireOrganization)

const createWebsiteSchema = z.object({
  name: z.string().min(1).max(200),
  domain: z.string().optional(),
  template: z.string().optional(),
  primaryColor: z.string().optional(),
  description: z.string().optional(),
})

const createPageSchema = z.object({
  websiteId: z.string().uuid(),
  title: z.string().min(1).max(200),
  slug: z.string().min(1),
  pageType: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
})

const generateSiteSchema = z.object({
  businessGoals: z.array(z.string()).optional(),
  targetAudience: z.string().optional(),
  competitors: z.array(z.string()).optional(),
  primaryColor: z.string().optional(),
  template: z.string().optional(),
})

const generatePageContentSchema = z.object({
  tone: z.enum(['professional', 'friendly', 'authoritative', 'casual']).optional(),
  primaryKeyword: z.string().optional(),
})

const generateBlogSchema = z.object({
  topic: z.string().min(1).max(200),
  targetKeyword: z.string().min(1),
  wordCount: z.number().min(300).max(3000).optional(),
})

// Websites
websiteRouter.get('/', async (req, res) => {
  const websites = await websiteService.getWebsites(req.organizationId!)
  res.json({ success: true, data: { websites } })
})

websiteRouter.post('/', validate(createWebsiteSchema), async (req, res) => {
  const website = await websiteService.createWebsite(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { website } })
})

websiteRouter.post('/generate', validate(generateSiteSchema), async (req, res) => {
  const result = await websiteService.generateWebsite(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: result })
})

// Pages
websiteRouter.get('/:websiteId/pages', async (req, res) => {
  const pages = await websiteService.getPages(req.organizationId!, req.params['websiteId']!)
  res.json({ success: true, data: { pages } })
})

websiteRouter.post('/pages', validate(createPageSchema), async (req, res) => {
  const page = await websiteService.createPage(req.organizationId!, req.body)
  res.status(201).json({ success: true, data: { page } })
})

websiteRouter.post('/pages/:pageId/generate-content', validate(generatePageContentSchema), async (req, res) => {
  const result = await websiteService.generatePageContent(req.organizationId!, req.params['pageId']!, req.body)
  res.json({ success: true, data: result })
})

// Blog
websiteRouter.get('/:websiteId/blog', async (req, res) => {
  const { status, page, limit } = req.query as Record<string, string>
  const result = await websiteService.getBlogPosts(req.organizationId!, req.params['websiteId']!, {
    status,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 10,
  })
  res.json({ success: true, data: result })
})

websiteRouter.post('/:websiteId/blog/generate', validate(generateBlogSchema), async (req, res) => {
  const result = await websiteService.generateBlogPost(req.organizationId!, req.params['websiteId']!, req.body)
  res.status(201).json({ success: true, data: result })
})

// SEO Analytics
websiteRouter.get('/seo/analytics', async (req, res) => {
  const analytics = await websiteService.getSeoAnalytics(req.organizationId!)
  res.json({ success: true, data: analytics })
})
