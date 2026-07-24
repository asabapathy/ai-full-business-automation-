import { Router } from 'express'
import { z } from 'zod'
import { voiceService } from '../services/voice.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const voiceRouter = Router()

// Twilio sends form-encoded data
voiceRouter.post('/:slug/inbound', async (req, res) => {
  try {
    const { slug } = req.params
    const callSid = (req.body as Record<string, string>).CallSid ?? ''
    const from = (req.body as Record<string, string>).From ?? ''
    const twiml = await voiceService.handleInboundCall(slug, callSid, from)
    res.type('text/xml').send(twiml)
  } catch (err) {
    logger.error(err, 'voice inbound error')
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>')
  }
})

voiceRouter.post('/:slug/respond', async (req, res) => {
  try {
    const { slug } = req.params
    const body = req.body as Record<string, string>
    const speechResult = body.SpeechResult ?? ''
    const callSid = body.CallSid ?? ''
    const twiml = await voiceService.handleVoiceResponse(slug, speechResult, callSid)
    res.type('text/xml').send(twiml)
  } catch (err) {
    logger.error(err, 'voice respond error')
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response><Say>Sorry, an error occurred.</Say><Hangup/></Response>')
  }
})

voiceRouter.post('/:slug/voicemail', async (req, res) => {
  try {
    const { slug } = req.params
    const body = req.body as Record<string, string>
    await voiceService.handleVoicemail(slug, body.RecordingUrl ?? '', body.From ?? '', body.TranscriptionText)
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>')
  } catch (err) {
    logger.error(err, 'voicemail error')
    res.sendStatus(200)
  }
})

voiceRouter.post('/:slug/status', (_req, res) => {
  res.sendStatus(204)
})

voiceRouter.post('/:slug/booking-intent', async (req, res) => {
  try {
    const { slug } = req.params
    const body = req.body as Record<string, string>
    const digits = body.Digits ?? ''
    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'
    let twiml: string
    if (digits === '1') {
      twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Great! Visit our website to complete your booking. Thank you for calling!</Say><Hangup/></Response>`
    } else {
      twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna">Transferring you to a team member. Please hold.</Say><Dial><Number>${process.env['BUSINESS_PHONE'] ?? ''}</Number></Dial></Response>`
    }
    res.type('text/xml').send(twiml)
  } catch (err) {
    logger.error(err, 'booking intent error')
    res.sendStatus(500)
  }
})

// Authenticated: get webhook URLs to configure in Twilio dashboard
voiceRouter.get('/:slug/webhook-urls', authenticate, async (req, res) => {
  const { slug } = req.params
  res.json(voiceService.getTwilioWebhookUrls(slug))
})

// Voice settings (Twilio + ElevenLabs credentials stored per org)
voiceRouter.get('/settings', authenticate, async (req, res) => {
  try {
    const orgId = (req as any).user?.organizationId
    const settings = await voiceService.getSettings(orgId)
    res.json({ success: true, ...settings })
  } catch (err) {
    logger.error(err, 'get voice settings error')
    res.status(500).json({ success: false, error: 'Failed to fetch settings' })
  }
})

voiceRouter.post('/settings', authenticate, async (req, res) => {
  try {
    const orgId = (req as any).user?.organizationId
    await voiceService.saveSettings(orgId, req.body as Record<string, unknown>)
    res.json({ success: true })
  } catch (err) {
    logger.error(err, 'save voice settings error')
    res.status(500).json({ success: false, error: 'Failed to save settings' })
  }
})
