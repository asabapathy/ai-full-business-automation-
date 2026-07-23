import jwt from 'jsonwebtoken'
import { config } from '../config/index.js'
import { prisma } from './database.js'

export interface PortalToken {
  type: 'portal'
  organizationId: string
  resourceType: 'invoice' | 'appointment'
  resourceId: string
  exp: number
}

export class PortalService {
  generatePortalToken(organizationId: string, resourceType: 'invoice' | 'appointment', resourceId: string): string {
    return jwt.sign(
      { type: 'portal', organizationId, resourceType, resourceId },
      config.JWT_SECRET,
      { expiresIn: '30d' },
    )
  }

  verifyPortalToken(token: string): PortalToken | null {
    try {
      const payload = jwt.verify(token, config.JWT_SECRET) as PortalToken
      return payload.type === 'portal' ? payload : null
    } catch {
      return null
    }
  }

  async getOrgBySlug(slug: string) {
    return prisma.organization.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        phone: true,
        email: true,
        website: true,
        industry: true,
        businessHours: true,
      },
    })
  }

  async getPublicInvoice(organizationId: string, invoiceId: string) {
    const invoice = await prisma.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      include: {
        contact: { select: { firstName: true, lastName: true, email: true } },
      },
    })
    if (!invoice) return null

    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, logoUrl: true, email: true, phone: true },
    })

    return { invoice, org }
  }

  async getPublicServices(organizationId: string) {
    return prisma.service.findMany({
      where: { organizationId, isActive: true },
      select: { id: true, name: true, description: true, duration: true, price: true, category: true, color: true },
      orderBy: { name: 'asc' },
    })
  }

  async getAvailableSlots(organizationId: string, serviceId: string, date: string) {
    const service = await prisma.service.findFirst({ where: { id: serviceId, organizationId } })
    if (!service) return []

    const dayStart = new Date(date)
    dayStart.setHours(8, 0, 0, 0)
    const dayEnd = new Date(date)
    dayEnd.setHours(18, 0, 0, 0)

    const existing = await prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { gte: dayStart, lte: dayEnd },
        status: { notIn: ['CANCELED', 'NO_SHOW'] as never[] },
      },
      select: { startTime: true, endTime: true },
    })

    const slots: { start: string; end: string }[] = []
    const duration = service.duration // minutes
    let cursor = new Date(dayStart)

    while (cursor < dayEnd) {
      const slotEnd = new Date(cursor.getTime() + duration * 60000)
      if (slotEnd > dayEnd) break

      const conflict = existing.some(
        appt => cursor < appt.endTime && slotEnd > appt.startTime,
      )

      if (!conflict) {
        slots.push({ start: cursor.toISOString(), end: slotEnd.toISOString() })
      }

      cursor = new Date(cursor.getTime() + 30 * 60000) // 30-min intervals
    }

    return slots
  }

  async bookAppointment(organizationId: string, data: {
    serviceId: string
    startTime: string
    firstName: string
    lastName: string
    email: string
    phone?: string
    notes?: string
  }) {
    const service = await prisma.service.findFirst({ where: { id: data.serviceId, organizationId } })
    if (!service) throw new Error('Service not found')

    let contact = await prisma.contact.findFirst({
      where: { organizationId, email: data.email },
    })

    if (!contact) {
      contact = await prisma.contact.create({
        data: {
          organizationId,
          firstName: data.firstName,
          lastName: data.lastName,
          email: data.email,
          phone: data.phone,
          type: 'LEAD',
          status: 'NEW',
        },
      })
    }

    const startTime = new Date(data.startTime)
    const endTime = new Date(startTime.getTime() + service.duration * 60000)

    const appointment = await prisma.appointment.create({
      data: {
        organizationId,
        contactId: contact.id,
        serviceId: service.id,
        title: `${service.name} — ${data.firstName} ${data.lastName}`,
        startTime,
        endTime,
        duration: service.duration,
        notes: data.notes,
        status: 'SCHEDULED',
        metadata: { bookedViaPortal: true },
      },
    })

    // Send confirmation email if configured
    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv()
      const org = await prisma.organization.findUnique({
        where: { id: organizationId },
        select: { name: true },
      })
      await emailSvc.sendAppointmentConfirmation(data.email, {
        contactName: `${data.firstName} ${data.lastName}`,
        businessName: org?.name ?? 'the business',
        serviceName: service.name,
        appointmentTime: startTime.toLocaleString(),
        duration: service.duration,
        location: '',
      })
    } catch {}

    return appointment
  }

  async getInvoicePaymentStatus(invoiceId: string) {
    return prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { status: true, amountPaid: true, total: true },
    })
  }
}

export const portalService = new PortalService()
