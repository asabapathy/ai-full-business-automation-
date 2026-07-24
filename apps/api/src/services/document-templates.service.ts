import { prisma } from './database.js'
import crypto from 'crypto'

export class DocumentTemplatesService {
  async getTemplates(orgId: string) {
    return prisma.documentTemplate.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { signedDocs: true } } },
    })
  }

  async getTemplate(orgId: string, id: string) {
    return prisma.documentTemplate.findFirst({ where: { id, organizationId: orgId } })
  }

  async createTemplate(orgId: string, data: {
    name: string
    type?: string
    content: string
    fields?: any[]
    requiresSignature?: boolean
  }) {
    return prisma.documentTemplate.create({
      data: {
        organizationId: orgId,
        name: data.name,
        type: data.type ?? 'agreement',
        content: data.content,
        fields: data.fields ?? [],
        requiresSignature: data.requiresSignature ?? true,
      },
    })
  }

  async updateTemplate(orgId: string, id: string, data: Partial<{
    name: string; type: string; content: string; fields: any[]; requiresSignature: boolean; isActive: boolean
  }>) {
    return prisma.documentTemplate.updateMany({ where: { id, organizationId: orgId }, data })
  }

  async deleteTemplate(orgId: string, id: string) {
    return prisma.documentTemplate.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }

  async sendForSignature(orgId: string, templateId: string, contactId: string, fieldValues?: Record<string, string>) {
    const template = await prisma.documentTemplate.findFirst({ where: { id: templateId, organizationId: orgId } })
    if (!template) throw new Error('Template not found')

    const token = crypto.randomBytes(32).toString('hex')
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    const doc = await prisma.signedDocument.create({
      data: {
        templateId,
        organizationId: orgId,
        contactId,
        token,
        fieldValues: fieldValues ?? {},
        expiresAt,
      },
    })

    const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3000'
    const signUrl = `${webUrl}/sign/${token}`

    try {
      const contact = await prisma.contact.findUnique({
        where: { id: contactId },
        select: { email: true, firstName: true },
      })

      if (contact?.email) {
        const { EmailService } = await import('@kanavu/integrations')
        const emailSvc = EmailService.fromEnv()
        await emailSvc.sendRaw?.({
          to: contact.email,
          subject: `Please sign: ${template.name}`,
          html: `
            <p>Hi ${contact.firstName ?? 'there'},</p>
            <p>Please review and sign the following document: <strong>${template.name}</strong></p>
            <p><a href="${signUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Sign Document</a></p>
            <p>This link expires in 30 days.</p>
          `,
        })
      }
    } catch {}

    return { doc, signUrl }
  }

  async getSignDoc(token: string) {
    return prisma.signedDocument.findFirst({
      where: { token },
      include: { template: true },
    })
  }

  async submitSignature(token: string, signatureData: string, fieldValues: Record<string, string>, ipAddress?: string) {
    const doc = await prisma.signedDocument.findFirst({ where: { token } })
    if (!doc) throw new Error('Document not found')
    if (doc.signedAt) throw new Error('Already signed')
    if (doc.expiresAt && doc.expiresAt < new Date()) throw new Error('Link expired')

    return prisma.signedDocument.update({
      where: { id: doc.id },
      data: { signatureData, fieldValues, signedAt: new Date(), ipAddress },
    })
  }

  async getSignedDocs(orgId: string, templateId?: string) {
    return prisma.signedDocument.findMany({
      where: { organizationId: orgId, ...(templateId ? { templateId } : {}) },
      orderBy: { createdAt: 'desc' },
      include: { template: { select: { name: true } } },
    })
  }
}

export const documentTemplatesService = new DocumentTemplatesService()
