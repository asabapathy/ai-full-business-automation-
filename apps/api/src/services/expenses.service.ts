import { prisma } from '@kanavu/database'

export const expensesService = {
  async getExpenses(orgId: string, filters?: { category?: string; vendorId?: string }) {
    const where: any = { organizationId: orgId }
    if (filters?.category) where.category = filters.category
    if (filters?.vendorId) where.vendorId = filters.vendorId
    return prisma.expense.findMany({
      where,
      include: { vendor: { select: { id: true, name: true } } },
      orderBy: { date: 'desc' },
    })
  },

  async getExpense(orgId: string, id: string) {
    return prisma.expense.findFirst({
      where: { id, organizationId: orgId },
      include: { vendor: { select: { id: true, name: true } } },
    })
  },

  async createExpense(orgId: string, data: {
    category: string
    description: string
    amount: number
    currency?: string
    vendorId?: string
    receiptUrl?: string
    date: Date
    isRecurring?: boolean
  }) {
    return prisma.expense.create({
      data: {
        organizationId: orgId,
        category: data.category,
        description: data.description,
        amount: data.amount,
        currency: data.currency ?? 'USD',
        vendorId: data.vendorId,
        receiptUrl: data.receiptUrl,
        date: data.date,
        isRecurring: data.isRecurring ?? false,
      },
    })
  },

  async updateExpense(orgId: string, id: string, data: {
    category?: string
    description?: string
    amount?: number
    currency?: string
    vendorId?: string
    receiptUrl?: string
    date?: Date
  }) {
    return prisma.expense.updateMany({
      where: { id, organizationId: orgId },
      data,
    })
  },

  async deleteExpense(orgId: string, id: string) {
    return prisma.expense.deleteMany({ where: { id, organizationId: orgId } })
  },

  async getStats(orgId: string) {
    const expenses = await prisma.expense.findMany({
      where: { organizationId: orgId },
      select: { amount: true, category: true, date: true },
    })
    const total = expenses.reduce((sum, e) => sum + Number(e.amount), 0)
    const thisMonth = expenses.filter(e => {
      const d = new Date(e.date)
      const now = new Date()
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
    }).reduce((sum, e) => sum + Number(e.amount), 0)
    const byCategory = expenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] ?? 0) + Number(e.amount)
      return acc
    }, {} as Record<string, number>)
    return { total, thisMonth, count: expenses.length, byCategory }
  },

  async getCategories(orgId: string) {
    const expenses = await prisma.expense.findMany({
      where: { organizationId: orgId },
      select: { category: true },
      distinct: ['category'],
    })
    return expenses.map(e => e.category)
  },
}
