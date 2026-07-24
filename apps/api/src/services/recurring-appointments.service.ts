import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

type Frequency = 'daily' | 'weekly' | 'biweekly' | 'monthly'

interface RecurrenceOptions {
  frequency: Frequency
  count?: number
  until?: string
}

function nextDate(base: Date, freq: Frequency, step: number): Date {
  const d = new Date(base)
  if (freq === 'daily') d.setDate(d.getDate() + step)
  else if (freq === 'weekly') d.setDate(d.getDate() + step * 7)
  else if (freq === 'biweekly') d.setDate(d.getDate() + step * 14)
  else if (freq === 'monthly') d.setMonth(d.getMonth() + step)
  return d
}

export class RecurringAppointmentsService {
  async createRecurringSeries(orgId: string, data: {
    contactId?: string
    employeeId?: string
    serviceId?: string
    title: string
    startTime: string
    endTime: string
    duration: number
    recurrence: RecurrenceOptions
    notes?: string
  }) {
    const { recurrence, ...apptData } = data
    const count = recurrence.count ?? 8
    const until = recurrence.until ? new Date(recurrence.until) : null
    const ruleStr = `FREQ=${recurrence.frequency.toUpperCase()};COUNT=${count}`

    const start = new Date(apptData.startTime)
    const end = new Date(apptData.endTime)
    const durationMs = end.getTime() - start.getTime()

    const parent = await prisma.appointment.create({
      data: {
        organizationId: orgId,
        contactId: data.contactId,
        employeeId: data.employeeId,
        serviceId: data.serviceId,
        title: data.title,
        startTime: start,
        endTime: end,
        duration: data.duration,
        notes: data.notes,
        recurrenceRule: ruleStr,
        status: 'SCHEDULED',
      },
    })

    const children = []
    for (let i = 1; i < count; i++) {
      const childStart = nextDate(start, recurrence.frequency, i)
      if (until && childStart > until) break
      const childEnd = new Date(childStart.getTime() + durationMs)
      children.push({
        organizationId: orgId,
        contactId: data.contactId,
        employeeId: data.employeeId,
        serviceId: data.serviceId,
        title: data.title,
        startTime: childStart,
        endTime: childEnd,
        duration: data.duration,
        notes: data.notes,
        recurrenceRule: ruleStr,
        recurrenceParentId: parent.id,
        status: 'SCHEDULED' as const,
      })
    }

    if (children.length > 0) {
      await prisma.appointment.createMany({ data: children })
    }

    const series = await prisma.appointment.findMany({
      where: { recurrenceParentId: parent.id },
      orderBy: { startTime: 'asc' },
    })

    return { parent, series, total: series.length + 1 }
  }

  async getRecurringSeries(orgId: string, parentId: string) {
    const [parent, children] = await Promise.all([
      prisma.appointment.findFirst({ where: { id: parentId, organizationId: orgId } }),
      prisma.appointment.findMany({
        where: { recurrenceParentId: parentId, organizationId: orgId },
        orderBy: { startTime: 'asc' },
        include: {
          contact: { select: { firstName: true, lastName: true } },
          employee: { select: { firstName: true, lastName: true } },
        },
      }),
    ])
    return { parent, children }
  }

  async cancelSeries(orgId: string, parentId: string, fromDate?: string) {
    const from = fromDate ? new Date(fromDate) : undefined
    const where: any = { organizationId: orgId }
    if (from) {
      where.OR = [
        { id: parentId, startTime: { gte: from } },
        { recurrenceParentId: parentId, startTime: { gte: from } },
      ]
    } else {
      where.OR = [{ id: parentId }, { recurrenceParentId: parentId }]
    }

    await prisma.appointment.updateMany({
      where,
      data: { status: 'CANCELED' },
    })
  }

  async getUpcomingRecurring(orgId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit
    const now = new Date()

    const [appointments, total] = await Promise.all([
      prisma.appointment.findMany({
        where: {
          organizationId: orgId,
          recurrenceRule: { not: null },
          recurrenceParentId: null,
          startTime: { gte: now },
          status: 'SCHEDULED',
        },
        orderBy: { startTime: 'asc' },
        skip,
        take: limit,
        include: {
          contact: { select: { firstName: true, lastName: true, email: true } },
          employee: { select: { firstName: true, lastName: true } },
          recurrenceChildren: { where: { status: 'SCHEDULED' }, select: { id: true, startTime: true } },
        },
      }),
      prisma.appointment.count({
        where: {
          organizationId: orgId,
          recurrenceRule: { not: null },
          recurrenceParentId: null,
          status: 'SCHEDULED',
        },
      }),
    ])

    return { appointments, total, page, limit }
  }
}

export const recurringAppointmentsService = new RecurringAppointmentsService()
