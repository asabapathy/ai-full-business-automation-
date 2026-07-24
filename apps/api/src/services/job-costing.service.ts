import { prisma } from './database.js'

interface JobCostItemInput {
  inventoryItemId?: string
  name: string
  quantity: number
  unitCost: number
  unitPrice: number
  notes?: string
}

export class JobCostingService {
  async addItems(orgId: string, appointmentId: string, items: JobCostItemInput[]) {
    const created = await Promise.all(items.map(item =>
      prisma.jobCostItem.create({
        data: {
          organizationId: orgId,
          appointmentId,
          inventoryItemId: item.inventoryItemId,
          name: item.name,
          quantity: item.quantity,
          unitCost: item.unitCost,
          unitPrice: item.unitPrice,
          notes: item.notes,
        },
      })
    ))

    // Decrement inventory quantities
    for (const item of items) {
      if (item.inventoryItemId) {
        await prisma.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: { quantity: { decrement: Math.floor(item.quantity) } },
        }).catch(() => {})
      }
    }

    return created
  }

  async getJobCosts(orgId: string, appointmentId: string) {
    const items = await prisma.jobCostItem.findMany({
      where: { organizationId: orgId, appointmentId },
      orderBy: { createdAt: 'asc' },
    })

    const totalCost = items.reduce((sum, i) => sum + Number(i.unitCost) * Number(i.quantity), 0)
    const totalRevenue = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)
    const grossProfit = totalRevenue - totalCost
    const margin = totalRevenue > 0 ? Math.round(grossProfit / totalRevenue * 100) : 0

    return { items, totalCost, totalRevenue, grossProfit, margin }
  }

  async deleteItem(orgId: string, id: string): Promise<void> {
    await prisma.jobCostItem.deleteMany({ where: { id, organizationId: orgId } })
  }

  async getLowStockAlerts(orgId: string) {
    return prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isActive: true, quantity: { lte: prisma.inventoryItem.fields.reorderPoint } },
    })
  }

  async getInventory(orgId: string, category?: string) {
    return prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isActive: true, ...(category ? { category } : {}) },
      orderBy: [{ category: 'asc' }, { name: 'asc' }],
    })
  }

  async updateInventoryItem(orgId: string, id: string, data: Partial<{ name: string; quantity: number; unitCost: number; unitPrice: number; reorderPoint: number; category: string }>) {
    return prisma.inventoryItem.update({ where: { id }, data })
  }

  async createInventoryItem(orgId: string, data: { name: string; sku?: string; category?: string; quantity?: number; unitCost?: number; unitPrice?: number; reorderPoint?: number }) {
    return prisma.inventoryItem.create({
      data: { organizationId: orgId, ...data },
    })
  }

  async getProfitSummary(orgId: string, days = 30) {
    const since = new Date(Date.now() - days * 86_400_000)
    const items = await prisma.jobCostItem.findMany({
      where: { organizationId: orgId, createdAt: { gte: since } },
    })

    const totalCost = items.reduce((sum, i) => sum + Number(i.unitCost) * Number(i.quantity), 0)
    const totalRevenue = items.reduce((sum, i) => sum + Number(i.unitPrice) * Number(i.quantity), 0)

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      grossProfit: Math.round((totalRevenue - totalCost) * 100) / 100,
      margin: totalRevenue > 0 ? Math.round((totalRevenue - totalCost) / totalRevenue * 100) : 0,
      itemCount: items.length,
    }
  }
}

export const jobCostingService = new JobCostingService()
