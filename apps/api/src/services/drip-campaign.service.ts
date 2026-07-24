import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

interface DripStep {
  delay: number
  delayUnit: 'hours' | 'days'
  type: 'email' | 'sms'
  subject?: string
  body: string
}

export class DripCampaignService {
  async getCampaigns(orgId: string) {
    return prisma.dripCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { enrollments: true } } },
    })
  }

  async getCampaign(orgId: string, id: string) {
    return prisma.dripCampaign.findFirst({
      where: { id, organizationId: orgId },
      include: { enrollments: { take: 10, orderBy: { createdAt: 'desc' } } },
    })
  }

  async createCampaign(orgId: string, data: {
    name: string
    trigger?: string
    triggerValue?: string
    steps: DripStep[]
  }) {
    return prisma.dripCampaign.create({
      data: {
        organizationId: orgId,
        name: data.name,
        trigger: data.trigger ?? 'manual',
        triggerValue: data.triggerValue,
        steps: data.steps as any,
      },
    })
  }

  async updateCampaign(orgId: string, id: string, data: Partial<{ name: string; steps: DripStep[]; isActive: boolean; trigger: string }>) {
    return prisma.dripCampaign.updateMany({
      where: { id, organizationId: orgId },
      data: { ...data, steps: data.steps as any },
    })
  }

  async deleteCampaign(orgId: string, id: string) {
    return prisma.dripCampaign.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }

  async enrollContact(orgId: string, campaignId: string, contactId: string) {
    const campaign = await prisma.dripCampaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
    if (!campaign) throw new Error('Campaign not found')

    const steps = campaign.steps as DripStep[]
    const firstStep = steps[0]
    const nextSendAt = firstStep ? this.computeNextSend(new Date(), firstStep) : null

    return prisma.dripEnrollment.upsert({
      where: { campaignId_contactId: { campaignId, contactId } },
      create: { campaignId, contactId, currentStep: 0, status: 'ACTIVE', nextSendAt },
      update: { status: 'ACTIVE', currentStep: 0, nextSendAt, completedAt: null },
    })
  }

  async unenrollContact(campaignId: string, contactId: string) {
    return prisma.dripEnrollment.updateMany({
      where: { campaignId, contactId },
      data: { status: 'PAUSED' },
    })
  }

  async processScheduledSteps() {
    const due = await prisma.dripEnrollment.findMany({
      where: { status: 'ACTIVE', nextSendAt: { lte: new Date() } },
      include: { campaign: true },
    })

    for (const enrollment of due) {
      try {
        await this.sendStep(enrollment)
      } catch (err) {
        logger.error(err, 'Failed to process drip step')
      }
    }
  }

  private async sendStep(enrollment: any) {
    const campaign = enrollment.campaign
    const steps = campaign.steps as DripStep[]
    const step = steps[enrollment.currentStep]
    if (!step) return

    const contact = await prisma.contact.findUnique({
      where: { id: enrollment.contactId },
      select: { email: true, phone: true, firstName: true },
    })
    if (!contact) return

    if (step.type === 'email' && contact.email) {
      try {
        const { EmailService } = await import('@kanavu/integrations')
        const emailSvc = EmailService.fromEnv()
        const body = step.body.replace(/\{\{firstName\}\}/g, contact.firstName ?? 'there')
        await emailSvc.sendRaw?.({ to: contact.email, subject: step.subject ?? campaign.name, html: body })
      } catch (err) { logger.error(err, 'Drip email failed') }
    } else if (step.type === 'sms' && contact.phone) {
      try {
        const accountSid = process.env['TWILIO_ACCOUNT_SID']
        const authToken = process.env['TWILIO_AUTH_TOKEN']
        const from = process.env['TWILIO_PHONE_NUMBER']
        if (accountSid && authToken && from) {
          const body = step.body.replace(/\{\{firstName\}\}/g, contact.firstName ?? 'there')
          const form = new URLSearchParams({ To: contact.phone, From: from, Body: body })
          await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: form.toString(),
          })
        }
      } catch (err) { logger.error(err, 'Drip SMS failed') }
    }

    const nextStepIndex = enrollment.currentStep + 1
    const nextStep = steps[nextStepIndex]

    await prisma.dripEnrollment.update({
      where: { id: enrollment.id },
      data: {
        currentStep: nextStepIndex,
        nextSendAt: nextStep ? this.computeNextSend(new Date(), nextStep) : null,
        status: nextStep ? 'ACTIVE' : 'COMPLETED',
        completedAt: nextStep ? null : new Date(),
      },
    })
  }

  private computeNextSend(from: Date, step: DripStep): Date {
    const ms = step.delayUnit === 'hours' ? step.delay * 3600000 : step.delay * 86400000
    return new Date(from.getTime() + ms)
  }

  async generateAiSteps(orgId: string, goal: string, stepCount = 5): Promise<DripStep[]> {
    const response = await aiService.chat([{
      role: 'user',
      content: `Create a ${stepCount}-step email drip campaign for a small business with this goal: "${goal}".
Return JSON array with objects: { delay: number, delayUnit: "hours"|"days", type: "email", subject: string, body: string }.
Use {{firstName}} for personalization. Keep emails short and action-oriented. Return ONLY the JSON array.`,
    }])

    try {
      const match = response.match(/\[[\s\S]*\]/)
      if (match) return JSON.parse(match[0]) as DripStep[]
    } catch {}
    return []
  }

  async getEnrollments(orgId: string, campaignId: string) {
    const campaign = await prisma.dripCampaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
    if (!campaign) return []
    return prisma.dripEnrollment.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }
}

export const dripCampaignService = new DripCampaignService()
