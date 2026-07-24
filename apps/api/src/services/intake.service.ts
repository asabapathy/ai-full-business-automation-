import { prisma } from './database.js'
import crypto from 'crypto'
import { logger } from '../utils/logger.js'

export class IntakeService {
  async getForms(orgId: string) {
    return prisma.intakeForm.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    })
  }

  async getForm(orgId: string, id: string) {
    return prisma.intakeForm.findFirst({ where: { id, organizationId: orgId } })
  }

  async createForm(orgId: string, data: {
    name: string
    description?: string
    serviceId?: string
    fields: any[]
  }) {
    return prisma.intakeForm.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        serviceId: data.serviceId,
        fields: data.fields,
      },
    })
  }

  async updateForm(orgId: string, id: string, data: Partial<{ name: string; fields: any[]; isActive: boolean }>) {
    return prisma.intakeForm.updateMany({
      where: { id, organizationId: orgId },
      data: { ...data, fields: data.fields as any },
    })
  }

  async deleteForm(orgId: string, id: string) {
    return prisma.intakeForm.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }

  async sendIntakeLink(orgId: string, formId: string, contactId: string, appointmentId?: string) {
    const form = await prisma.intakeForm.findFirst({ where: { id: formId, organizationId: orgId } })
    if (!form) throw new Error('Form not found')

    const token = crypto.randomBytes(32).toString('hex')

    const submission = await prisma.intakeSubmission.create({
      data: { formId, contactId, appointmentId, token },
    })

    const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3000'
    const intakeUrl = `${webUrl}/intake/${token}`

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
          subject: `Please complete your intake form`,
          html: `
            <p>Hi ${contact.firstName ?? 'there'},</p>
            <p>Please complete your intake form before your appointment:</p>
            <p><a href="${intakeUrl}" style="background:#2563eb;color:#fff;padding:10px 20px;border-radius:6px;text-decoration:none">Complete Intake Form</a></p>
            <p>This helps us serve you better!</p>
          `,
        })
      }
    } catch (err) {
      logger.error(err, 'Failed to send intake email')
    }

    return { submission, intakeUrl }
  }

  async getIntakeByToken(token: string) {
    return prisma.intakeSubmission.findFirst({
      where: { token },
      include: { form: true },
    })
  }

  async submitIntake(token: string, data: Record<string, any>) {
    const submission = await prisma.intakeSubmission.findFirst({ where: { token } })
    if (!submission) throw new Error('Intake form not found')
    if (submission.completedAt) throw new Error('Already submitted')

    return prisma.intakeSubmission.update({
      where: { id: submission.id },
      data: { data, completedAt: new Date() },
    })
  }

  async getSubmissions(orgId: string, formId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const form = await prisma.intakeForm.findFirst({ where: { id: formId, organizationId: orgId } })
    if (!form) throw new Error('Form not found')

    const [submissions, total] = await Promise.all([
      prisma.intakeSubmission.findMany({
        where: { formId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.intakeSubmission.count({ where: { formId } }),
    ])
    return { submissions, total, page, limit }
  }
}

export const intakeService = new IntakeService()
