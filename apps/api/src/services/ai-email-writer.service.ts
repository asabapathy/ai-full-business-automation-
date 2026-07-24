import { prisma } from '@kanavu/database'
import { aiService } from './ai.service.js'

export const aiEmailWriterService = {
  async generateDraft(orgId: string, data: {
    subject: string
    prompt: string
    tone?: string
    recipientName?: string
    senderName?: string
  }) {
    const tone = data.tone ?? 'professional'
    const systemPrompt = `You are an expert email copywriter. Write ${tone} emails that are clear, concise, and compelling. Always output valid HTML email content only — no markdown, no preamble, just the email body HTML.`

    const userPrompt = `Write a ${tone} email with the following details:
Subject: ${data.subject}
Goal/Context: ${data.prompt}
${data.recipientName ? `Recipient name: ${data.recipientName}` : ''}
${data.senderName ? `Sender name: ${data.senderName}` : ''}

Output only the HTML body content of the email (no <html>, <head>, or <body> tags). Use inline styles for formatting.`

    const htmlContent = await aiService.chat([
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ])

    const draft = await prisma.aiEmailDraft.create({
      data: {
        organizationId: orgId,
        subject: data.subject,
        prompt: data.prompt,
        htmlContent,
        tone,
      },
    })

    return draft
  },

  async getDrafts(orgId: string) {
    return prisma.aiEmailDraft.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getDraft(orgId: string, id: string) {
    return prisma.aiEmailDraft.findFirst({ where: { id, organizationId: orgId } })
  },

  async deleteDraft(orgId: string, id: string) {
    return prisma.aiEmailDraft.deleteMany({ where: { id, organizationId: orgId } })
  },

  async refineDraft(orgId: string, id: string, instruction: string) {
    const draft = await prisma.aiEmailDraft.findFirst({ where: { id, organizationId: orgId } })
    if (!draft) throw new Error('Draft not found')

    const refined = await aiService.chat([
      { role: 'user', content: `Here is an email draft:\n\n${draft.htmlContent}\n\nPlease refine it with this instruction: ${instruction}\n\nOutput only the revised HTML body content.` },
    ])

    return prisma.aiEmailDraft.update({ where: { id }, data: { htmlContent: refined } })
  },
}
