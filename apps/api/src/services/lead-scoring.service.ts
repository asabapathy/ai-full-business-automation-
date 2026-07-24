import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface ScoreSignals {
  hasEmail: number
  hasPhone: number
  dealCount: number
  appointmentCount: number
  invoiceCount: number
  totalRevenue: number
  reviewCount: number
  lastContactedDaysAgo: number | null
  emailEngagement: number
  type: string
}

function computeScore(signals: ScoreSignals): { score: number; grade: string } {
  let score = 0

  if (signals.hasEmail) score += 10
  if (signals.hasPhone) score += 5
  score += Math.min(signals.dealCount * 8, 20)
  score += Math.min(signals.appointmentCount * 5, 15)
  score += Math.min(signals.invoiceCount * 5, 15)
  score += Math.min(Math.floor(signals.totalRevenue / 100), 20)
  score += Math.min(signals.reviewCount * 3, 10)
  score += Math.min(signals.emailEngagement * 2, 10)

  if (signals.lastContactedDaysAgo !== null) {
    if (signals.lastContactedDaysAgo <= 7) score += 10
    else if (signals.lastContactedDaysAgo <= 30) score += 5
  }

  if (signals.type === 'CUSTOMER') score += 5

  score = Math.min(100, Math.max(0, score))

  const grade =
    score >= 80 ? 'A' :
    score >= 60 ? 'B' :
    score >= 40 ? 'C' :
    score >= 20 ? 'D' : 'F'

  return { score, grade }
}

export class LeadScoringService {
  async scoreContact(contactId: string): Promise<{ score: number; grade: string }> {
    const contact = await prisma.contact.findUnique({
      where: { id: contactId },
      include: {
        deals: { select: { id: true } },
        appointments: { select: { id: true } },
        invoices: { select: { id: true, total: true } },
      },
    })
    if (!contact) throw new Error('Contact not found')

    const now = new Date()
    const lastContactedDaysAgo = contact.lastContactedAt
      ? Math.floor((now.getTime() - contact.lastContactedAt.getTime()) / 86_400_000)
      : null

    const totalRevenue = contact.invoices.reduce((sum, inv) => sum + Number(inv.total), 0)

    const signals: ScoreSignals = {
      hasEmail: contact.email ? 1 : 0,
      hasPhone: contact.phone || contact.mobile ? 1 : 0,
      dealCount: contact.deals.length,
      appointmentCount: contact.appointments.length,
      invoiceCount: contact.invoices.length,
      totalRevenue,
      reviewCount: 0,
      lastContactedDaysAgo,
      emailEngagement: 0,
      type: contact.type,
    }

    const { score, grade } = computeScore(signals)

    await prisma.leadScore.upsert({
      where: { contactId },
      create: {
        organizationId: contact.organizationId,
        contactId,
        score,
        grade,
        signals,
        lastScoredAt: now,
      },
      update: { score, grade, signals, lastScoredAt: now },
    })

    await prisma.contact.update({ where: { id: contactId }, data: { score } })

    return { score, grade }
  }

  async scoreAllContacts(orgId: string): Promise<{ processed: number }> {
    const contacts = await prisma.contact.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true },
    })

    let processed = 0
    for (const c of contacts) {
      try {
        await this.scoreContact(c.id)
        processed++
      } catch {
        // continue
      }
    }

    logger.info({ orgId, processed }, 'Lead scoring complete')
    return { processed }
  }

  async getTopLeads(orgId: string, limit = 20) {
    return prisma.leadScore.findMany({
      where: { organizationId: orgId },
      orderBy: { score: 'desc' },
      take: limit,
      include: {
        contact: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true, type: true, status: true },
        },
      },
    })
  }

  async getContactScore(orgId: string, contactId: string) {
    return prisma.leadScore.findFirst({
      where: { organizationId: orgId, contactId },
    })
  }

  async getScoreDistribution(orgId: string) {
    const scores = await prisma.leadScore.findMany({
      where: { organizationId: orgId },
      select: { grade: true },
    })

    const dist: Record<string, number> = { A: 0, B: 0, C: 0, D: 0, F: 0 }
    for (const s of scores) {
      dist[s.grade] = (dist[s.grade] ?? 0) + 1
    }
    return dist
  }
}

export const leadScoringService = new LeadScoringService()
