import { prisma } from '@kanavu/database'

export const emailTemplatesService = {
  async getTemplates(orgId: string, category?: string) {
    const where: any = { organizationId: orgId, isActive: true }
    if (category) where.category = category
    return prisma.emailTemplate.findMany({ where, orderBy: { name: 'asc' } })
  },

  async getTemplate(orgId: string, id: string) {
    return prisma.emailTemplate.findFirst({ where: { id, organizationId: orgId } })
  },

  async createTemplate(orgId: string, data: {
    name: string
    subject: string
    htmlContent: string
    category?: string
    variables?: string[]
  }) {
    return prisma.emailTemplate.create({
      data: {
        organizationId: orgId,
        name: data.name,
        subject: data.subject,
        htmlContent: data.htmlContent,
        category: data.category,
        variables: (data.variables ?? []) as any,
      },
    })
  },

  async updateTemplate(orgId: string, id: string, data: {
    name?: string
    subject?: string
    htmlContent?: string
    category?: string
    variables?: string[]
    isActive?: boolean
  }) {
    const update: any = { ...data }
    if (data.variables) update.variables = data.variables
    return prisma.emailTemplate.updateMany({ where: { id, organizationId: orgId }, data: update })
  },

  async deleteTemplate(orgId: string, id: string) {
    return prisma.emailTemplate.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
  },

  async duplicateTemplate(orgId: string, id: string) {
    const tpl = await prisma.emailTemplate.findFirst({ where: { id, organizationId: orgId } })
    if (!tpl) throw new Error('Template not found')
    return prisma.emailTemplate.create({
      data: {
        organizationId: orgId,
        name: `${tpl.name} (Copy)`,
        subject: tpl.subject,
        htmlContent: tpl.htmlContent,
        category: tpl.category,
        variables: tpl.variables,
      },
    })
  },

  async getCategories(orgId: string) {
    const templates = await prisma.emailTemplate.findMany({
      where: { organizationId: orgId },
      select: { category: true },
      distinct: ['category'],
    })
    return templates.map(t => t.category).filter(Boolean)
  },

  async getStats(orgId: string) {
    const [total, active] = await Promise.all([
      prisma.emailTemplate.count({ where: { organizationId: orgId } }),
      prisma.emailTemplate.count({ where: { organizationId: orgId, isActive: true } }),
    ])
    return { total, active }
  },
}
