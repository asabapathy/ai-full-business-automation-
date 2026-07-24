import { prisma } from './database.js'

export class StaffScheduleService {
  async getEmployees(orgId: string) {
    return prisma.employee.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, firstName: true, lastName: true, role: true, department: true, email: true, phone: true, availability: true },
      orderBy: { firstName: 'asc' },
    })
  }

  async getShifts(orgId: string, startDate: string, endDate: string) {
    return prisma.shift.findMany({
      where: {
        organizationId: orgId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      include: { employee: { select: { id: true, firstName: true, lastName: true, role: true } } },
      orderBy: [{ date: 'asc' }, { startTime: 'asc' }],
    })
  }

  async createShift(orgId: string, data: { employeeId: string; date: string; startTime: string; endTime: string; role?: string; notes?: string }) {
    return prisma.shift.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        date: new Date(data.date),
        startTime: data.startTime,
        endTime: data.endTime,
        role: data.role,
        notes: data.notes,
      },
      include: { employee: { select: { firstName: true, lastName: true } } },
    })
  }

  async updateShift(orgId: string, id: string, data: Partial<{ startTime: string; endTime: string; role: string; notes: string; status: string }>) {
    return prisma.shift.updateMany({ where: { id, organizationId: orgId }, data })
  }

  async deleteShift(orgId: string, id: string): Promise<void> {
    await prisma.shift.deleteMany({ where: { id, organizationId: orgId } })
  }

  async getTimeOffRequests(orgId: string, status?: string) {
    return prisma.timeOffRequest.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      include: { employee: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async requestTimeOff(orgId: string, data: { employeeId: string; startDate: string; endDate: string; type: string; reason?: string }) {
    return prisma.timeOffRequest.create({
      data: {
        organizationId: orgId,
        employeeId: data.employeeId,
        startDate: new Date(data.startDate),
        endDate: new Date(data.endDate),
        type: data.type,
        reason: data.reason,
      },
    })
  }

  async approveTimeOff(orgId: string, id: string, approverId: string, approved: boolean): Promise<void> {
    await prisma.timeOffRequest.updateMany({
      where: { id, organizationId: orgId },
      data: { status: approved ? 'approved' : 'rejected', approvedBy: approverId },
    })

    if (approved) {
      const req = await prisma.timeOffRequest.findUnique({ where: { id } })
      if (req) {
        await prisma.shift.updateMany({
          where: {
            organizationId: orgId,
            employeeId: req.employeeId,
            date: { gte: req.startDate, lte: req.endDate },
          },
          data: { status: 'time_off' },
        })
      }
    }
  }

  async getWeekSummary(orgId: string, weekStart: string) {
    const start = new Date(weekStart)
    const end = new Date(start)
    end.setDate(end.getDate() + 6)

    const [shifts, timeOff] = await Promise.all([
      prisma.shift.findMany({
        where: { organizationId: orgId, date: { gte: start, lte: end } },
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
      prisma.timeOffRequest.findMany({
        where: { organizationId: orgId, status: 'approved', startDate: { lte: end }, endDate: { gte: start } },
        include: { employee: { select: { firstName: true, lastName: true } } },
      }),
    ])

    const totalHours = shifts.reduce((sum, s) => {
      const [sh, sm] = s.startTime.split(':').map(Number)
      const [eh, em] = s.endTime.split(':').map(Number)
      return sum + (eh * 60 + (em ?? 0) - (sh * 60 + (sm ?? 0))) / 60
    }, 0)

    return { shifts, timeOff, totalHours: Math.round(totalHours * 10) / 10, shiftCount: shifts.length }
  }
}

export const staffScheduleService = new StaffScheduleService()
