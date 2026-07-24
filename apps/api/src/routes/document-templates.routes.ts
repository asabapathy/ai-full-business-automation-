import { Router } from 'express'
import { z } from 'zod'
import { documentTemplatesService } from '../services/document-templates.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const documentTemplatesRouter = Router()

// Public: view and sign document
documentTemplatesRouter.get('/sign/:token', async (req, res) => {
  try {
    const doc = await documentTemplatesService.getSignDoc(req.params.token)
    if (!doc) return res.status(404).json({ error: 'Document not found or expired' })
    if (doc.expiresAt && doc.expiresAt < new Date()) return res.status(410).json({ error: 'Link has expired' })
    res.json({ doc })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch document' })
  }
})

documentTemplatesRouter.post('/sign/:token', async (req, res) => {
  try {
    const { signatureData, fieldValues } = z.object({
      signatureData: z.string(),
      fieldValues: z.record(z.string()).optional().default({}),
    }).parse(req.body)
    const doc = await documentTemplatesService.submitSignature(
      req.params.token,
      signatureData,
      fieldValues,
      req.ip,
    )
    res.json({ doc })
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Signing failed' })
  }
})

documentTemplatesRouter.use(authenticate)

documentTemplatesRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const templates = await documentTemplatesService.getTemplates(orgId)
    res.json({ templates })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch templates' })
  }
})

documentTemplatesRouter.get('/signed', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { templateId } = req.query as Record<string, string>
    const docs = await documentTemplatesService.getSignedDocs(orgId, templateId)
    res.json({ docs })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch signed documents' })
  }
})

documentTemplatesRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const template = await documentTemplatesService.getTemplate(orgId, req.params.id)
    if (!template) return res.status(404).json({ error: 'Not found' })
    res.json({ template })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch template' })
  }
})

documentTemplatesRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      name: z.string(),
      type: z.string().optional(),
      content: z.string(),
      fields: z.array(z.any()).optional(),
      requiresSignature: z.boolean().optional(),
    }).parse(req.body)
    const template = await documentTemplatesService.createTemplate(orgId, data)
    res.status(201).json({ template })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to create template' })
  }
})

documentTemplatesRouter.patch('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await documentTemplatesService.updateTemplate(orgId, req.params.id, req.body)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to update template' })
  }
})

documentTemplatesRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await documentTemplatesService.deleteTemplate(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete template' })
  }
})

documentTemplatesRouter.post('/:id/send', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { contactId, fieldValues } = z.object({
      contactId: z.string().uuid(),
      fieldValues: z.record(z.string()).optional(),
    }).parse(req.body)
    const result = await documentTemplatesService.sendForSignature(orgId, req.params.id, contactId, fieldValues)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(500).json({ error: err.message ?? 'Failed to send document' })
  }
})
