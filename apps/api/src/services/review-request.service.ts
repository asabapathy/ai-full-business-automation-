import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

const SENTIMENT_GATE = 4 // ratings < 4 go to internal form, >= 4 go to public review

export class ReviewRequestService {
  async triggerAfterAppointment(appointmentId: string): Promise<void> {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        contact: { select: { id: true, firstName: true, email: true, phone: true } },
        service: { select: { name: true } },
        organization: { select: { id: true, name: true, slug: true } },
      },
    })
    if (!appt?.contact) return

    const org = appt.organization
    const contact = appt.contact

    const reviewReq = await prisma.reviewRequest.create({
      data: {
        organizationId: org.id,
        contactId: contact.id,
        appointmentId,
        channel: contact.email ? 'email' : 'sms',
        sentAt: new Date(),
      },
    })

    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    const reviewUrl = `${webBase}/review/${reviewReq.token}`

    await prisma.reviewRequest.update({ where: { id: reviewReq.id }, data: { reviewUrl } })

    if (contact.email) {
      await this.sendReviewEmail(contact.email, contact.firstName, org.name, appt.service?.name ?? 'appointment', reviewUrl).catch(() => {})
    }

    logger.info({ appointmentId, contactId: contact.id }, 'Review request sent')
  }

  async submitInternalFeedback(token: string, rating: number, note?: string): Promise<{ redirectUrl: string | null }> {
    const req = await prisma.reviewRequest.findUnique({ where: { token } })
    if (!req) throw new Error('Invalid token')

    await prisma.reviewRequest.update({
      where: { id: req.id },
      data: { internalRating: rating, internalNote: note, respondedAt: new Date(), status: 'responded' },
    })

    if (rating >= SENTIMENT_GATE) {
      const org = await prisma.organization.findUnique({
        where: { id: req.organizationId },
        select: { settings: true },
      })
      const settings = (org?.settings as any) ?? {}
      const googleUrl = settings.googleReviewUrl as string | undefined
      const yelpUrl = settings.yelpUrl as string | undefined
      return { redirectUrl: googleUrl ?? yelpUrl ?? null }
    }

    return { redirectUrl: null }
  }

  async getRequests(orgId: string, status?: string) {
    return prisma.reviewRequest.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: { contact: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 100,
    })
  }

  async getStats(orgId: string) {
    const [total, responded, positive] = await Promise.all([
      prisma.reviewRequest.count({ where: { organizationId: orgId } }),
      prisma.reviewRequest.count({ where: { organizationId: orgId, status: 'responded' } }),
      prisma.reviewRequest.count({ where: { organizationId: orgId, internalRating: { gte: SENTIMENT_GATE } } }),
    ])

    const avgRating = await prisma.reviewRequest.aggregate({
      where: { organizationId: orgId, internalRating: { not: null } },
      _avg: { internalRating: true },
    })

    return {
      total,
      responded,
      positive,
      responseRate: total > 0 ? Math.round(responded / total * 100) : 0,
      avgRating: Math.round((avgRating._avg.internalRating ?? 0) * 10) / 10,
    }
  }

  private async sendReviewEmail(to: string, name: string, businessName: string, serviceName: string, url: string): Promise<void> {
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2>Hi ${name}, how was your experience?</h2>
<p>Thank you for choosing <strong>${businessName}</strong> for your ${serviceName}. Your feedback means the world to us!</p>
<a href="${url}" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;margin:16px 0">Leave a Review</a>
<p style="color:#64748b;font-size:14px">It only takes 30 seconds.</p>
</div>`

    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv() as { sendRaw?: (o: { to: string; subject: string; html: string }) => Promise<void> }
      await emailSvc.sendRaw?.({ to, subject: `How was your ${serviceName}? — ${businessName}`, html })
    } catch {}
  }
}

export const reviewRequestService = new ReviewRequestService()
