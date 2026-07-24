import { Router } from 'express'
import { z } from 'zod'
import { brandService } from '../services/brand.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const brandRouter = Router()

brandRouter.use(authenticate)

brandRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const config = await brandService.getBrandConfig(orgId)
    res.json({ config })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch brand config' })
  }
})

brandRouter.put('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      brandName: z.string().optional(),
      logoUrl: z.string().url().optional(),
      faviconUrl: z.string().url().optional(),
      primaryColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      accentColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
      customDomain: z.string().optional(),
      customCss: z.string().optional(),
      emailFromName: z.string().optional(),
      emailFromAddr: z.string().email().optional(),
      hideKanavuBranding: z.boolean().optional(),
    }).parse(req.body)

    const config = await brandService.upsertBrandConfig(orgId, data)
    res.json({ config })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update brand config' })
  }
})
