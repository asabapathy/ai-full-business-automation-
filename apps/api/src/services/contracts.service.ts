import { prisma } from '@kanavu/database'

export const contractsService = {
  async getContracts(orgId: string, status?: string) {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    return prisma.contract.findMany({
      where,
      include: { contact: { select: { id: true, firstName: true, lastName: true } } } as any,
      orderBy: { createdAt: 'desc' },
    } as any)
  },

  async getContract(orgId: string, id: string) {
    return prisma.contract.findFirst({
      where: { id, organizationId: orgId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } } as any,
    } as any)
  },

  async createContract(orgId: string, data: {
    title: string
    content: string
    contactId?: string
    value?: number
    currency?: string
    startDate?: Date
    endDate?: Date
  }) {
    return prisma.contract.create({
      data: {
        organizationId: orgId,
        title: data.title,
        content: data.content,
        contactId: data.contactId,
        value: data.value,
        currency: data.currency ?? 'USD',
        startDate: data.startDate,
        endDate: data.endDate,
      },
    })
  },

  async updateContract(orgId: string, id: string, data: {
    title?: string
    content?: string
    contactId?: string
    value?: number
    startDate?: Date
    endDate?: Date
  }) {
    return prisma.contract.updateMany({
      where: { id, organizationId: orgId, status: { in: ['draft', 'sent'] } },
      data,
    })
  },

  async sendContract(orgId: string, id: string) {
    return prisma.contract.updateMany({
      where: { id, organizationId: orgId, status: 'draft' },
      data: { status: 'sent', sentAt: new Date() },
    })
  },

  async markSigned(orgId: string, id: string) {
    return prisma.contract.updateMany({
      where: { id, organizationId: orgId, status: 'sent' },
      data: { status: 'signed', signedAt: new Date() },
    })
  },

  async deleteContract(orgId: string, id: string) {
    return prisma.contract.deleteMany({ where: { id, organizationId: orgId, status: 'draft' } })
  },

  async getStats(orgId: string) {
    const contracts = await prisma.contract.findMany({
      where: { organizationId: orgId },
      select: { status: true, value: true },
    })
    const byStatus = contracts.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const signedValue = contracts.filter(c => c.status === 'signed').reduce((s, c) => s + Number(c.value ?? 0), 0)
    return { total: contracts.length, byStatus, signedValue }
  },
}
