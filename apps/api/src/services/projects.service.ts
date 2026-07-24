import { prisma } from '@kanavu/database'

export const projectsService = {
  async getProjects(orgId: string, status?: string) {
    const where: any = { organizationId: orgId }
    if (status) where.status = status
    return prisma.project.findMany({
      where,
      include: { tasks: { select: { id: true, status: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getProject(orgId: string, id: string) {
    return prisma.project.findFirst({
      where: { id, organizationId: orgId },
      include: {
        tasks: { orderBy: [{ order: 'asc' }, { createdAt: 'asc' }] },
      },
    })
  },

  async createProject(orgId: string, data: {
    name: string
    description?: string
    status?: string
    startDate?: Date
    endDate?: Date
    contactId?: string
    color?: string
  }) {
    return prisma.project.create({
      data: {
        organizationId: orgId,
        name: data.name,
        description: data.description,
        status: data.status ?? 'active',
        startDate: data.startDate,
        endDate: data.endDate,
        contactId: data.contactId,
        color: data.color,
      },
    })
  },

  async updateProject(orgId: string, id: string, data: {
    name?: string
    description?: string
    status?: string
    startDate?: Date
    endDate?: Date
    color?: string
  }) {
    return prisma.project.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async deleteProject(orgId: string, id: string) {
    return prisma.project.deleteMany({ where: { id, organizationId: orgId } })
  },

  async createTask(projectId: string, orgId: string, data: {
    title: string
    description?: string
    status?: string
    priority?: string
    assigneeId?: string
    dueDate?: Date
    order?: number
  }) {
    const project = await prisma.project.findFirst({ where: { id: projectId, organizationId: orgId } })
    if (!project) throw new Error('Project not found')
    return prisma.projectTask.create({
      data: {
        projectId,
        title: data.title,
        description: data.description,
        status: data.status ?? 'todo',
        priority: data.priority ?? 'medium',
        assigneeId: data.assigneeId,
        dueDate: data.dueDate,
        order: data.order ?? 0,
      },
    })
  },

  async updateTask(taskId: string, orgId: string, data: {
    title?: string
    description?: string
    status?: string
    priority?: string
    assigneeId?: string
    dueDate?: Date
    order?: number
  }) {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, project: { organizationId: orgId } },
    })
    if (!task) throw new Error('Task not found')
    return prisma.projectTask.update({ where: { id: taskId }, data })
  },

  async deleteTask(taskId: string, orgId: string) {
    const task = await prisma.projectTask.findFirst({
      where: { id: taskId, project: { organizationId: orgId } },
    })
    if (!task) throw new Error('Task not found')
    return prisma.projectTask.delete({ where: { id: taskId } })
  },

  async getStats(orgId: string) {
    const [projects, tasks] = await Promise.all([
      prisma.project.findMany({ where: { organizationId: orgId }, select: { status: true } }),
      prisma.projectTask.findMany({
        where: { project: { organizationId: orgId } },
        select: { status: true },
      }),
    ])
    const byStatus = projects.reduce((acc, p) => { acc[p.status] = (acc[p.status] ?? 0) + 1; return acc }, {} as Record<string, number>)
    const tasksByStatus = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] ?? 0) + 1; return acc }, {} as Record<string, number>)
    return { total: projects.length, byStatus, tasks: tasks.length, tasksByStatus }
  },
}
