import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

interface CampaignData {
  name: string
  subject: string
  previewText?: string
  htmlBody: string
  textBody?: string
  contactListFilter?: Record<string, unknown>
  scheduledAt?: Date
}

export class CampaignBuilderService {
  async generateEmailContent(orgId: string, prompt: string, tone = 'professional'): Promise<{ subject: string; html: string; text: string }> {
    const aiResp = await aiService.chat(orgId, undefined, {
      message: `Write a marketing email for a business.
Tone: ${tone}
Instructions: ${prompt}

Respond with JSON only in this format:
{"subject":"...", "html":"<div>...</div>", "text":"..."}`,
    })

    try {
      const parsed = JSON.parse(aiResp.content.replace(/```json\n?|```/g, '').trim()) as { subject: string; html: string; text: string }
      return parsed
    } catch {
      return {
        subject: 'Important update from us',
        html: `<div style="font-family:sans-serif;max-width:600px;margin:0 auto"><p>${aiResp.content}</p></div>`,
        text: aiResp.content,
      }
    }
  }

  async createCampaign(orgId: string, data: CampaignData) {
    return prisma.emailCampaign.create({
      data: {
        organizationId: orgId,
        name: data.name,
        subject: data.subject,
        previewText: data.previewText,
        htmlBody: data.htmlBody,
        textBody: data.textBody ?? '',
        status: data.scheduledAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: data.scheduledAt,
        metadata: { contactListFilter: data.contactListFilter ?? {} },
      },
    })
  }

  async getCampaigns(orgId: string) {
    return prisma.emailCampaign.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async getCampaign(orgId: string, id: string) {
    return prisma.emailCampaign.findFirst({ where: { id, organizationId: orgId } })
  }

  async updateCampaign(orgId: string, id: string, data: Partial<CampaignData>) {
    return prisma.emailCampaign.update({
      where: { id },
      data: {
        ...(data.name && { name: data.name }),
        ...(data.subject && { subject: data.subject }),
        ...(data.previewText !== undefined && { previewText: data.previewText }),
        ...(data.htmlBody && { htmlBody: data.htmlBody }),
        ...(data.textBody !== undefined && { textBody: data.textBody }),
        ...(data.scheduledAt !== undefined && { scheduledAt: data.scheduledAt }),
      },
    })
  }

  async sendCampaign(orgId: string, campaignId: string): Promise<{ sent: number; failed: number }> {
    const campaign = await prisma.emailCampaign.findFirst({ where: { id: campaignId, organizationId: orgId } })
    if (!campaign) throw new Error('Campaign not found')

    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, email: { not: null } },
      select: { id: true, email: true, firstName: true, lastName: true },
      take: 5000,
    })

    let sent = 0
    let failed = 0
    let emailSvc: { sendRaw?: (opts: { to: string; subject: string; html: string }) => Promise<void> } | null = null
    try {
      const { EmailService } = await import('@kanavu/integrations')
      emailSvc = EmailService.fromEnv() as typeof emailSvc
    } catch {}

    for (const contact of contacts) {
      if (!contact.email) continue
      try {
        const html = campaign.htmlBody
          .replace(/\{\{name\}\}/g, `${contact.firstName} ${contact.lastName}`.trim())
          .replace(/\{\{email\}\}/g, contact.email)

        if (emailSvc?.sendRaw) {
          await emailSvc.sendRaw({ to: contact.email, subject: campaign.subject, html })
        }
        sent++
      } catch {
        failed++
      }
    }

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'SENT', sentAt: new Date(), recipientCount: sent, metadata: { sent, failed } },
    })

    return { sent, failed }
  }

  async deleteCampaign(orgId: string, id: string): Promise<void> {
    await prisma.emailCampaign.deleteMany({ where: { id, organizationId: orgId } })
  }

  async trackOpen(campaignId: string, contactId: string): Promise<void> {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { openCount: { increment: 1 } },
    }).catch(() => {})
  }

  async trackClick(campaignId: string, contactId: string, url: string): Promise<void> {
    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { clickCount: { increment: 1 } },
    }).catch(() => {})
  }
}

export const campaignBuilderService = new CampaignBuilderService()
