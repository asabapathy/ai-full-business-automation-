import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class CallLogService {
  async logCall(orgId: string, data: {
    fromNumber: string
    toNumber: string
    direction?: string
    status?: string
    duration?: number
    recordingUrl?: string
    callSid?: string
    contactId?: string
  }) {
    return prisma.callLog.create({
      data: {
        organizationId: orgId,
        ...data,
        direction: data.direction ?? 'inbound',
        status: data.status ?? 'completed',
      },
    })
  }

  async logMissedCall(orgId: string, fromNumber: string, toNumber: string, callSid?: string) {
    const call = await prisma.callLog.create({
      data: {
        organizationId: orgId,
        fromNumber,
        toNumber,
        direction: 'inbound',
        status: 'missed',
        callSid,
        missedAt: new Date(),
      },
    })

    await this.sendMissedCallSms(orgId, fromNumber)
    return call
  }

  private async sendMissedCallSms(orgId: string, to: string) {
    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true, phone: true },
      })
      if (!org?.phone) return

      const accountSid = process.env['TWILIO_ACCOUNT_SID']
      const authToken = process.env['TWILIO_AUTH_TOKEN']
      if (!accountSid || !authToken) return

      const body = `Hi! We missed your call at ${org.name}. We'll get back to you shortly, or reply to this message and we'll respond right away.`

      const form = new URLSearchParams({
        To: to,
        From: org.phone,
        Body: body,
      })

      await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: form.toString(),
      })

      await prisma.callLog.updateMany({
        where: { organizationId: orgId, fromNumber: to, status: 'missed', autoSmsAt: null },
        data: { autoSmsAt: new Date() },
      })
    } catch (err) {
      logger.error(err, 'Failed to send missed-call SMS')
    }
  }

  async transcribeAndSummarize(callLogId: string) {
    const call = await prisma.callLog.findUnique({ where: { id: callLogId } })
    if (!call || !call.transcription) return

    try {
      const summary = await aiService.chat([{
        role: 'user',
        content: `Summarize this call transcript in 2-3 sentences and classify sentiment as positive/neutral/negative:\n\n${call.transcription}`,
      }])

      const sentiment = summary.toLowerCase().includes('negative') ? 'negative'
        : summary.toLowerCase().includes('positive') ? 'positive' : 'neutral'

      await prisma.callLog.update({
        where: { id: callLogId },
        data: { summary, sentiment },
      })
    } catch (err) {
      logger.error(err, 'Failed to summarize call')
    }
  }

  async getCalls(orgId: string, filters: { status?: string; direction?: string; page?: number; limit?: number }) {
    const { status, direction, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where = {
      organizationId: orgId,
      ...(status ? { status } : {}),
      ...(direction ? { direction } : {}),
    }

    const [calls, total] = await Promise.all([
      prisma.callLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.callLog.count({ where }),
    ])

    return { calls, total, page, limit }
  }

  async getCallStats(orgId: string) {
    const [total, missed, inbound, outbound, avgDuration] = await Promise.all([
      prisma.callLog.count({ where: { organizationId: orgId } }),
      prisma.callLog.count({ where: { organizationId: orgId, status: 'missed' } }),
      prisma.callLog.count({ where: { organizationId: orgId, direction: 'inbound' } }),
      prisma.callLog.count({ where: { organizationId: orgId, direction: 'outbound' } }),
      prisma.callLog.aggregate({
        where: { organizationId: orgId, duration: { not: null } },
        _avg: { duration: true },
      }),
    ])

    return {
      total,
      missed,
      inbound,
      outbound,
      missedRate: total > 0 ? Math.round((missed / total) * 100) : 0,
      avgDurationSeconds: Math.round(avgDuration._avg.duration ?? 0),
    }
  }

  async getCall(orgId: string, id: string) {
    return prisma.callLog.findFirst({ where: { id, organizationId: orgId } })
  }

  async deleteCall(orgId: string, id: string) {
    return prisma.callLog.deleteMany({ where: { id, organizationId: orgId } })
  }
}

export const callLogService = new CallLogService()
