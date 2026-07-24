import { Router } from 'express'
import { reportService } from '../services/report.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const reportsRouter = Router()

reportsRouter.use(authenticate)

reportsRouter.get('/business', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = await reportService.generateBusinessReport(orgId)
    res.json({ report: data })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate report' })
  }
})

reportsRouter.get('/business/html', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { prisma } = await import('../services/database.js')
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true } })
    const data = await reportService.generateBusinessReport(orgId)
    const html = reportService.buildHtmlReport(data, org?.name ?? 'Business')
    res.type('text/html').send(html)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to generate HTML report' })
  }
})

reportsRouter.post('/business/email', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await reportService.emailWeeklyReport(orgId)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to email report' })
  }
})
