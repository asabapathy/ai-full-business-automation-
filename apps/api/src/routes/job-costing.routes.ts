import { Router } from 'express'
import { z } from 'zod'
import { jobCostingService } from '../services/job-costing.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const jobCostingRouter = Router()

jobCostingRouter.use(authenticate)

jobCostingRouter.get('/inventory', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category } = req.query as { category?: string }
    const items = await jobCostingService.getInventory(orgId, category)
    res.json({ items })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch inventory' })
  }
})

jobCostingRouter.post('/inventory', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      sku: z.string().optional(),
      category: z.string().optional(),
      quantity: z.number().min(0),
      unitCost: z.number().min(0),
      unitPrice: z.number().min(0),
      reorderPoint: z.number().min(0).optional(),
    }).parse(req.body)

    const item = await jobCostingService.createInventoryItem(orgId, data)
    res.status(201).json({ item })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create inventory item' })
  }
})

jobCostingRouter.patch('/inventory/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      quantity: z.number().min(0).optional(),
      unitCost: z.number().min(0).optional(),
      unitPrice: z.number().min(0).optional(),
      reorderPoint: z.number().min(0).optional(),
    }).parse(req.body)

    const item = await jobCostingService.updateInventoryItem(orgId, req.params.id, data)
    res.json({ item })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update inventory item' })
  }
})

jobCostingRouter.get('/inventory/alerts', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const alerts = await jobCostingService.getLowStockAlerts(orgId)
    res.json({ alerts })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch low-stock alerts' })
  }
})

jobCostingRouter.get('/jobs/:appointmentId', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const costs = await jobCostingService.getJobCosts(orgId, req.params.appointmentId)
    res.json(costs)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch job costs' })
  }
})

jobCostingRouter.post('/jobs/:appointmentId/items', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { items } = z.object({
      items: z.array(z.object({
        inventoryItemId: z.string().uuid(),
        quantity: z.number().positive(),
      })),
    }).parse(req.body)

    const result = await jobCostingService.addItems(orgId, req.params.appointmentId, items)
    res.status(201).json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to add job cost items' })
  }
})

jobCostingRouter.delete('/items/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await jobCostingService.deleteItem(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete item' })
  }
})

jobCostingRouter.get('/profit-summary', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { days } = req.query as { days?: string }
    const summary = await jobCostingService.getProfitSummary(orgId, days ? parseInt(days, 10) : undefined)
    res.json(summary)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch profit summary' })
  }
})
