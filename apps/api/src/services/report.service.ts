import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface ReportData {
  revenue30d: number
  newContacts30d: number
  appointments30d: number
  dealsWon30d: number
  avgReviewRating: number
  totalReviews: number
  topContacts: Array<{ name: string; revenue: number }>
  pipeline: Array<{ stage: string; count: number; value: number }>
}

export class ReportService {
  async generateBusinessReport(orgId: string): Promise<ReportData> {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 86_400_000)

    const [revenueAgg, newContacts, appointments, dealsWon, reviews, pipeline] = await Promise.all([
      prisma.invoice.aggregate({
        where: { organizationId: orgId, status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
        _sum: { total: true },
      }),
      prisma.contact.count({ where: { organizationId: orgId, createdAt: { gte: thirtyDaysAgo } } }),
      prisma.appointment.count({ where: { organizationId: orgId, startTime: { gte: thirtyDaysAgo } } }),
      prisma.deal.count({ where: { organizationId: orgId, status: 'WON', updatedAt: { gte: thirtyDaysAgo } } }),
      prisma.review.aggregate({
        where: { organizationId: orgId },
        _avg: { rating: true },
        _count: { id: true },
      }),
      prisma.deal.groupBy({
        by: ['stage'],
        where: { organizationId: orgId, status: { in: ['OPEN', 'IN_PROGRESS'] } },
        _count: { id: true },
        _sum: { value: true },
      }),
    ])

    const topInvoiceContacts = await prisma.invoice.groupBy({
      by: ['contactId'],
      where: { organizationId: orgId, status: 'PAID', paidAt: { gte: thirtyDaysAgo } },
      _sum: { total: true },
      orderBy: { _sum: { total: 'desc' } },
      take: 5,
    })

    const topContacts = await Promise.all(
      topInvoiceContacts.map(async r => {
        const c = r.contactId ? await prisma.contact.findUnique({ where: { id: r.contactId }, select: { firstName: true, lastName: true } }) : null
        return { name: c ? `${c.firstName} ${c.lastName ?? ''}`.trim() : 'Unknown', revenue: Number(r._sum.total ?? 0) }
      })
    )

    return {
      revenue30d: Number(revenueAgg._sum.total ?? 0),
      newContacts30d: newContacts,
      appointments30d: appointments,
      dealsWon30d: dealsWon,
      avgReviewRating: Math.round((reviews._avg.rating ?? 0) * 10) / 10,
      totalReviews: reviews._count.id,
      topContacts,
      pipeline: pipeline.map(p => ({ stage: p.stage, count: p._count.id, value: Number(p._sum.value ?? 0) })),
    }
  }

  buildHtmlReport(data: ReportData, orgName: string): string {
    const fmtCurrency = (n: number) => `$${n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    return `<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
body{font-family:sans-serif;color:#1e293b;max-width:700px;margin:0 auto;padding:24px;}
h1{color:#6366f1;font-size:24px;margin-bottom:4px;}
.subtitle{color:#64748b;font-size:14px;margin-bottom:32px;}
.grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:32px;}
.card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;}
.card .label{font-size:12px;color:#64748b;text-transform:uppercase;letter-spacing:.05em;}
.card .value{font-size:24px;font-weight:700;color:#0f172a;margin-top:4px;}
table{width:100%;border-collapse:collapse;margin-bottom:24px;}
th{text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;border-bottom:2px solid #e2e8f0;padding:8px 0;}
td{padding:8px 0;border-bottom:1px solid #f1f5f9;}
.footer{font-size:12px;color:#94a3b8;text-align:center;margin-top:32px;}
</style></head><body>
<h1>${orgName} — 30-Day Business Report</h1>
<p class="subtitle">Generated on ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</p>
<div class="grid">
  <div class="card"><div class="label">Revenue</div><div class="value">${fmtCurrency(data.revenue30d)}</div></div>
  <div class="card"><div class="label">New Contacts</div><div class="value">${data.newContacts30d}</div></div>
  <div class="card"><div class="label">Appointments</div><div class="value">${data.appointments30d}</div></div>
  <div class="card"><div class="label">Deals Won</div><div class="value">${data.dealsWon30d}</div></div>
  <div class="card"><div class="label">Avg Rating</div><div class="value">${data.avgReviewRating} ⭐</div></div>
  <div class="card"><div class="label">Total Reviews</div><div class="value">${data.totalReviews}</div></div>
</div>
<h2>Top Customers (by Revenue)</h2>
<table>
  <tr><th>Customer</th><th>Revenue</th></tr>
  ${data.topContacts.map(c => `<tr><td>${c.name}</td><td>${fmtCurrency(c.revenue)}</td></tr>`).join('')}
</table>
<h2>Sales Pipeline</h2>
<table>
  <tr><th>Stage</th><th>Deals</th><th>Value</th></tr>
  ${data.pipeline.map(p => `<tr><td>${p.stage}</td><td>${p.count}</td><td>${fmtCurrency(p.value)}</td></tr>`).join('')}
</table>
<div class="footer">Powered by Kanavu AI · kanavu.ai</div>
</body></html>`
  }

  async emailWeeklyReport(orgId: string): Promise<void> {
    const org = await prisma.organization.findUnique({ where: { id: orgId }, select: { name: true, email: true } })
    if (!org?.email) return

    const data = await this.generateBusinessReport(orgId)
    const html = this.buildHtmlReport(data, org.name)

    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv() as { sendRaw?: (opts: { to: string; subject: string; html: string }) => Promise<void> }
      if (emailSvc.sendRaw) {
        await emailSvc.sendRaw({ to: org.email, subject: `${org.name} — Weekly Business Report`, html })
      }
    } catch {
      logger.warn({ orgId }, 'Email service unavailable; report generated but not sent')
    }

    logger.info({ orgId }, 'Weekly report emailed')
  }
}

export const reportService = new ReportService()
