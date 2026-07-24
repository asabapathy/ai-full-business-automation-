import { Router } from 'express'
import { z } from 'zod'
import { projectsService } from '../services/projects.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const projectsRouter = Router()
projectsRouter.use(authenticate)

projectsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await projectsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

projectsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as Record<string, string>
    const projects = await projectsService.getProjects(orgId, status)
    res.json({ projects })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

projectsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const project = await projectsService.getProject(orgId, req.params.id)
    if (!project) return res.status(404).json({ error: 'Not found' })
    res.json({ project })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

projectsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      status: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      contactId: z.string().uuid().optional(),
      color: z.string().optional(),
    }).parse(req.body)
    const project = await projectsService.createProject(orgId, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    })
    res.status(201).json({ project })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

projectsRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
      color: z.string().optional(),
    }).parse(req.body)
    await projectsService.updateProject(orgId, req.params.id, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    })
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

projectsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await projectsService.deleteProject(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

// Task routes
projectsRouter.post('/:id/tasks', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().min(1),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      assigneeId: z.string().uuid().optional(),
      dueDate: z.string().datetime().optional(),
      order: z.number().int().optional(),
    }).parse(req.body)
    const task = await projectsService.createTask(req.params.id, orgId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
    res.status(201).json({ task })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

projectsRouter.put('/:id/tasks/:taskId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().optional(),
      description: z.string().optional(),
      status: z.string().optional(),
      priority: z.string().optional(),
      assigneeId: z.string().uuid().optional(),
      dueDate: z.string().datetime().optional(),
      order: z.number().int().optional(),
    }).parse(req.body)
    const task = await projectsService.updateTask(req.params.taskId, orgId, {
      ...data,
      dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
    })
    res.json({ task })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

projectsRouter.delete('/:id/tasks/:taskId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await projectsService.deleteTask(req.params.taskId, orgId)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
