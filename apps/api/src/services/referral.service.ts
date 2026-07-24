import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

function generateReferralCode(length = 8): string {
  return Math.random().toString(36).substring(2, 2 + length).toUpperCase()
}

export class ReferralService {
  async getProgram(orgId: string) {
    return prisma.referralProgram.findFirst({ where: { organizationId: orgId, isActive: true } })
  }

  async upsertProgram(orgId: string, data: {
    name: string
    rewardType?: string
    rewardAmount: number
    referredReward?: number
    terms?: string
  }) {
    const existing = await prisma.referralProgram.findFirst({ where: { organizationId: orgId } })
    if (existing) {
      return prisma.referralProgram.update({ where: { id: existing.id }, data })
    }
    return prisma.referralProgram.create({ data: { organizationId: orgId, ...data } })
  }

  async createReferral(orgId: string, referrerContactId: string) {
    const program = await this.getProgram(orgId)
    if (!program) throw new Error('No active referral program')

    let code = generateReferralCode()
    while (await prisma.referral.findFirst({ where: { referralCode: code } })) {
      code = generateReferralCode()
    }

    return prisma.referral.create({
      data: {
        organizationId: orgId,
        programId: program.id,
        referrerContactId,
        referralCode: code,
      },
    })
  }

  async convertReferral(orgId: string, code: string, referredContactId: string) {
    const referral = await prisma.referral.findFirst({ where: { referralCode: code, organizationId: orgId } })
    if (!referral) throw new Error('Invalid referral code')
    if (referral.status !== 'PENDING') throw new Error('Referral already used')

    return prisma.referral.update({
      where: { id: referral.id },
      data: { referredContactId, status: 'CONVERTED', convertedAt: new Date() },
    })
  }

  async markRewardPaid(orgId: string, referralId: string) {
    return prisma.referral.updateMany({
      where: { id: referralId, organizationId: orgId },
      data: { rewardPaid: true, rewardPaidAt: new Date(), status: 'REWARDED' },
    })
  }

  async getReferrals(orgId: string, filters: { status?: string; referrerContactId?: string } = {}) {
    const where: any = { organizationId: orgId }
    if (filters.status) where.status = filters.status
    if (filters.referrerContactId) where.referrerContactId = filters.referrerContactId

    return prisma.referral.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async getStats(orgId: string) {
    const [pending, converted, rewarded] = await Promise.all([
      prisma.referral.count({ where: { organizationId: orgId, status: 'PENDING' } }),
      prisma.referral.count({ where: { organizationId: orgId, status: 'CONVERTED' } }),
      prisma.referral.count({ where: { organizationId: orgId, rewardPaid: true } }),
    ])
    return { pending, converted, rewarded, total: pending + converted + rewarded }
  }

  async getReferralsByContact(orgId: string, contactId: string) {
    return prisma.referral.findMany({
      where: { organizationId: orgId, referrerContactId: contactId },
      orderBy: { createdAt: 'desc' },
    })
  }
}

export const referralService = new ReferralService()
