import { prisma } from './database.js'

interface FormField {
  id: string
  type: 'text' | 'email' | 'phone' | 'textarea' | 'select' | 'checkbox' | 'number'
  label: string
  placeholder?: string
  required?: boolean
  options?: string[]
  mapTo?: 'firstName' | 'lastName' | 'email' | 'phone' | 'notes'
}

export class FormBuilderService {
  async getForms(orgId: string) {
    return prisma.leadForm.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { submissions: true } } },
    })
  }

  async getForm(orgId: string, id: string) {
    return prisma.leadForm.findFirst({
      where: { id, organizationId: orgId },
    })
  }

  async getFormByIdPublic(id: string) {
    return prisma.leadForm.findFirst({
      where: { id, isActive: true },
      select: { id: true, name: true, description: true, fields: true, settings: true },
    })
  }

  async createForm(orgId: string, data: { name: string; description?: string; fields: FormField[]; settings?: any }) {
    const form = await prisma.leadForm.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        fields: data.fields as any,
        settings: data.settings ?? {},
      },
    })

    const embedCode = this.generateEmbedCode(form.id)
    await prisma.leadForm.update({ where: { id: form.id }, data: { embedCode } })

    return { ...form, embedCode }
  }

  async updateForm(orgId: string, id: string, data: Partial<{ name: string; description: string; fields: FormField[]; settings: any; isActive: boolean }>) {
    return prisma.leadForm.updateMany({
      where: { id, organizationId: orgId },
      data: {
        ...data,
        fields: data.fields as any,
        settings: data.settings as any,
      },
    })
  }

  async deleteForm(orgId: string, id: string) {
    return prisma.leadForm.deleteMany({ where: { id, organizationId: orgId } })
  }

  async submitForm(formId: string, submissionData: Record<string, any>, meta: { ipAddress?: string; userAgent?: string; referrer?: string }) {
    const form = await prisma.leadForm.findFirst({
      where: { id: formId, isActive: true },
    })
    if (!form) throw new Error('Form not found or inactive')

    const fields = form.fields as FormField[]

    const contactData: Partial<{ firstName: string; lastName: string; email: string; phone: string; notes: string }> = {}
    for (const field of fields) {
      const val = submissionData[field.id]
      if (val !== undefined && field.mapTo) {
        (contactData as any)[field.mapTo] = String(val)
      }
    }

    let contactId: string | undefined
    if (contactData.email) {
      const existing = await prisma.contact.findFirst({
        where: { organizationId: form.organizationId, email: contactData.email },
        select: { id: true },
      })
      if (existing) {
        contactId = existing.id
        await prisma.contact.update({
          where: { id: existing.id },
          data: { ...contactData, lastContactedAt: new Date() },
        })
      } else {
        const newContact = await prisma.contact.create({
          data: {
            organizationId: form.organizationId,
            firstName: contactData.firstName ?? 'Unknown',
            lastName: contactData.lastName,
            email: contactData.email,
            phone: contactData.phone,
            notes: contactData.notes,
            source: 'form',
            type: 'LEAD',
          },
        })
        contactId = newContact.id
      }
    }

    const submission = await prisma.leadFormSubmission.create({
      data: {
        formId,
        organizationId: form.organizationId,
        contactId,
        data: submissionData,
        ipAddress: meta.ipAddress,
        userAgent: meta.userAgent,
        referrer: meta.referrer,
      },
    })

    await prisma.leadForm.update({
      where: { id: formId },
      data: { submissionCount: { increment: 1 } },
    })

    return { submission, contactId }
  }

  async getSubmissions(orgId: string, formId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [submissions, total] = await Promise.all([
      prisma.leadFormSubmission.findMany({
        where: { formId, organizationId: orgId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.leadFormSubmission.count({ where: { formId, organizationId: orgId } }),
    ])
    return { submissions, total, page, limit }
  }

  private generateEmbedCode(formId: string): string {
    const webUrl = process.env['WEB_URL'] ?? 'http://localhost:3000'
    return `<iframe src="${webUrl}/forms/${formId}" width="100%" height="500" frameborder="0"></iframe>`
  }
}

export const formBuilderService = new FormBuilderService()
