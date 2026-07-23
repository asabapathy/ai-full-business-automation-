import { prisma } from './database.js'

export class NotificationService {
  async getNotifications(organizationId: string, userId: string, filters: { unreadOnly?: boolean; page?: number; limit?: number }) {
    const { unreadOnly, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = {
      organizationId,
      userId,
      ...(unreadOnly ? { readAt: null } : {}),
    }

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.notification.count({ where }),
      prisma.notification.count({ where: { organizationId, userId, readAt: null } }),
    ])

    return { notifications, total, unreadCount, page, limit }
  }

  async markRead(organizationId: string, userId: string, notificationIds: string[]) {
    return prisma.notification.updateMany({
      where: { id: { in: notificationIds }, organizationId, userId },
      data: { readAt: new Date() },
    })
  }

  async markAllRead(organizationId: string, userId: string) {
    return prisma.notification.updateMany({
      where: { organizationId, userId, readAt: null },
      data: { readAt: new Date() },
    })
  }

  async create(organizationId: string, data: {
    userId?: string
    type: string
    title: string
    body: string
    actionUrl?: string
    data?: Record<string, unknown>
  }) {
    return prisma.notification.create({
      data: {
        organizationId,
        userId: data.userId,
        type: data.type,
        title: data.title,
        body: data.body,
        actionUrl: data.actionUrl,
        data: data.data ?? {},
      },
    })
  }

  async getUnreadCount(organizationId: string, userId: string) {
    const count = await prisma.notification.count({ where: { organizationId, userId, readAt: null } })
    return { count }
  }
}

export const notificationService = new NotificationService()
