import { Router } from 'express'
import { z } from 'zod'
import { clientPortalService } from '../services/client-portal.service.js'
import { logger } from '../utils/logger.js'

export const clientPortalRouter = Router()

const portalAuth = async (req: any, res: any, next: any) => {
  const token = req.headers['x-portal-token'] as string
  if (!token) return res.status(401).json({ error: 'Portal token required' })
  const session = await clientPortalService.verifySession(token)
  if (!session) return res.status(401).json({ error: 'Invalid or expired session' })
  req.portalContact = session.contact
  req.portalOrg = session.organization
  next()
}

clientPortalRouter.post('/send-otp', async (req, res) => {
  try {
    const { orgId, email } = z.object({ orgId: z.string(), email: z.string().email() }).parse(req.body)
    await clientPortalService.sendOtp(orgId, email)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(400).json({ error: 'Failed to send OTP' })
  }
})

clientPortalRouter.post('/verify-otp', async (req, res) => {
  try {
    const { orgId, email, otp } = z.object({ orgId: z.string(), email: z.string().email(), otp: z.string() }).parse(req.body)
    const result = await clientPortalService.verifyOtp(orgId, email, otp)
    res.json(result)
  } catch (err: any) {
    logger.error(err)
    res.status(400).json({ error: err.message ?? 'Verification failed' })
  }
})

clientPortalRouter.get('/me', portalAuth, async (req: any, res) => {
  res.json({ contact: req.portalContact, organization: req.portalOrg })
})

clientPortalRouter.get('/appointments', portalAuth, async (req: any, res) => {
  try {
    const appointments = await clientPortalService.getPortalAppointments(req.portalOrg.id, req.portalContact.id)
    res.json({ appointments })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch appointments' })
  }
})

clientPortalRouter.get('/invoices', portalAuth, async (req: any, res) => {
  try {
    const invoices = await clientPortalService.getPortalInvoices(req.portalOrg.id, req.portalContact.id)
    res.json({ invoices })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch invoices' })
  }
})

clientPortalRouter.get('/profile', portalAuth, async (req: any, res) => {
  try {
    const profile = await clientPortalService.getPortalProfile(req.portalOrg.id, req.portalContact.id)
    res.json({ profile })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch profile' })
  }
})
