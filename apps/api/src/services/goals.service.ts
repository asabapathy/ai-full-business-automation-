import { prisma } from '@kanavu/database'

export const goalsService = {
  async getGoals(orgId: string, status?: string) {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    return prisma.goal.findMany({ where, orderBy: { createdAt: 'desc' } })
  },

  async getGoal(orgId: string, id: string) {
    return prisma.goal.findFirst({ where: { id, organizationId: orgId } })
  },

  async createGoal(orgId: string, data: {
    title: string
    description?: string
    category?: string
    targetValue: number
    currentValue?: number
    unit?: string
    dueDate?: Date
  }) {
    return prisma.goal.create({
      data: {
        organizationId: orgId,
        title: data.title,
        description: data.description,
        category: data.category,
        targetValue: data.targetValue,
        currentValue: data.currentValue ?? 0,
        unit: data.unit,
        dueDate: data.dueDate,
      },
    })
  },

  async updateGoal(orgId: string, id: string, data: {
    title?: string
    description?: string
    category?: string
    targetValue?: number
    currentValue?: number
    unit?: string
    dueDate?: Date
    status?: string
  }) {
    return prisma.goal.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async updateProgress(orgId: string, id: string, currentValue: number) {
    const goal = await prisma.goal.findFirst({ where: { id, organizationId: orgId } })
    if (!goal) throw new Error('Goal not found')
    const status = currentValue >= Number(goal.targetValue) ? 'achieved' : goal.status
    return prisma.goal.update({ where: { id }, data: { currentValue, status } })
  },

  async deleteGoal(orgId: string, id: string) {
    return prisma.goal.deleteMany({ where: { id, organizationId: orgId } })
  },

  async getStats(orgId: string) {
    const goals = await prisma.goal.findMany({
      where: { organizationId: orgId },
      select: { status: true, targetValue: true, currentValue: true },
    })
    const total = goals.length
    const achieved = goals.filter(g => g.status === 'achieved').length
    const active = goals.filter(g => g.status === 'active').length
    const avgProgress = goals.length > 0
      ? goals.reduce((sum, g) => sum + Math.min(100, (Number(g.currentValue) / Number(g.targetValue)) * 100), 0) / goals.length
      : 0
    return { total, achieved, active, avgProgress: avgProgress.toFixed(0) }
  },
}
