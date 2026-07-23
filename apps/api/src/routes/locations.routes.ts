import { Router } from 'express'
import { z } from 'zod'
import { locationService } from '../services/location.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const locationsRouter = Router()

locationsRouter.use(authenticate)

locationsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const locations = await locationService.getLocations(orgId)
    res.json({ locations })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch locations' })
  }
})

locationsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const location = await locationService.getLocation(orgId, req.params.id)
    if (!location) return res.status(404).json({ error: 'Location not found' })
    res.json({ location })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch location' })
  }
})

const locationSchema = z.object({
  name: z.string(),
  address: z.record(z.unknown()).optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
  timezone: z.string().optional(),
  businessHours: z.record(z.unknown()).optional(),
  isDefault: z.boolean().optional(),
})

locationsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = locationSchema.parse(req.body)
    const location = await locationService.createLocation(orgId, data)
    res.status(201).json({ location })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create location' })
  }
})

locationsRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = locationSchema.partial().parse(req.body)
    const location = await locationService.updateLocation(orgId, req.params.id, data)
    res.json({ location })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update location' })
  }
})

locationsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await locationService.deleteLocation(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete location' })
  }
})
