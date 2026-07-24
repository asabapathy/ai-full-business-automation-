import { prisma } from '@kanavu/database'
import { logger } from '../utils/logger.js'

interface LineItem { description: string; quantity: number; unitPrice: number; total: number }

function calcTotals(lineItems: LineItem[], taxRate = 0) {
  const subtotal = lineItems.reduce((sum, li) => sum + li.total, 0)
  const tax = subtotal * (taxRate / 100)
  return { subtotal, tax, total: subtotal + tax }
}

export const estimatesService = {
  async getEstimates(orgId: string, status?: string) {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    return prisma.estimate.findMany({
      where,
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    } as any)
  },

  async getEstimate(orgId: string, id: string) {
    return prisma.estimate.findFirst({
      where: { id, organizationId: orgId },
      include: { contact: { select: { id: true, firstName: true, lastName: true, email: true } } } as any,
    } as any)
  },

  async createEstimate(orgId: string, data: {
    contactId?: string
    lineItems: LineItem[]
    currency?: string
    notes?: string
    validUntil?: Date
    taxRate?: number
  }) {
    const { subtotal, tax, total } = calcTotals(data.lineItems, data.taxRate)
    const count = await prisma.estimate.count({ where: { organizationId: orgId } })
    const estimateNumber = `EST-${String(count + 1).padStart(4, '0')}`
    return prisma.estimate.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        estimateNumber,
        lineItems: data.lineItems as any,
        subtotal,
        tax,
        total,
        currency: data.currency ?? 'USD',
        notes: data.notes,
        validUntil: data.validUntil,
      },
    })
  },

  async updateEstimate(orgId: string, id: string, data: {
    lineItems?: LineItem[]
    notes?: string
    validUntil?: Date
    taxRate?: number
  }) {
    const update: any = {}
    if (data.notes !== undefined) update.notes = data.notes
    if (data.validUntil !== undefined) update.validUntil = data.validUntil
    if (data.lineItems) {
      const { subtotal, tax, total } = calcTotals(data.lineItems, data.taxRate)
      update.lineItems = data.lineItems
      update.subtotal = subtotal
      update.tax = tax
      update.total = total
    }
    return prisma.estimate.updateMany({ where: { id, organizationId: orgId, status: 'draft' }, data: update })
  },

  async sendEstimate(orgId: string, id: string) {
    const est = await prisma.estimate.findFirst({ where: { id, organizationId: orgId } })
    if (!est) throw new Error('Estimate not found')
    if (est.status !== 'draft') throw new Error('Only draft estimates can be sent')
    return prisma.estimate.update({ where: { id }, data: { status: 'sent', sentAt: new Date() } })
  },

  async acceptEstimate(orgId: string, id: string) {
    return prisma.estimate.updateMany({
      where: { id, organizationId: orgId, status: 'sent' },
      data: { status: 'accepted', acceptedAt: new Date() },
    })
  },

  async rejectEstimate(orgId: string, id: string) {
    return prisma.estimate.updateMany({
      where: { id, organizationId: orgId, status: 'sent' },
      data: { status: 'rejected', rejectedAt: new Date() },
    })
  },

  async deleteEstimate(orgId: string, id: string) {
    return prisma.estimate.deleteMany({ where: { id, organizationId: orgId, status: 'draft' } })
  },

  async getStats(orgId: string) {
    const estimates = await prisma.estimate.findMany({
      where: { organizationId: orgId },
      select: { status: true, total: true },
    })
    const byStatus = estimates.reduce((acc, e) => {
      acc[e.status] = (acc[e.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    const acceptedValue = estimates.filter(e => e.status === 'accepted').reduce((s, e) => s + Number(e.total), 0)
    return { total: estimates.length, byStatus, acceptedValue }
  },
}
