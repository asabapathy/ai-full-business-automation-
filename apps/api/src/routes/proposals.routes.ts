import { Router } from 'express'
import { z } from 'zod'
import { proposalService } from '../services/proposal.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const proposalsRouter = Router()

// Public: view and sign proposal by token
proposalsRouter.get('/view/:token', async (req, res) => {
  try {
    const proposal = await proposalService.getProposalByToken(req.params.token)
    if (!proposal) return res.status(404).json({ error: 'Proposal not found or expired' })
    res.json({ proposal })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to load proposal' })
  }
})

proposalsRouter.post('/sign/:token', async (req, res) => {
  try {
    const data = z.object({
      signerName: z.string(),
      signerEmail: z.string().email(),
      signatureData: z.string(),
    }).parse(req.body)

    await proposalService.signProposal(req.params.token, data)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to sign proposal' })
  }
})

proposalsRouter.use(authenticate)

proposalsRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const proposals = await proposalService.getProposals(orgId)
    res.json({ proposals })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch proposals' })
  }
})

proposalsRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const proposal = await proposalService.getProposal(orgId, req.params.id)
    if (!proposal) return res.status(404).json({ error: 'Proposal not found' })
    res.json({ proposal })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch proposal' })
  }
})

proposalsRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      contactId: z.string().uuid(),
      dealId: z.string().uuid().optional(),
      title: z.string(),
      context: z.string(),
      lineItems: z.array(z.object({
        description: z.string(),
        quantity: z.number().positive(),
        unitPrice: z.number().min(0),
      })).optional(),
    }).parse(req.body)

    const proposal = await proposalService.generateProposal(orgId, data)
    res.status(201).json({ proposal })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate proposal' })
  }
})

proposalsRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await proposalService.sendProposal(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to send proposal' })
  }
})

proposalsRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await proposalService.deleteProposal(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete proposal' })
  }
})
