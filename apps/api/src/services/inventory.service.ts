import { prisma } from '@kanavu/database'

export const inventoryService = {
  async getItems(orgId: string, filters?: { category?: string; search?: string; lowStock?: boolean }) {
    const where: any = { organizationId: orgId, isActive: true }
    if (filters?.category) where.category = filters.category
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { sku: { contains: filters.search, mode: 'insensitive' } },
      ]
    }
    if (filters?.lowStock) {
      where.AND = [{ quantity: { lte: prisma.inventoryItem.fields.reorderPoint } }]
    }
    const items = await prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' } })
    if (filters?.lowStock) {
      return items.filter(i => i.quantity <= i.reorderPoint)
    }
    return items
  },

  async getItem(orgId: string, id: string) {
    return prisma.inventoryItem.findFirst({ where: { id, organizationId: orgId } })
  },

  async createItem(orgId: string, data: {
    name: string
    sku?: string
    category?: string
    description?: string
    quantity?: number
    reorderPoint?: number
    reorderQty?: number
    unitCost?: number
    unitPrice?: number
    vendor?: string
    location?: string
  }) {
    return prisma.inventoryItem.create({
      data: {
        organizationId: orgId,
        name: data.name,
        sku: data.sku,
        category: data.category,
        description: data.description,
        quantity: data.quantity ?? 0,
        reorderPoint: data.reorderPoint ?? 0,
        reorderQty: data.reorderQty ?? 0,
        unitCost: data.unitCost,
        unitPrice: data.unitPrice,
        vendor: data.vendor,
        location: data.location,
      },
    })
  },

  async updateItem(orgId: string, id: string, data: {
    name?: string
    sku?: string
    category?: string
    description?: string
    quantity?: number
    reorderPoint?: number
    reorderQty?: number
    unitCost?: number
    unitPrice?: number
    vendor?: string
    location?: string
    isActive?: boolean
  }) {
    return prisma.inventoryItem.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async adjustQuantity(orgId: string, id: string, adjustment: number, reason?: string) {
    const item = await prisma.inventoryItem.findFirst({ where: { id, organizationId: orgId } })
    if (!item) throw new Error('Item not found')
    const newQty = item.quantity + adjustment
    if (newQty < 0) throw new Error('Insufficient stock')
    return prisma.inventoryItem.update({ where: { id }, data: { quantity: newQty } })
  },

  async deleteItem(orgId: string, id: string) {
    return prisma.inventoryItem.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
  },

  async getStats(orgId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { quantity: true, reorderPoint: true, unitCost: true, unitPrice: true },
    })
    const totalItems = items.length
    const lowStock = items.filter(i => i.quantity <= i.reorderPoint).length
    const totalValue = items.reduce((sum, i) => sum + (Number(i.unitCost ?? 0) * i.quantity), 0)
    const outOfStock = items.filter(i => i.quantity === 0).length
    return { totalItems, lowStock, outOfStock, totalValue }
  },
}
