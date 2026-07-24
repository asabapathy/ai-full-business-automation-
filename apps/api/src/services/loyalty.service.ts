import { prisma } from './database.js'

const TIER_THRESHOLDS = { bronze: 0, silver: 500, gold: 1500, platinum: 5000 }

function getTier(lifetimePoints: number): string {
  if (lifetimePoints >= TIER_THRESHOLDS.platinum) return 'platinum'
  if (lifetimePoints >= TIER_THRESHOLDS.gold) return 'gold'
  if (lifetimePoints >= TIER_THRESHOLDS.silver) return 'silver'
  return 'bronze'
}

export class LoyaltyService {
  async getAccount(orgId: string, contactId: string) {
    return prisma.loyaltyAccount.findFirst({ where: { organizationId: orgId, contactId } })
  }

  async getOrCreateAccount(orgId: string, contactId: string) {
    const existing = await prisma.loyaltyAccount.findFirst({ where: { organizationId: orgId, contactId } })
    if (existing) return existing
    return prisma.loyaltyAccount.create({
      data: { organizationId: orgId, contactId, points: 0, lifetimePoints: 0, tier: 'bronze' },
    })
  }

  async addPoints(orgId: string, contactId: string, points: number, description: string, referenceId?: string) {
    const account = await this.getOrCreateAccount(orgId, contactId)
    const newPoints = account.points + points
    const newLifetime = account.lifetimePoints + points
    const newTier = getTier(newLifetime)

    const [updated] = await Promise.all([
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: newPoints, lifetimePoints: newLifetime, tier: newTier },
      }),
      prisma.loyaltyTransaction.create({
        data: { accountId: account.id, points, type: 'EARN', description, referenceId },
      }),
    ])
    return updated
  }

  async redeemPoints(orgId: string, contactId: string, points: number, description: string) {
    const account = await prisma.loyaltyAccount.findFirst({ where: { organizationId: orgId, contactId } })
    if (!account) throw new Error('No loyalty account found')
    if (account.points < points) throw new Error('Insufficient points')

    const [updated] = await Promise.all([
      prisma.loyaltyAccount.update({
        where: { id: account.id },
        data: { points: account.points - points },
      }),
      prisma.loyaltyTransaction.create({
        data: { accountId: account.id, points: -points, type: 'REDEEM', description },
      }),
    ])
    return updated
  }

  async getTransactions(orgId: string, contactId: string, limit = 20) {
    const account = await prisma.loyaltyAccount.findFirst({ where: { organizationId: orgId, contactId } })
    if (!account) return []
    return prisma.loyaltyTransaction.findMany({
      where: { accountId: account.id },
      orderBy: { createdAt: 'desc' },
      take: limit,
    })
  }

  async getLeaderboard(orgId: string, limit = 10) {
    return prisma.loyaltyAccount.findMany({
      where: { organizationId: orgId },
      orderBy: { lifetimePoints: 'desc' },
      take: limit,
    })
  }

  async getStats(orgId: string) {
    const [totalAccounts, tierCounts, totalPointsAgg] = await Promise.all([
      prisma.loyaltyAccount.count({ where: { organizationId: orgId } }),
      prisma.loyaltyAccount.groupBy({
        by: ['tier'],
        where: { organizationId: orgId },
        _count: true,
      }),
      prisma.loyaltyAccount.aggregate({
        where: { organizationId: orgId },
        _sum: { points: true, lifetimePoints: true },
      }),
    ])
    return {
      totalAccounts,
      tierBreakdown: Object.fromEntries(tierCounts.map(t => [t.tier, t._count])),
      totalActivePoints: Number(totalPointsAgg._sum.points ?? 0),
      totalLifetimePoints: Number(totalPointsAgg._sum.lifetimePoints ?? 0),
    }
  }

  async getAllAccounts(orgId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const [accounts, total] = await Promise.all([
      prisma.loyaltyAccount.findMany({
        where: { organizationId: orgId },
        orderBy: { lifetimePoints: 'desc' },
        skip,
        take: limit,
      }),
      prisma.loyaltyAccount.count({ where: { organizationId: orgId } }),
    ])
    return { accounts, total, page, limit }
  }
}

export const loyaltyService = new LoyaltyService()
