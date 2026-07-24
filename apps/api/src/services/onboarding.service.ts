import { prisma } from '@kanavu/database'

const DEFAULT_ITEMS = [
  { title: 'Welcome call scheduled', order: 0 },
  { title: 'Contract signed', order: 1 },
  { title: 'Access credentials provided', order: 2 },
  { title: 'First check-in completed', order: 3 },
  { title: 'Onboarding survey sent', order: 4 },
]

export const onboardingService = {
  async getChecklists(orgId: string, status?: string) {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    return prisma.onboardingChecklist.findMany({
      where,
      include: {
        items: { orderBy: { order: 'asc' } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } } as any,
      } as any,
      orderBy: { createdAt: 'desc' },
    } as any)
  },

  async getChecklist(orgId: string, id: string) {
    return prisma.onboardingChecklist.findFirst({
      where: { id, organizationId: orgId },
      include: {
        items: { orderBy: { order: 'asc' } },
        contact: { select: { id: true, firstName: true, lastName: true, email: true } } as any,
      } as any,
    } as any)
  },

  async createChecklist(orgId: string, data: {
    contactId: string
    title: string
    customItems?: { title: string; description?: string; order?: number }[]
  }) {
    const items = data.customItems ?? DEFAULT_ITEMS
    return prisma.onboardingChecklist.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        title: data.title,
        items: {
          create: items.map(item => ({
            title: item.title,
            description: (item as any).description,
            order: item.order ?? 0,
          })),
        },
      },
      include: { items: { orderBy: { order: 'asc' } } },
    })
  },

  async toggleItem(orgId: string, checklistId: string, itemId: string) {
    const checklist = await prisma.onboardingChecklist.findFirst({
      where: { id: checklistId, organizationId: orgId },
    })
    if (!checklist) throw new Error('Checklist not found')

    const item = await prisma.onboardingItem.findFirst({ where: { id: itemId, checklistId } })
    if (!item) throw new Error('Item not found')

    const updated = await prisma.onboardingItem.update({
      where: { id: itemId },
      data: {
        isCompleted: !item.isCompleted,
        completedAt: !item.isCompleted ? new Date() : null,
      },
    })

    const allItems = await prisma.onboardingItem.findMany({ where: { checklistId } })
    if (allItems.every(i => i.isCompleted)) {
      await prisma.onboardingChecklist.update({ where: { id: checklistId }, data: { status: 'completed' } })
    } else {
      await prisma.onboardingChecklist.update({ where: { id: checklistId }, data: { status: 'in_progress' } })
    }

    return updated
  },

  async addItem(orgId: string, checklistId: string, data: { title: string; description?: string }) {
    const checklist = await prisma.onboardingChecklist.findFirst({
      where: { id: checklistId, organizationId: orgId },
      include: { items: { select: { order: true } } },
    })
    if (!checklist) throw new Error('Checklist not found')
    const maxOrder = checklist.items.length > 0 ? Math.max(...checklist.items.map(i => i.order)) : -1
    return prisma.onboardingItem.create({
      data: { checklistId, title: data.title, description: data.description, order: maxOrder + 1 },
    })
  },

  async deleteChecklist(orgId: string, id: string) {
    return prisma.onboardingChecklist.deleteMany({ where: { id, organizationId: orgId } })
  },

  async getStats(orgId: string) {
    const checklists = await prisma.onboardingChecklist.findMany({
      where: { organizationId: orgId },
      select: { status: true },
    })
    const byStatus = checklists.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] ?? 0) + 1
      return acc
    }, {} as Record<string, number>)
    return { total: checklists.length, byStatus }
  },
}
