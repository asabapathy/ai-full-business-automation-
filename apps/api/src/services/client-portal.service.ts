import crypto from 'crypto'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

const SESSION_TTL_DAYS = 30
const OTP_TTL_MINUTES = 15

export class ClientPortalService {
  async sendOtp(orgId: string, email: string): Promise<{ sent: boolean }> {
    const contact = await prisma.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true, firstName: true, email: true },
    })
    if (!contact) return { sent: false }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const otpExpiry = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000)

    await prisma.portalSession.create({
      data: {
        organizationId: orgId,
        contactId: contact.id,
        otpCode: otp,
        otpExpiresAt: otpExpiry,
        expiresAt: new Date(Date.now() + SESSION_TTL_DAYS * 86400 * 1000),
      },
    })

    try {
      const org = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true },
      })

      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv()
      await emailSvc.sendRaw?.({
        to: email,
        subject: `Your login code for ${org?.name ?? 'the client portal'}`,
        html: `
          <div style="font-family:sans-serif;max-width:400px;margin:auto">
            <h2>Your one-time code</h2>
            <p>Hi ${contact.firstName},</p>
            <div style="font-size:32px;font-weight:bold;letter-spacing:8px;padding:20px;background:#f3f4f6;border-radius:8px;text-align:center">${otp}</div>
            <p style="color:#6b7280">This code expires in ${OTP_TTL_MINUTES} minutes.</p>
          </div>
        `,
      })
    } catch (err) {
      logger.error(err, 'Failed to send OTP email')
    }

    return { sent: true }
  }

  async verifyOtp(orgId: string, email: string, otp: string): Promise<{ token: string } | null> {
    const contact = await prisma.contact.findFirst({
      where: { organizationId: orgId, email },
      select: { id: true },
    })
    if (!contact) return null

    const session = await prisma.portalSession.findFirst({
      where: {
        organizationId: orgId,
        contactId: contact.id,
        otpCode: otp,
        otpExpiresAt: { gt: new Date() },
        verifiedAt: null,
      },
      orderBy: { createdAt: 'desc' },
    })
    if (!session) return null

    await prisma.portalSession.update({
      where: { id: session.id },
      data: { verifiedAt: new Date(), otpCode: null },
    })

    return { token: session.token }
  }

  async verifySession(token: string) {
    const session = await prisma.portalSession.findUnique({
      where: { token },
      include: {
        organization: { select: { id: true, name: true, logoUrl: true } },
      },
    })
    if (!session || session.expiresAt < new Date() || !session.verifiedAt) return null

    const contact = await prisma.contact.findUnique({
      where: { id: session.contactId },
      select: { id: true, firstName: true, lastName: true, email: true, phone: true },
    })
    if (!contact) return null

    return { contact, organization: session.organization }
  }

  async getPortalAppointments(orgId: string, contactId: string) {
    return prisma.appointment.findMany({
      where: { organizationId: orgId, contactId },
      orderBy: { startTime: 'desc' },
      include: {
        service: { select: { name: true } },
        employee: { select: { firstName: true, lastName: true } },
      },
      take: 20,
    })
  }

  async getPortalInvoices(orgId: string, contactId: string) {
    return prisma.invoice.findMany({
      where: { organizationId: orgId, contactId },
      orderBy: { createdAt: 'desc' },
      take: 20,
    })
  }

  async getPortalProfile(orgId: string, contactId: string) {
    return prisma.contact.findFirst({
      where: { id: contactId, organizationId: orgId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        avatarUrl: true,
        createdAt: true,
      },
    })
  }
}

export const clientPortalService = new ClientPortalService()
