import { prisma } from './database.js'

export class OperationsService {
  // Employees
  async getEmployees(organizationId: string, filters: { isActive?: boolean; page?: number; limit?: number }) {
    const { isActive, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = { organizationId, ...(isActive !== undefined ? { isActive } : {}) }

    const [employees, total] = await Promise.all([
      prisma.employee.findMany({ where, orderBy: { firstName: 'asc' }, skip, take: limit }),
      prisma.employee.count({ where }),
    ])

    return { employees, total, page, limit }
  }

  async createEmployee(organizationId: string, data: {
    firstName: string
    lastName: string
    email?: string
    phone?: string
    role: string
    department?: string
    hourlyRate?: number
    startDate?: string
    skills?: string[]
  }) {
    return prisma.employee.create({
      data: {
        organizationId,
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        role: data.role,
        department: data.department,
        hourlyRate: data.hourlyRate,
        startDate: data.startDate ? new Date(data.startDate) : null,
        skills: data.skills ?? [],
        isActive: true,
      },
    })
  }

  async updateEmployee(organizationId: string, employeeId: string, data: Record<string, unknown>) {
    const emp = await prisma.employee.findFirst({ where: { id: employeeId, organizationId } })
    if (!emp) throw new Error('Employee not found')
    return prisma.employee.update({ where: { id: employeeId }, data })
  }

  // Inventory
  async getInventory(organizationId: string, filters: { category?: string; lowStock?: boolean; page?: number; limit?: number }) {
    const { category, lowStock, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const where = {
      organizationId,
      isActive: true,
      ...(category ? { category } : {}),
      ...(lowStock ? { quantity: { lte: prisma.inventoryItem.fields.reorderPoint } } : {}),
    }

    const [items, total] = await Promise.all([
      prisma.inventoryItem.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.inventoryItem.count({ where }),
    ])

    return { items, total, page, limit }
  }

  async getLowStockItems(organizationId: string) {
    const items = await prisma.inventoryItem.findMany({
      where: { organizationId, isActive: true },
    })
    return items.filter(item => item.quantity <= item.reorderPoint)
  }

  async createInventoryItem(organizationId: string, data: {
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
        organizationId,
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
        isActive: true,
      },
    })
  }

  async updateInventoryQuantity(organizationId: string, itemId: string, quantityDelta: number) {
    const item = await prisma.inventoryItem.findFirst({ where: { id: itemId, organizationId } })
    if (!item) throw new Error('Item not found')

    return prisma.inventoryItem.update({
      where: { id: itemId },
      data: { quantity: Math.max(0, item.quantity + quantityDelta) },
    })
  }

  // Vendors
  async getVendors(organizationId: string, filters: { category?: string; page?: number; limit?: number }) {
    const { category, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = { organizationId, isActive: true, ...(category ? { category } : {}) }

    const [vendors, total] = await Promise.all([
      prisma.vendor.findMany({ where, orderBy: { name: 'asc' }, skip, take: limit }),
      prisma.vendor.count({ where }),
    ])

    return { vendors, total, page, limit }
  }

  async createVendor(organizationId: string, data: {
    name: string
    email?: string
    phone?: string
    website?: string
    category?: string
    address?: Record<string, unknown>
  }) {
    return prisma.vendor.create({
      data: {
        organizationId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        category: data.category,
        address: data.address,
        isActive: true,
      },
    })
  }

  // Dashboard
  async getOperationsSummary(organizationId: string) {
    const [totalEmployees, activeEmployees, totalItems, lowStockItems, totalVendors] = await Promise.all([
      prisma.employee.count({ where: { organizationId } }),
      prisma.employee.count({ where: { organizationId, isActive: true } }),
      prisma.inventoryItem.count({ where: { organizationId, isActive: true } }),
      this.getLowStockItems(organizationId),
      prisma.vendor.count({ where: { organizationId, isActive: true } }),
    ])

    return {
      employees: { total: totalEmployees, active: activeEmployees },
      inventory: { total: totalItems, lowStock: lowStockItems.length, lowStockItems: lowStockItems.slice(0, 5) },
      vendors: { total: totalVendors },
    }
  }
}

export const operationsService = new OperationsService()
