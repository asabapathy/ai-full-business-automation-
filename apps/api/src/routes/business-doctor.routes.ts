import { Router } from 'express'
import { businessDoctorService } from '../services/business-doctor.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const businessDoctorRouter = Router()
businessDoctorRouter.use(authenticate)

businessDoctorRouter.get('/diagnostic', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const report = await businessDoctorService.runDiagnostic(orgId)
    res.json({ success: true, data: report })
  } catch (err) {
    logger.error(err, 'business doctor diagnostic error')
    res.status(500).json({ success: false, error: 'Failed to run diagnostic' })
  }
})

businessDoctorRouter.post('/ask', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { question } = req.body as { question: string }
    if (!question?.trim()) {
      return res.status(400).json({ success: false, error: 'Question required' })
    }
    const insight = await businessDoctorService.getAiInsight(orgId, question)
    res.json({ success: true, data: { insight } })
  } catch (err) {
    logger.error(err, 'business doctor ask error')
    res.status(500).json({ success: false, error: 'Failed to generate insight' })
  }
})
