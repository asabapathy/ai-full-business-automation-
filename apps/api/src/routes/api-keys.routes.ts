import { Router } from 'express'
import { z } from 'zod'
import { apiKeysService } from '../services/api-keys.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const apiKeysRouter = Router()
apiKeysRouter.use(authenticate)

apiKeysRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await apiKeysService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

apiKeysRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const keys = await apiKeysService.getKeys(orgId)
    res.json({ keys })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

apiKeysRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string().min(1),
      scopes: z.array(z.string()).optional(),
      expiresAt: z.string().datetime().optional(),
    }).parse(req.body)
    const result = await apiKeysService.createKey(orgId, {
      ...data,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : undefined,
    })
    res.status(201).json(result)
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

apiKeysRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await apiKeysService.revokeKey(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

apiKeysRouter.get('/:id/usage', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const usage = await apiKeysService.getKeyUsage(orgId, req.params.id)
    res.json(usage)
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})
