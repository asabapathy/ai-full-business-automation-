import { Router } from 'express'
import { z } from 'zod'
import { callLogService } from '../services/call-log.service.js'
import { authenticate } from '../middleware/auth.middleware.js'
import { logger } from '../utils/logger.js'

export const callLogRouter = Router()

// Public: Twilio webhook for inbound calls
callLogRouter.post('/webhook/inbound', async (req, res) => {
  try {
    const body = req.body as Record<string, string>
    const from = body.From ?? ''
    const to = body.To ?? ''
    const callSid = body.CallSid ?? ''
    const callStatus = body.CallStatus ?? ''

    const { prisma } = await import('../services/database.js')
    const org = await prisma.organization.findFirst({ where: { phone: to }, select: { id: true } })

    if (org) {
      if (callStatus === 'no-answer' || callStatus === 'busy' || callStatus === 'failed') {
        await callLogService.logMissedCall(org.id, from, to, callSid)
      } else {
        await callLogService.logCall(org.id, { fromNumber: from, toNumber: to, callSid, direction: 'inbound', status: callStatus })
      }
    }

    res.type('text/xml').send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Pause length="1"/>
</Response>`)
  } catch (err) {
    logger.error(err)
    res.type('text/xml').send('<?xml version="1.0" encoding="UTF-8"?><Response/>')
  }
})

// Public: Twilio recording + transcription callback
callLogRouter.post('/webhook/recording', async (req, res) => {
  try {
    const body = req.body as Record<string, string>
    const callSid = body.CallSid ?? ''
    const recordingUrl = body.RecordingUrl ?? ''
    const transcriptionText = body.TranscriptionText ?? ''

    const { prisma } = await import('../services/database.js')
    await prisma.callLog.updateMany({
      where: { callSid },
      data: {
        recordingUrl: recordingUrl || undefined,
        transcription: transcriptionText || undefined,
      },
    })

    if (transcriptionText) {
      const call = await prisma.callLog.findFirst({ where: { callSid } })
      if (call) await callLogService.transcribeAndSummarize(call.id)
    }

    res.sendStatus(200)
  } catch (err) {
    logger.error(err)
    res.sendStatus(200)
  }
})

callLogRouter.use(authenticate)

callLogRouter.get('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const { status, direction, page, limit } = req.query as Record<string, string>
    const result = await callLogService.getCalls(orgId, {
      status,
      direction,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
    res.json(result)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch calls' })
  }
})

callLogRouter.get('/stats', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const stats = await callLogService.getCallStats(orgId)
    res.json(stats)
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch stats' })
  }
})

callLogRouter.get('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const call = await callLogService.getCall(orgId, req.params.id)
    if (!call) return res.status(404).json({ error: 'Not found' })
    res.json({ call })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to fetch call' })
  }
})

callLogRouter.post('/', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    const data = z.object({
      fromNumber: z.string(),
      toNumber: z.string(),
      direction: z.enum(['inbound', 'outbound']).optional(),
      status: z.string().optional(),
      duration: z.number().optional(),
      recordingUrl: z.string().optional(),
      transcription: z.string().optional(),
      callSid: z.string().optional(),
      contactId: z.string().uuid().optional(),
    }).parse(req.body)

    const call = await callLogService.logCall(orgId, data)
    res.status(201).json({ call })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to log call' })
  }
})

callLogRouter.delete('/:id', async (req, res) => {
  try {
    const orgId = (req as any).user.organizationId as string
    await callLogService.deleteCall(orgId, req.params.id)
    res.json({ success: true })
  } catch (err) {
    logger.error(err)
    res.status(500).json({ error: 'Failed to delete call' })
  }
})
