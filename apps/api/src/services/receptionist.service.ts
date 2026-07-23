import { AIProviderFactory, ReceptionistAgent } from '@kanavu/ai-core'
import type { AgentContext } from '@kanavu/types'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface CreateAppointmentRequest {
  contactId?: string
  serviceId?: string
  employeeId?: string
  title: string
  startTime: string
  duration: number
  notes?: string
  sendConfirmation?: boolean
}

interface BookingRequest {
  contactName: string
  contactEmail?: string
  contactPhone?: string
  serviceType: string
  preferredDate?: string
  preferredTime?: string
  notes?: string
}

export class ReceptionistService {
  private provider = AIProviderFactory.createFromEnv()

  private buildContext(organizationId: string, orgData: { name: string; industry: string }): AgentContext {
    return {
      organizationId,
      agentType: 'receptionist',
      businessContext: { name: orgData.name, industry: orgData.industry },
    }
  }

  async getAppointments(organizationId: string, filters: { status?: string; date?: string; employeeId?: string; page?: number; limit?: number }) {
    const { status, date, employeeId, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const dateFilter = date
      ? { startTime: { gte: new Date(date), lt: new Date(new Date(date).setDate(new Date(date).getDate() + 1)) } }
      : {}

    const where = {
      organizationId,
      ...(status ? { status: status as never } : {}),
      ...(employeeId ? { employeeId } : {}),
      ...dateFilter,
    }

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where,
        include: {
          contact: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          service: { select: { id: true, name: true, price: true } },
          employee: { select: { id: true, firstName: true, lastName: true } },
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
      }),
      prisma.appointment.count({ where }),
    ])

    return { appointments, total, page, limit }
  }

  async createAppointment(organizationId: string, data: CreateAppointmentRequest) {
    const endTime = new Date(data.startTime)
    endTime.setMinutes(endTime.getMinutes() + data.duration)

    return prisma.appointment.create({
      data: {
        organizationId,
        contactId: data.contactId,
        serviceId: data.serviceId,
        employeeId: data.employeeId,
        title: data.title,
        startTime: new Date(data.startTime),
        endTime,
        duration: data.duration,
        notes: data.notes,
        status: 'SCHEDULED',
        confirmationSentAt: data.sendConfirmation ? new Date() : null,
      },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, email: true } },
        service: { select: { id: true, name: true } },
      },
    })
  }

  async updateAppointmentStatus(organizationId: string, appointmentId: string, status: string) {
    const appointment = await prisma.appointment.findFirst({ where: { id: appointmentId, organizationId } })
    if (!appointment) throw new Error('Appointment not found')

    return prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: status as never },
    })
  }

  async handleAiBooking(organizationId: string, request: BookingRequest) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const context = this.buildContext(organizationId, org)
    const agent = new ReceptionistAgent({ provider: this.provider }, context)

    const response = await agent.run(
      `New booking request from ${request.contactName} (${request.contactEmail ?? request.contactPhone ?? 'no contact info'}). Service: ${request.serviceType}. Preferred: ${request.preferredDate ?? 'flexible'} at ${request.preferredTime ?? 'any time'}. Notes: ${request.notes ?? 'none'}. Check availability and suggest 3 time slots.`
    )

    return { response: response.content, actions: response.actions }
  }

  async getAvailableSlots(organizationId: string, filters: { date?: string; serviceId?: string; employeeId?: string }) {
    const date = filters.date ? new Date(filters.date) : new Date()
    const startOfDay = new Date(date)
    startOfDay.setHours(8, 0, 0, 0)
    const endOfDay = new Date(date)
    endOfDay.setHours(18, 0, 0, 0)

    const existingAppointments = await prisma.appointment.findMany({
      where: {
        organizationId,
        startTime: { gte: startOfDay, lt: endOfDay },
        status: { notIn: ['CANCELED', 'NO_SHOW'] as never[] },
        ...(filters.employeeId ? { employeeId: filters.employeeId } : {}),
      },
      orderBy: { startTime: 'asc' },
    })

    const slots = []
    const current = new Date(startOfDay)

    while (current < endOfDay) {
      const slotEnd = new Date(current)
      slotEnd.setMinutes(slotEnd.getMinutes() + 60)

      const isBooked = existingAppointments.some(apt =>
        (apt.startTime <= current && apt.endTime > current) ||
        (apt.startTime < slotEnd && apt.endTime >= slotEnd)
      )

      slots.push({ startTime: new Date(current).toISOString(), endTime: slotEnd.toISOString(), available: !isBooked })
      current.setMinutes(current.getMinutes() + 60)
    }

    return { date: date.toISOString().split('T')[0], slots }
  }

  async getServices(organizationId: string) {
    return prisma.service.findMany({ where: { organizationId, isActive: true }, orderBy: { name: 'asc' } })
  }

  async getAnalytics(organizationId: string) {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const [total, completed, cancelled, byStatus] = await Promise.all([
      prisma.appointment.count({ where: { organizationId, startTime: { gte: thirtyDaysAgo } } }),
      prisma.appointment.count({ where: { organizationId, status: 'COMPLETED' as never, startTime: { gte: thirtyDaysAgo } } }),
      prisma.appointment.count({ where: { organizationId, status: 'CANCELED' as never, startTime: { gte: thirtyDaysAgo } } }),
      prisma.appointment.groupBy({
        by: ['status'],
        where: { organizationId, startTime: { gte: thirtyDaysAgo } },
        _count: true,
      }),
    ])

    return {
      period: '30 days',
      totalAppointments: total,
      completedAppointments: completed,
      cancelledAppointments: cancelled,
      showRate: total > 0 ? Math.round((completed / total) * 100) : 0,
      cancellationRate: total > 0 ? Math.round((cancelled / total) * 100) : 0,
      appointmentsByStatus: byStatus,
    }
  }
}

export const receptionistService = new ReceptionistService()
