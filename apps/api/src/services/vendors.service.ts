import { prisma } from '@kanavu/database'

export const vendorsService = {
  async getVendors(orgId: string, search?: string) {
    const where: any = { organizationId: orgId, isActive: true }
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ]
    }
    return prisma.vendor.findMany({ where, orderBy: { name: 'asc' } })
  },

  async getVendor(orgId: string, id: string) {
    return prisma.vendor.findFirst({
      where: { id, organizationId: orgId },
      include: {
        expenses: { orderBy: { date: 'desc' }, take: 10, select: { id: true, amount: true, category: true, date: true, description: true } },
      },
    })
  },

  async createVendor(orgId: string, data: {
    name: string
    email?: string
    phone?: string
    website?: string
    category?: string
    address?: object
  }) {
    return prisma.vendor.create({
      data: {
        organizationId: orgId,
        name: data.name,
        email: data.email,
        phone: data.phone,
        website: data.website,
        category: data.category,
        address: data.address,
      },
    })
  },

  async updateVendor(orgId: string, id: string, data: {
    name?: string
    email?: string
    phone?: string
    website?: string
    category?: string
    address?: object
    isActive?: boolean
  }) {
    return prisma.vendor.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async deleteVendor(orgId: string, id: string) {
    return prisma.vendor.updateMany({ where: { id, organizationId: orgId }, data: { isActive: false } })
  },

  async getStats(orgId: string) {
    const [total, active] = await Promise.all([
      prisma.vendor.count({ where: { organizationId: orgId } }),
      prisma.vendor.count({ where: { organizationId: orgId, isActive: true } }),
    ])
    const categories = await prisma.vendor.findMany({
      where: { organizationId: orgId },
      select: { category: true },
      distinct: ['category'],
    })
    return { total, active, categories: categories.map(c => c.category).filter(Boolean) }
  },
}
