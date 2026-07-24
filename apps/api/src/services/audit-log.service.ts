import { prisma } from './database.js'

export class AuditLogService {
  async log(orgId: string, data: {
    userId?: string
    action: string
    entity: string
    entityId?: string
    changes?: Record<string, any>
    metadata?: Record<string, any>
    ipAddress?: string
    userAgent?: string
  }) {
    return prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: data.userId,
        action: data.action,
        entity: data.entity,
        entityId: data.entityId,
        changes: data.changes,
        metadata: data.metadata,
        ipAddress: data.ipAddress,
        userAgent: data.userAgent,
      },
    })
  }

  async getLogs(orgId: string, filters: {
    entity?: string
    action?: string
    userId?: string
    from?: Date
    to?: Date
    page?: number
    limit?: number
  } = {}) {
    const { entity, action, userId, from, to, page = 1, limit = 50 } = filters
    const skip = (page - 1) * limit

    const where: any = { organizationId: orgId }
    if (entity) where.entity = entity
    if (action) where.action = { contains: action, mode: 'insensitive' }
    if (userId) where.userId = userId
    if (from || to) {
      where.createdAt = {}
      if (from) where.createdAt.gte = from
      if (to) where.createdAt.lte = to
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.auditLog.count({ where }),
    ])

    return { logs, total, page, limit }
  }

  async getEntityHistory(orgId: string, entity: string, entityId: string) {
    return prisma.auditLog.findMany({
      where: { organizationId: orgId, entity, entityId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async getRecentActivity(orgId: string, limit = 20) {
    return prisma.auditLog.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getStats(orgId: string) {
    const oneDayAgo = new Date(Date.now() - 86400000)
    const sevenDaysAgo = new Date(Date.now() - 7 * 86400000)

    const [today, week, byEntity] = await Promise.all([
      prisma.auditLog.count({ where: { organizationId: orgId, createdAt: { gte: oneDayAgo } } }),
      prisma.auditLog.count({ where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } } }),
      prisma.auditLog.groupBy({
        by: ['entity'],
        where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo } },
        _count: true,
        orderBy: { _count: { entity: 'desc' } },
        take: 5,
      }),
    ])

    return {
      actionsToday: today,
      actionsThisWeek: week,
      topEntities: byEntity.map(e => ({ entity: e.entity, count: e._count })),
    }
  }
}

export const auditLogService = new AuditLogService()
