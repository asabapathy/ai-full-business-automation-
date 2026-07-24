import { Router } from 'express'
import { z } from 'zod'
import { knowledgeBaseService } from '../services/knowledge-base.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const knowledgeBaseRouter = Router()
knowledgeBaseRouter.use(authenticate)

knowledgeBaseRouter.get('/categories', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const categories = await knowledgeBaseService.getCategories(orgId)
    res.json({ categories })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch categories' })
  }
})

knowledgeBaseRouter.post('/ask', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { question } = z.object({ question: z.string() }).parse(req.body)
    const answer = await knowledgeBaseService.askKnowledgeBase(orgId, question)
    res.json({ answer })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to get answer' })
  }
})

knowledgeBaseRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category, search, page, limit } = req.query as Record<string, string>
    const result = await knowledgeBaseService.getItems(orgId, {
      category,
      search,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch items' })
  }
})

knowledgeBaseRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const item = await knowledgeBaseService.getItem(orgId, req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json({ item })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch item' })
  }
})

knowledgeBaseRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const userId = (req as any).user.id as string
    const data = z.object({
      title: z.string(),
      content: z.string(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
      fileUrl: z.string().optional(),
      fileType: z.string().optional(),
    }).parse(req.body)
    const item = await knowledgeBaseService.createItem(orgId, { ...data, createdBy: userId })
    res.status(201).json({ item })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create item' })
  }
})

knowledgeBaseRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const item = await knowledgeBaseService.updateItem(orgId, req.params.id, req.body)
    res.json({ item })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update item' })
  }
})

knowledgeBaseRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await knowledgeBaseService.deleteItem(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})
