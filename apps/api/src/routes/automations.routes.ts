import { Router } from 'express'
import { requireAuth } from '../middleware/auth.middleware.js'
import { requireOrganization } from '../middleware/organization.middleware.js'
import { automationService } from '../services/automation.service.js'

export const automationsRouter = Router()

automationsRouter.use(requireAuth, requireOrganization)

automationsRouter.get('/stats', async (req, res) => {
  const data = await automationService.getStats(req.organization!.id)
  res.json(data)
})

automationsRouter.get('/', async (req, res) => {
  const { isActive, triggerType, page, limit } = req.query
  const data = await automationService.getWorkflows(req.organization!.id, {
    isActive: isActive !== undefined ? isActive === 'true' : undefined,
    triggerType: triggerType as string | undefined,
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})

automationsRouter.post('/', async (req, res) => {
  const workflow = await automationService.createWorkflow(req.organization!.id, req.body)
  res.status(201).json(workflow)
})

automationsRouter.post('/generate', async (req, res) => {
  const { goal, triggerEvent } = req.body
  const data = await automationService.generateAiWorkflow(req.organization!.id, { goal, triggerEvent })
  res.json(data)
})

automationsRouter.patch('/:workflowId', async (req, res) => {
  const workflow = await automationService.updateWorkflow(req.organization!.id, req.params['workflowId']!, req.body)
  res.json(workflow)
})

automationsRouter.delete('/:workflowId', async (req, res) => {
  await automationService.deleteWorkflow(req.organization!.id, req.params['workflowId']!)
  res.json({ success: true })
})

automationsRouter.post('/:workflowId/execute', async (req, res) => {
  const result = await automationService.executeWorkflow(req.organization!.id, req.params['workflowId']!, req.body)
  res.json(result)
})

automationsRouter.get('/:workflowId/executions', async (req, res) => {
  const { page, limit } = req.query
  const data = await automationService.getExecutions(req.organization!.id, req.params['workflowId']!, {
    page: page ? Number(page) : undefined,
    limit: limit ? Number(limit) : undefined,
  })
  res.json(data)
})
