import { prisma } from '@kanavu/database'

export const notificationCenterService = {
  async getNotifications(orgId: string, userId: string, page = 1, limit = 30) {
    const skip = (page - 1) * limit
    const [notifications, total, unread] = await Promise.all([
      prisma.notification.findMany({
        where: { organizationId: orgId, userId },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.notification.count({ where: { organizationId: orgId, userId } }),
      prisma.notification.count({ where: { organizationId: orgId, userId, isRead: false } }),
    ])
    return { notifications, total, unread, page, pages: Math.ceil(total / limit) }
  },

  async markRead(orgId: string, userId: string, id: string) {
    return prisma.notification.updateMany({
      where: { id, organizationId: orgId, userId },
      data: { isRead: true, readAt: new Date() },
    })
  },

  async markAllRead(orgId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { organizationId: orgId, userId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    })
  },

  async deleteNotification(orgId: string, userId: string, id: string) {
    return prisma.notification.deleteMany({ where: { id, organizationId: orgId, userId } })
  },

  async createNotification(orgId: string, data: {
    userId: string
    title: string
    message: string
    type?: string
    entityType?: string
    entityId?: string
    actionUrl?: string
  }) {
    return prisma.notification.create({
      data: {
        organizationId: orgId,
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type ?? 'info',
        entityType: data.entityType,
        entityId: data.entityId,
        actionUrl: data.actionUrl,
      },
    })
  },

  async broadcastToOrg(orgId: string, data: {
    title: string
    message: string
    type?: string
    actionUrl?: string
  }) {
    const members = await prisma.organizationMember.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { userId: true },
    })

    const records = members.map(m => ({
      organizationId: orgId,
      userId: m.userId,
      title: data.title,
      message: data.message,
      type: data.type ?? 'info',
      actionUrl: data.actionUrl,
    }))

    return prisma.notification.createMany({ data: records })
  },

  async getUnreadCount(orgId: string, userId: string) {
    return prisma.notification.count({ where: { organizationId: orgId, userId, isRead: false } })
  },
}
