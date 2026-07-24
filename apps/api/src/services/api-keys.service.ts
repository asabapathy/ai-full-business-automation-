import { prisma } from '@kanavu/database'
import crypto from 'crypto'

function hashKey(key: string): string {
  return crypto.createHash('sha256').update(key).digest('hex')
}

export const apiKeysService = {
  async getKeys(orgId: string) {
    return prisma.apiKey.findMany({
      where: { organizationId: orgId, isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, name: true, keyPrefix: true, scopes: true, lastUsedAt: true, expiresAt: true, isActive: true, createdAt: true },
    })
  },

  async createKey(orgId: string, data: { name: string; scopes?: string[]; expiresAt?: Date }) {
    const raw = `kanavu_${crypto.randomBytes(24).toString('hex')}`
    const keyPrefix = raw.slice(0, 16)
    const keyHash = hashKey(raw)

    await prisma.apiKey.create({
      data: {
        organizationId: orgId,
        name: data.name,
        keyHash,
        keyPrefix,
        scopes: data.scopes ?? [],
        expiresAt: data.expiresAt,
      },
    })

    return { key: raw, keyPrefix }
  },

  async revokeKey(orgId: string, id: string) {
    return prisma.apiKey.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  },

  async validateKey(rawKey: string): Promise<{ organizationId: string; scopes: string[] } | null> {
    const keyHash = hashKey(rawKey)
    const apiKey = await prisma.apiKey.findUnique({
      where: { keyHash },
      select: { id: true, organizationId: true, scopes: true, isActive: true, expiresAt: true },
    })

    if (!apiKey || !apiKey.isActive) return null
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) return null

    await prisma.apiKey.update({ where: { id: apiKey.id }, data: { lastUsedAt: new Date() } })

    return { organizationId: apiKey.organizationId, scopes: apiKey.scopes }
  },

  async getStats(orgId: string) {
    const [total, active] = await Promise.all([
      prisma.apiKey.count({ where: { organizationId: orgId } }),
      prisma.apiKey.count({ where: { organizationId: orgId, isActive: true } }),
    ])
    return { total, active, revoked: total - active }
  },

  async getKeyUsage(orgId: string, keyId: string) {
    const key = await prisma.apiKey.findFirst({ where: { id: keyId, organizationId: orgId } })
    if (!key) throw new Error('API key not found')

    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 86400000)
    const sevenDaysAgo = new Date(now.getTime() - 7 * 86400000)
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

    const [logs30d, logs7d, logs24h] = await Promise.all([
      prisma.auditLog.findMany({
        where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo }, metadata: { path: ['apiKeyId'], equals: keyId } },
        select: { action: true, entityType: true, createdAt: true, metadata: true },
      }),
      prisma.auditLog.count({
        where: { organizationId: orgId, createdAt: { gte: sevenDaysAgo }, metadata: { path: ['apiKeyId'], equals: keyId } },
      }),
      prisma.auditLog.count({
        where: { organizationId: orgId, createdAt: { gte: oneDayAgo }, metadata: { path: ['apiKeyId'], equals: keyId } },
      }),
    ])

    const byEndpointMap = new Map<string, { count: number; method: string }>()
    const byDayMap = new Map<string, { requests: number; errors: number }>()
    let errorCount = 0

    for (const log of logs30d) {
      const meta = (log.metadata as Record<string, unknown>) ?? {}
      const endpoint = (meta['endpoint'] as string) ?? log.action ?? 'unknown'
      const method = (meta['method'] as string) ?? 'GET'
      const isError = (meta['statusCode'] as number) >= 400

      const key = `${method}:${endpoint}`
      const existing = byEndpointMap.get(key) ?? { count: 0, method }
      byEndpointMap.set(key, { ...existing, count: existing.count + 1 })

      const day = log.createdAt.toISOString().slice(0, 10)
      const dayEntry = byDayMap.get(day) ?? { requests: 0, errors: 0 }
      byDayMap.set(day, { requests: dayEntry.requests + 1, errors: dayEntry.errors + (isError ? 1 : 0) })

      if (isError) errorCount++
    }

    const byEndpoint = Array.from(byEndpointMap.entries())
      .map(([key, v]) => ({ endpoint: key.split(':').slice(1).join(':'), method: v.method, count: v.count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const byDay = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(now.getTime() - (6 - i) * 86400000)
      const dateStr = d.toISOString().slice(0, 10)
      const entry = byDayMap.get(dateStr) ?? { requests: 0, errors: 0 }
      return { date: d.toLocaleDateString('en', { weekday: 'short' }), ...entry }
    })

    return {
      totalRequests: logs30d.length,
      last24h: logs24h,
      last7d: logs7d,
      last30d: logs30d.length,
      errorRate: logs30d.length > 0 ? Math.round((errorCount / logs30d.length) * 1000) / 10 : 0,
      avgResponseMs: 0,
      byEndpoint,
      byDay,
    }
  },
}
