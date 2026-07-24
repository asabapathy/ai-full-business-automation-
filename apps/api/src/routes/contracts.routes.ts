import { Router } from 'express'
import { z } from 'zod'
import { contractsService } from '../services/contracts.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const contractsRouter = Router()
contractsRouter.use(authenticate)

contractsRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    res.json(await contractsService.getStats(orgId))
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

contractsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status } = req.query as Record<string, string>
    const contracts = await contractsService.getContracts(orgId, status)
    res.json({ contracts })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

contractsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const contract = await contractsService.getContract(orgId, req.params.id)
    if (!contract) return res.status(404).json({ error: 'Not found' })
    res.json({ contract })
  } catch (err) { logger.error(err); res.status(500).json({ error: 'Failed' }) }
})

contractsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().min(1),
      content: z.string().min(1),
      contactId: z.string().uuid().optional(),
      value: z.number().positive().optional(),
      currency: z.string().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).parse(req.body)
    const contract = await contractsService.createContract(orgId, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    })
    res.status(201).json({ contract })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

contractsRouter.put('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      title: z.string().optional(),
      content: z.string().optional(),
      value: z.number().positive().optional(),
      startDate: z.string().datetime().optional(),
      endDate: z.string().datetime().optional(),
    }).parse(req.body)
    await contractsService.updateContract(orgId, req.params.id, {
      ...data,
      startDate: data.startDate ? new Date(data.startDate) : undefined,
      endDate: data.endDate ? new Date(data.endDate) : undefined,
    })
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

contractsRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await contractsService.sendContract(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

contractsRouter.post('/:id/sign', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await contractsService.markSigned(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})

contractsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await contractsService.deleteContract(orgId, req.params.id)
    res.json({ success: true })
  } catch (err: any) { logger.error(err); res.status(400).json({ error: err.message ?? 'Failed' }) }
})
