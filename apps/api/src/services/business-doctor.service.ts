import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

interface HealthMetric {
  category: string
  score: number
  status: 'healthy' | 'warning' | 'critical'
  insight: string
  recommendation: string
}

interface DiagnosticReport {
  overallScore: number
  status: 'healthy' | 'warning' | 'critical'
  summary: string
  metrics: HealthMetric[]
  topRecommendations: string[]
  generatedAt: string
}

export class BusinessDoctorService {
  async runDiagnostic(organizationId: string): Promise<DiagnosticReport> {
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 86400000)

    const [
      revenueData,
      invoiceData,
      contactData,
      dealData,
      appointmentData,
      reviewData,
      callData,
    ] = await Promise.all([
      prisma.invoice.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo }, status: 'PAID' as never },
        select: { totalAmount: true },
      }),
      prisma.invoice.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        select: { status: true },
      }),
      prisma.contact.findMany({
        where: { organizationId },
        select: { createdAt: true, leadStatus: true as never },
      }),
      prisma.deal.findMany({
        where: { organizationId, updatedAt: { gte: thirtyDaysAgo } },
        select: { stage: true, value: true, closedAt: true },
      }),
      prisma.appointment.findMany({
        where: { organizationId, startTime: { gte: thirtyDaysAgo } },
        select: { status: true },
      }),
      prisma.review.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        select: { rating: true, sentiment: true },
      }),
      prisma.callLog.findMany({
        where: { organizationId, createdAt: { gte: thirtyDaysAgo } },
        select: { status: true, direction: true },
      }).catch(() => []),
    ])

    const metrics: HealthMetric[] = []

    // Revenue health
    const totalRevenue = revenueData.reduce((sum, i) => sum + Number(i.totalAmount), 0)
    const paidCount = invoiceData.filter(i => i.status === 'PAID').length
    const overdueCount = invoiceData.filter(i => i.status === 'OVERDUE').length
    const collectionRate = invoiceData.length > 0 ? (paidCount / invoiceData.length) * 100 : 100
    const revenueScore = Math.min(100, Math.round(collectionRate * 0.7 + (totalRevenue > 10000 ? 30 : totalRevenue / 333)))
    metrics.push({
      category: 'Revenue & Collections',
      score: revenueScore,
      status: revenueScore >= 70 ? 'healthy' : revenueScore >= 50 ? 'warning' : 'critical',
      insight: `$${totalRevenue.toLocaleString()} collected in 30 days. ${overdueCount} overdue invoices.`,
      recommendation: overdueCount > 0
        ? `Send payment reminders to ${overdueCount} overdue invoice(s) immediately.`
        : 'Revenue collection is on track. Consider setting up automated payment reminders.',
    })

    // Lead pipeline health
    const newContacts = contactData.filter(c => c.createdAt >= thirtyDaysAgo).length
    const totalContacts = contactData.length
    const wonDeals = dealData.filter(d => d.stage === 'CLOSED_WON').length
    const totalDeals = dealData.length
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0
    const pipelineScore = Math.min(100, Math.round((newContacts > 0 ? 40 : 10) + conversionRate * 0.6))
    metrics.push({
      category: 'Lead Pipeline',
      score: pipelineScore,
      status: pipelineScore >= 70 ? 'healthy' : pipelineScore >= 40 ? 'warning' : 'critical',
      insight: `${newContacts} new contacts, ${wonDeals}/${totalDeals} deals won (${Math.round(conversionRate)}% conversion).`,
      recommendation: newContacts === 0
        ? 'No new leads this month. Activate marketing campaigns to generate leads.'
        : conversionRate < 20
        ? 'Low conversion rate. Review your sales process and follow-up sequences.'
        : 'Pipeline looks healthy. Keep nurturing leads consistently.',
    })

    // Appointment & booking health
    const completedAppts = appointmentData.filter(a => a.status === 'COMPLETED').length
    const noShowAppts = appointmentData.filter(a => a.status === 'NO_SHOW').length
    const totalAppts = appointmentData.length
    const noShowRate = totalAppts > 0 ? (noShowAppts / totalAppts) * 100 : 0
    const apptScore = Math.min(100, Math.round(Math.max(0, 100 - noShowRate * 2) * (totalAppts > 0 ? 1 : 0.5)))
    metrics.push({
      category: 'Appointments & Bookings',
      score: apptScore,
      status: apptScore >= 70 ? 'healthy' : apptScore >= 50 ? 'warning' : 'critical',
      insight: `${completedAppts} completed, ${noShowAppts} no-shows (${Math.round(noShowRate)}% no-show rate).`,
      recommendation: noShowRate > 20
        ? 'High no-show rate. Enable automated SMS reminders 24h before appointments.'
        : totalAppts === 0
        ? 'No appointments booked. Promote your online booking page.'
        : 'Appointment completion rate is good. Consider adding a follow-up sequence post-visit.',
    })

    // Reputation health
    const avgRating = reviewData.length > 0
      ? reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length
      : 0
    const positiveReviews = reviewData.filter(r => r.sentiment === 'POSITIVE').length
    const reputationScore = reviewData.length === 0
      ? 50
      : Math.min(100, Math.round((avgRating / 5) * 60 + (positiveReviews / reviewData.length) * 40))
    metrics.push({
      category: 'Reputation & Reviews',
      score: reputationScore,
      status: reputationScore >= 70 ? 'healthy' : reputationScore >= 50 ? 'warning' : 'critical',
      insight: reviewData.length > 0
        ? `${reviewData.length} reviews with ${avgRating.toFixed(1)}/5 average rating.`
        : 'No reviews collected this month.',
      recommendation: reviewData.length === 0
        ? 'Start sending review request emails after service completion to build reputation.'
        : avgRating < 4
        ? 'Average rating below 4. Respond to negative reviews and investigate service quality issues.'
        : 'Great reputation! Keep sending review requests after each positive interaction.',
    })

    // Communication health
    const missedCalls = (callData as Array<{ status: string; direction: string }>).filter(c => c.status === 'no-answer' && c.direction === 'inbound').length
    const totalInbound = (callData as Array<{ status: string; direction: string }>).filter(c => c.direction === 'inbound').length
    const missedCallRate = totalInbound > 0 ? (missedCalls / totalInbound) * 100 : 0
    const commScore = Math.min(100, Math.round(Math.max(0, 100 - missedCallRate * 1.5)))
    metrics.push({
      category: 'Communication & Response',
      score: commScore,
      status: commScore >= 70 ? 'healthy' : commScore >= 50 ? 'warning' : 'critical',
      insight: `${missedCalls} missed calls out of ${totalInbound} inbound (${Math.round(missedCallRate)}% miss rate).`,
      recommendation: missedCallRate > 30
        ? 'High call miss rate is losing leads. Enable AI Phone Receptionist to answer 24/7.'
        : 'Communication response rate looks good.',
    })

    const overallScore = Math.round(metrics.reduce((sum, m) => sum + m.score, 0) / metrics.length)
    const criticalCount = metrics.filter(m => m.status === 'critical').length
    const warningCount = metrics.filter(m => m.status === 'warning').length

    const overallStatus: 'healthy' | 'warning' | 'critical' =
      criticalCount > 0 ? 'critical' : warningCount > 1 ? 'warning' : 'healthy'

    const topRecommendations = metrics
      .filter(m => m.status !== 'healthy')
      .sort((a, b) => a.score - b.score)
      .slice(0, 3)
      .map(m => m.recommendation)

    const summary = overallStatus === 'healthy'
      ? 'Your business is performing well across all areas. Keep up the great work!'
      : overallStatus === 'warning'
      ? `${warningCount} area(s) need attention. Addressing these could significantly improve business performance.`
      : `${criticalCount} critical issue(s) detected. Immediate action recommended to prevent revenue loss.`

    return {
      overallScore,
      status: overallStatus,
      summary,
      metrics,
      topRecommendations,
      generatedAt: now.toISOString(),
    }
  }

  async getAiInsight(organizationId: string, question: string): Promise<string> {
    try {
      const diagnostic = await this.runDiagnostic(organizationId)
      const contextPrompt = `
Business Health Report:
- Overall Score: ${diagnostic.overallScore}/100 (${diagnostic.status})
- Summary: ${diagnostic.summary}
- Metrics:
${diagnostic.metrics.map(m => `  • ${m.category}: ${m.score}/100 — ${m.insight}`).join('\n')}
- Top Recommendations:
${diagnostic.topRecommendations.map((r, i) => `  ${i + 1}. ${r}`).join('\n')}

User question: "${question}"

Please provide a concise, actionable answer based on this business health data. Focus on practical steps the business owner can take.`

      const response = await aiService.chat(organizationId, undefined, { message: contextPrompt })
      return response.content
    } catch (err) {
      logger.error(err, 'AI insight error')
      throw new Error('Failed to generate AI insight')
    }
  }
}

export const businessDoctorService = new BusinessDoctorService()
