import { Router } from 'express'
import { z } from 'zod'
import { aiService } from '../services/ai.service.js'
import { authenticate, requireOrganization } from '../middleware/auth.js'
import { validate } from '../middleware/validate.js'
import { prisma } from '../services/database.js'

export const aiRouter = Router()

aiRouter.use(authenticate)
aiRouter.use(requireOrganization)

const chatSchema = z.object({
  message: z.string().min(1).max(10000),
  conversationId: z.string().uuid().optional(),
  agentType: z.string().optional(),
  stream: z.boolean().optional(),
})

const goalSchema = z.object({
  goal: z.string().min(1).max(1000),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  deadline: z.string().optional(),
  context: z.record(z.unknown()).optional(),
})

// Main chat endpoint
aiRouter.post('/chat', validate(chatSchema), async (req, res) => {
  const organizationId = req.organizationId!
  const userId = req.user!.id

  if (req.body.stream) {
    res.setHeader('Content-Type', 'text/event-stream')
    res.setHeader('Cache-Control', 'no-cache')
    res.setHeader('Connection', 'keep-alive')
    res.flushHeaders()

    for await (const chunk of aiService.chatStream(organizationId, userId, req.body)) {
      res.write(chunk)
    }
    res.end()
    return
  }

  const result = await aiService.chat(organizationId, userId, req.body)
  res.json({ success: true, data: result })
})

// Submit a high-level business goal
aiRouter.post('/goal', validate(goalSchema), async (req, res) => {
  const result = await aiService.submitGoal(req.organizationId!, req.body)
  res.json({ success: true, data: result })
})

// Get conversations
aiRouter.get('/conversations', async (req, res) => {
  const { page = '1', limit = '20' } = req.query as { page?: string; limit?: string }
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const [conversations, total] = await Promise.all([
    prisma.conversation.findMany({
      where: { organizationId: req.organizationId!, userId: req.user!.id },
      orderBy: { updatedAt: 'desc' },
      skip,
      take: parseInt(limit),
      select: {
        id: true,
        title: true,
        agentType: true,
        channel: true,
        status: true,
        startedAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    }),
    prisma.conversation.count({
      where: { organizationId: req.organizationId!, userId: req.user!.id },
    }),
  ])

  res.json({
    success: true,
    data: { conversations, total, page: parseInt(page), limit: parseInt(limit) },
  })
})

// Get messages for a conversation
aiRouter.get('/conversations/:id/messages', async (req, res) => {
  const messages = await prisma.message.findMany({
    where: { conversationId: req.params['id'] },
    orderBy: { createdAt: 'asc' },
    take: 100,
  })
  res.json({ success: true, data: { messages } })
})

// Get AI tasks
aiRouter.get('/tasks', async (req, res) => {
  const { status, agentType, page = '1', limit = '20' } = req.query as Record<string, string>
  const skip = (parseInt(page) - 1) * parseInt(limit)

  const tasks = await prisma.aITask.findMany({
    where: {
      organizationId: req.organizationId!,
      ...(status ? { status: status as never } : {}),
      ...(agentType ? { agentType: agentType as never } : {}),
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: parseInt(limit),
  })

  res.json({ success: true, data: { tasks } })
})

// Memory search
aiRouter.get('/memory/search', async (req, res) => {
  const { q, type } = req.query as { q?: string; type?: string }
  if (!q) {
    res.status(400).json({ success: false, error: 'Query parameter q is required' })
    return
  }

  const memories = await prisma.memory.findMany({
    where: {
      organizationId: req.organizationId!,
      ...(type ? { type: type.toUpperCase() as never } : {}),
      content: { contains: q, mode: 'insensitive' },
    },
    orderBy: [{ importance: 'desc' }, { createdAt: 'desc' }],
    take: 20,
  })

  res.json({ success: true, data: { memories } })
})

// Knowledge base
aiRouter.post('/knowledge', async (req, res) => {
  const { title, content, category } = req.body as { title: string; content: string; category?: string }
  await aiService.storeKnowledge(req.organizationId!, content, title, category)
  res.status(201).json({ success: true, message: 'Knowledge stored successfully' })
})

aiRouter.get('/knowledge', async (req, res) => {
  const { category, q } = req.query as { category?: string; q?: string }
  const items = await prisma.knowledgeItem.findMany({
    where: {
      organizationId: req.organizationId!,
      isActive: true,
      ...(category ? { category } : {}),
      ...(q ? { OR: [{ title: { contains: q, mode: 'insensitive' } }, { content: { contains: q, mode: 'insensitive' } }] } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: 50,
  })
  res.json({ success: true, data: { items } })
})
