import { Router } from 'express'
import { z } from 'zod'
import { vendorsService } from '../services/vendors.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const vendorsRouter = Router()
vendorsRouter.use(authenticate)

vendorsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await vendorsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

vendorsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { search } = req.query as Record<string, string>
    const vendors = await vendorsService.getVendors(orgId, search)
    res.json({ vendors })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

vendorsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const vendor = await vendorsService.getVendor(orgId, req.params.id)
    if (!vendor) return res.status(404).json({ error: 'Not found' })
    res.json({ vendor })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

vendorsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      category: z.string().optional(),
      address: z.object({}).passthrough().optional(),
    }).parse(req.body)
    const vendor = await vendorsService.createVendor(orgId, data)
    res.status(201).json({ vendor })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

vendorsRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().optional(),
      email: z.string().email().optional(),
      phone: z.string().optional(),
      website: z.string().url().optional(),
      category: z.string().optional(),
      isActive: z.boolean().optional(),
    }).parse(req.body)
    await vendorsService.updateVendor(orgId, req.params.id, data)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

vendorsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await vendorsService.deleteVendor(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
