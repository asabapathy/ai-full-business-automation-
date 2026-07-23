import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface SequenceStep {
  stepOrder: number
  channel: 'email' | 'sms'
  delayHours: number
  subject?: string
  body: string
}

export class FollowUpSequenceService {
  async createSequence(orgId: string, data: { name: string; trigger: string; steps: SequenceStep[] }) {
    return prisma.followUpSequence.create({
      data: {
        organizationId: orgId,
        name: data.name,
        trigger: data.trigger,
        steps: {
          create: data.steps.map(s => ({
            stepOrder: s.stepOrder,
            channel: s.channel,
            delayHours: s.delayHours,
            subject: s.subject,
            body: s.body,
          })),
        },
      },
      include: { steps: { orderBy: { stepOrder: 'asc' } } },
    })
  }

  async getSequences(orgId: string) {
    return prisma.followUpSequence.findMany({
      where: { organizationId: orgId },
      include: {
        steps: { orderBy: { stepOrder: 'asc' } },
        _count: { select: { enrollments: true } },
      },
      orderBy: { createdAt: 'desc' },
    })
  }

  async getSequence(orgId: string, id: string) {
    return prisma.followUpSequence.findFirst({
      where: { id, organizationId: orgId },
      include: { steps: { orderBy: { stepOrder: 'asc' } }, enrollments: { take: 5 } },
    })
  }

  async enrollContact(sequenceId: string, contactId: string): Promise<void> {
    const sequence = await prisma.followUpSequence.findUnique({
      where: { id: sequenceId },
      include: { steps: { orderBy: { stepOrder: 'asc' }, take: 1 } },
    })
    if (!sequence || !sequence.isActive) return

    const firstStep = sequence.steps[0]
    const nextRunAt = firstStep
      ? new Date(Date.now() + firstStep.delayHours * 3_600_000)
      : null

    await prisma.followUpEnrollment.upsert({
      where: { sequenceId_contactId: { sequenceId, contactId } },
      create: { sequenceId, contactId, nextRunAt },
      update: { status: 'active', currentStep: 0, nextRunAt },
    })
  }

  async enrollByTrigger(orgId: string, trigger: string, contactId: string): Promise<void> {
    const sequences = await prisma.followUpSequence.findMany({
      where: { organizationId: orgId, trigger, isActive: true },
    })
    for (const seq of sequences) {
      await this.enrollContact(seq.id, contactId)
    }
  }

  async processEnrollments(): Promise<{ processed: number }> {
    const due = await prisma.followUpEnrollment.findMany({
      where: { status: 'active', nextRunAt: { lte: new Date() } },
      include: {
        sequence: { include: { steps: { orderBy: { stepOrder: 'asc' } } } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true, organizationId: true } },
      },
      take: 100,
    })

    let processed = 0
    for (const enrollment of due) {
      try {
        const steps = enrollment.sequence.steps
        const step = steps[enrollment.currentStep]
        if (!step) {
          await prisma.followUpEnrollment.update({ where: { id: enrollment.id }, data: { status: 'completed' } })
          continue
        }

        await this.executeStep(step, enrollment.contact)
        processed++

        const nextStepIndex = enrollment.currentStep + 1
        const nextStep = steps[nextStepIndex]

        if (nextStep) {
          await prisma.followUpEnrollment.update({
            where: { id: enrollment.id },
            data: {
              currentStep: nextStepIndex,
              nextRunAt: new Date(Date.now() + nextStep.delayHours * 3_600_000),
            },
          })
        } else {
          await prisma.followUpEnrollment.update({ where: { id: enrollment.id }, data: { status: 'completed' } })
        }
      } catch (err) {
        logger.error({ enrollmentId: enrollment.id, err }, 'Follow-up step failed')
      }
    }

    return { processed }
  }

  async deleteSequence(orgId: string, id: string): Promise<void> {
    await prisma.followUpSequence.deleteMany({ where: { id, organizationId: orgId } })
  }

  async toggleSequence(orgId: string, id: string, isActive: boolean): Promise<void> {
    await prisma.followUpSequence.updateMany({ where: { id, organizationId: orgId }, data: { isActive } })
  }

  private async executeStep(
    step: { channel: string; body: string; subject: string | null },
    contact: { firstName: string; lastName: string | null; email: string | null; phone: string | null; organizationId: string },
  ): Promise<void> {
    const personalized = step.body
      .replace(/\{\{firstName\}\}/g, contact.firstName)
      .replace(/\{\{name\}\}/g, `${contact.firstName} ${contact.lastName ?? ''}`.trim())

    if (step.channel === 'email' && contact.email) {
      try {
        const { EmailService } = await import('@kanavu/integrations')
        const emailSvc = EmailService.fromEnv() as { sendRaw?: (o: { to: string; subject: string; html: string }) => Promise<void> }
        await emailSvc.sendRaw?.({
          to: contact.email,
          subject: step.subject ?? 'A message for you',
          html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">${personalized.replace(/\n/g, '<br>')}</div>`,
        })
      } catch {}
    } else if (step.channel === 'sms' && contact.phone) {
      const accountSid = process.env['TWILIO_ACCOUNT_SID']
      const authToken = process.env['TWILIO_AUTH_TOKEN']
      const from = process.env['TWILIO_PHONE_NUMBER']
      if (accountSid && authToken && from) {
        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
          method: 'POST',
          headers: {
            Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({ To: contact.phone, From: from, Body: personalized.slice(0, 160) }),
        }).catch(() => {})
      }
    }
  }

  getSupportedTriggers() {
    return [
      'deal_stage_changed',
      'appointment_no_show',
      'appointment_completed',
      'lead_score_changed',
      'contact_created',
      'invoice_overdue',
      'review_requested',
    ]
  }
}

export const followUpSequenceService = new FollowUpSequenceService()
