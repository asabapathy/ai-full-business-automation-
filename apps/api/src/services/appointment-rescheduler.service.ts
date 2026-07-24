import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class AppointmentReschedulerService {
  async handleCancellation(appointmentId: string): Promise<{ rescheduled: boolean; newSlot?: { start: Date; end: Date } }> {
    const appt = await prisma.appointment.findUnique({
      where: { id: appointmentId },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        service: { select: { id: true, name: true, duration: true } },
        organization: { select: { id: true, name: true } },
      },
    })
    if (!appt || !appt.contact || !appt.service) return { rescheduled: false }

    // Find next available slot within 7 days
    const slot = await this.findNextAvailableSlot(appt.organizationId, appt.serviceId!, appt.startTime)
    if (!slot) return { rescheduled: false }

    // Generate personalized message
    const org = appt.organization
    const contact = appt.contact
    const fmtDate = new Date(slot.start).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    const fmtTime = new Date(slot.start).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

    let messageBody: string
    try {
      const ai = await aiService.chat(appt.organizationId, undefined, {
        message: `Write a brief, friendly SMS (under 160 chars) to ${contact.firstName} letting them know their ${appt.service?.name ?? 'appointment'} was cancelled and offering to rebook on ${fmtDate} at ${fmtTime}. End with "Reply YES to confirm."`,
      })
      messageBody = ai.content.slice(0, 300)
    } catch {
      messageBody = `Hi ${contact.firstName}, your ${appt.service?.name ?? 'appointment'} was cancelled. Next available: ${fmtDate} at ${fmtTime}. Reply YES to confirm rebooking.`
    }

    // Store reschedule offer in metadata
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        metadata: {
          rescheduleOffer: {
            newStart: slot.start.toISOString(),
            newEnd: slot.end.toISOString(),
            offeredAt: new Date().toISOString(),
            message: messageBody,
          },
        },
      },
    })

    // Send SMS if phone available
    if (contact.phone) {
      await this.sendSms(contact.phone, messageBody).catch(() => {})
    }

    // Send email if email available
    if (contact.email) {
      await this.sendRescheduleEmail(contact.email, contact.firstName, org.name, appt.service?.name ?? 'appointment', fmtDate, fmtTime, appointmentId).catch(() => {})
    }

    logger.info({ appointmentId, newSlot: slot.start }, 'Reschedule offer sent')
    return { rescheduled: true, newSlot: slot }
  }

  async confirmReschedule(appointmentId: string): Promise<{ success: boolean; newAppointmentId?: string }> {
    const appt = await prisma.appointment.findUnique({ where: { id: appointmentId } })
    if (!appt) return { success: false }

    const offer = (appt.metadata as any)?.rescheduleOffer as { newStart: string; newEnd: string } | undefined
    if (!offer) return { success: false }

    const newAppt = await prisma.appointment.create({
      data: {
        organizationId: appt.organizationId,
        contactId: appt.contactId,
        employeeId: appt.employeeId,
        serviceId: appt.serviceId,
        title: appt.title,
        duration: appt.duration,
        startTime: new Date(offer.newStart),
        endTime: new Date(offer.newEnd),
        status: 'CONFIRMED',
        metadata: { rescheduledFrom: appointmentId },
      },
    })

    return { success: true, newAppointmentId: newAppt.id }
  }

  private async findNextAvailableSlot(orgId: string, serviceId: string, after: Date): Promise<{ start: Date; end: Date } | null> {
    const service = await prisma.service.findUnique({ where: { id: serviceId } })
    if (!service) return null
    const duration = service.duration

    // Search up to 7 days ahead
    for (let dayOffset = 1; dayOffset <= 7; dayOffset++) {
      const date = new Date(after)
      date.setDate(date.getDate() + dayOffset)
      date.setHours(8, 0, 0, 0)

      const dayEnd = new Date(date)
      dayEnd.setHours(18, 0, 0, 0)

      const existing = await prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          startTime: { gte: date, lt: dayEnd },
          status: { in: ['SCHEDULED', 'CONFIRMED'] },
        },
        orderBy: { startTime: 'asc' },
      })

      let cursor = new Date(date)
      for (const ex of existing) {
        if (new Date(ex.startTime).getTime() - cursor.getTime() >= duration * 60_000) {
          return { start: new Date(cursor), end: new Date(cursor.getTime() + duration * 60_000) }
        }
        if (new Date(ex.endTime) > cursor) cursor = new Date(ex.endTime)
      }

      if (dayEnd.getTime() - cursor.getTime() >= duration * 60_000) {
        return { start: new Date(cursor), end: new Date(cursor.getTime() + duration * 60_000) }
      }
    }
    return null
  }

  private async sendSms(to: string, body: string): Promise<void> {
    const accountSid = process.env['TWILIO_ACCOUNT_SID']
    const authToken = process.env['TWILIO_AUTH_TOKEN']
    const from = process.env['TWILIO_PHONE_NUMBER']
    if (!accountSid || !authToken || !from) return

    await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    })
  }

  private async sendRescheduleEmail(to: string, name: string, businessName: string, serviceName: string, date: string, time: string, appointmentId: string): Promise<void> {
    const apiBase = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'
    const html = `<div style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:24px">
<h2>Hi ${name},</h2>
<p>We're sorry to inform you that your <strong>${serviceName}</strong> appointment was cancelled.</p>
<p>We have a new slot available:</p>
<div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin:16px 0">
  <strong>${date} at ${time}</strong>
</div>
<a href="${apiBase}/reschedule/${appointmentId}/confirm-email" style="display:inline-block;background:#6366f1;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Confirm Rebooking</a>
<p style="color:#64748b;font-size:14px;margin-top:24px">Powered by ${businessName}</p>
</div>`

    try {
      const { EmailService } = await import('@kanavu/integrations')
      const emailSvc = EmailService.fromEnv() as { sendRaw?: (o: { to: string; subject: string; html: string }) => Promise<void> }
      await emailSvc.sendRaw?.({ to, subject: `Reschedule your ${serviceName} appointment`, html })
    } catch {}
  }
}

export const appointmentReschedulerService = new AppointmentReschedulerService()
