import { Router } from 'express'
import { z } from 'zod'
import { inventoryService } from '../services/inventory.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const inventoryRouter = Router()
inventoryRouter.use(authenticate)

inventoryRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await inventoryService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

inventoryRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { category, search, lowStock } = req.query as Record<string, string>
    const items = await inventoryService.getItems(orgId, { category, search, lowStock: lowStock === 'true' })
    res.json({ items })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

inventoryRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const item = await inventoryService.getItem(orgId, req.params.id)
    if (!item) return res.status(404).json({ error: 'Not found' })
    res.json({ item })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

inventoryRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      sku: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().int().min(0).optional(),
      reorderPoint: z.number().int().min(0).optional(),
      reorderQty: z.number().int().min(0).optional(),
      unitCost: z.number().positive().optional(),
      unitPrice: z.number().positive().optional(),
      vendor: z.string().optional(),
      location: z.string().optional(),
    }).parse(req.body)
    const item = await inventoryService.createItem(orgId, data)
    res.status(201).json({ item })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

inventoryRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      sku: z.string().optional(),
      category: z.string().optional(),
      description: z.string().optional(),
      quantity: z.number().int().min(0).optional(),
      reorderPoint: z.number().int().min(0).optional(),
      unitCost: z.number().positive().optional(),
      unitPrice: z.number().positive().optional(),
      vendor: z.string().optional(),
      location: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    await inventoryService.updateItem(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

inventoryRouter.post('/:id/adjust', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { adjustment, reason } = z.object({
      adjustment: z.number().int(),
      reason: z.string().optional(),
    }).parse(req.body)
    const item = await inventoryService.adjustQuantity(orgId, req.params.id, adjustment, reason)
    res.json({ item })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

inventoryRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await inventoryService.deleteItem(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
