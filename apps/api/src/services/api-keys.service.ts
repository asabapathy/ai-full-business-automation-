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
}
