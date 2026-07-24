import { prisma } from './database.js'

function generateCode(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = ''
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % 4 === 0) code += '-'
    code += chars[Math.floor(Math.random() * chars.length)]
  }
  return code
}

export class GiftCardService {
  async issueGiftCard(orgId: string, data: {
    amount: number
    purchasedByContactId?: string
    expiresAt?: Date
    notes?: string
  }) {
    let code = generateCode()
    while (await prisma.giftCard.findFirst({ where: { code } })) {
      code = generateCode()
    }

    return prisma.giftCard.create({
      data: {
        organizationId: orgId,
        code,
        originalAmount: data.amount,
        balance: data.amount,
        purchasedByContactId: data.purchasedByContactId,
        expiresAt: data.expiresAt,
        notes: data.notes,
      },
    })
  }

  async lookupByCode(orgId: string, code: string) {
    return prisma.giftCard.findFirst({
      where: { organizationId: orgId, code: code.toUpperCase().replace(/\s/g, '') },
    })
  }

  async redeemGiftCard(orgId: string, code: string, amount: number, invoiceId?: string): Promise<{ success: boolean; remaining: number }> {
    const card = await this.lookupByCode(orgId, code)
    if (!card) throw new Error('Gift card not found')
    if (card.status !== 'ACTIVE') throw new Error(`Gift card is ${card.status.toLowerCase()}`)
    if (card.expiresAt && card.expiresAt < new Date()) throw new Error('Gift card has expired')

    const redeemAmount = Math.min(amount, Number(card.balance))
    const newBalance = Number(card.balance) - redeemAmount

    const redemptions = (card.redemptions as any[]).concat({
      amount: redeemAmount,
      invoiceId,
      redeemedAt: new Date().toISOString(),
    })

    await prisma.giftCard.update({
      where: { id: card.id },
      data: {
        balance: newBalance,
        status: newBalance <= 0 ? 'REDEEMED' : 'ACTIVE',
        redemptions,
      },
    })

    return { success: true, remaining: newBalance }
  }

  async getCards(orgId: string, filters: { status?: string; page?: number; limit?: number } = {}) {
    const { status, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where: any = { organizationId: orgId }
    if (status) where.status = status

    const [cards, total] = await Promise.all([
      prisma.giftCard.findMany({ where, orderBy: { createdAt: 'desc' }, skip, take: limit }),
      prisma.giftCard.count({ where }),
    ])
    return { cards, total, page, limit }
  }

  async voidCard(orgId: string, id: string) {
    return prisma.giftCard.updateMany({
      where: { id, organizationId: orgId },
      data: { status: 'VOIDED' },
    })
  }

  async getStats(orgId: string) {
    const [active, totalIssued, totalRedeemed] = await Promise.all([
      prisma.giftCard.count({ where: { organizationId: orgId, status: 'ACTIVE' } }),
      prisma.giftCard.aggregate({ where: { organizationId: orgId }, _sum: { originalAmount: true }, _count: true }),
      prisma.giftCard.aggregate({
        where: { organizationId: orgId },
        _sum: { originalAmount: true },
        _count: { _all: true },
      }),
    ])

    const activeBalanceAgg = await prisma.giftCard.aggregate({
      where: { organizationId: orgId, status: 'ACTIVE' },
      _sum: { balance: true },
    })

    return {
      activeCount: active,
      totalIssued: Number(totalIssued._sum.originalAmount ?? 0),
      totalCards: totalIssued._count,
      outstandingBalance: Number(activeBalanceAgg._sum.balance ?? 0),
    }
  }
}

export const giftCardService = new GiftCardService()
