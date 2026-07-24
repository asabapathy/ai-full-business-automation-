import { prisma } from '@kanavu/database'
import crypto from 'crypto'

export const csatService = {
  async getSurveys(orgId: string) {
    return prisma.csatSurvey.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { responses: true } } },
      orderBy: { createdAt: 'desc' },
    })
  },

  async getSurvey(orgId: string, id: string) {
    return prisma.csatSurvey.findFirst({
      where: { id, organizationId: orgId },
      include: { responses: { orderBy: { createdAt: 'desc' } } },
    })
  },

  async createSurvey(orgId: string, data: { name: string; question?: string }) {
    return prisma.csatSurvey.create({
      data: { organizationId: orgId, name: data.name, question: data.question ?? 'How satisfied are you with our service?' },
    })
  },

  async updateSurvey(orgId: string, id: string, data: Partial<{ name: string; question: string; isActive: boolean }>) {
    return prisma.csatSurvey.updateMany({ where: { id, organizationId: orgId }, data })
  },

  async deleteSurvey(orgId: string, id: string) {
    return prisma.csatSurvey.deleteMany({ where: { id, organizationId: orgId } })
  },

  async sendSurvey(orgId: string, surveyId: string, contactId: string) {
    const [survey, contact] = await Promise.all([
      prisma.csatSurvey.findFirst({ where: { id: surveyId, organizationId: orgId } }),
      prisma.contact.findFirst({ where: { id: contactId, organizationId: orgId } }),
    ])
    if (!survey || !contact) throw new Error('Survey or contact not found')
    if (!contact.email) throw new Error('Contact has no email')

    const token = crypto.randomBytes(24).toString('hex')
    const response = await prisma.csatResponse.create({
      data: { surveyId, contactId, token },
    })

    const origin = process.env['APP_URL'] ?? 'https://app.kanavu.ai'
    const surveyUrl = `${origin}/csat/${token}`

    const { EmailService } = await import('@kanavu/integrations')
    const emailSvc = EmailService.fromEnv()
    await emailSvc.sendRaw?.({
      to: contact.email,
      subject: `Quick feedback — ${survey.name}`,
      html: `<p>Hi ${contact.firstName},</p><p>${survey.question}</p><p><a href="${surveyUrl}" style="background:#2563eb;color:white;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;">Give Feedback</a></p><p style="color:#999;font-size:12px;">Takes less than 30 seconds.</p>`,
    })

    return response
  },

  async getResponseByToken(token: string) {
    return prisma.csatResponse.findUnique({
      where: { token },
      include: { survey: true },
    })
  },

  async submitResponse(token: string, score: number, comment?: string) {
    if (score < 1 || score > 5) throw new Error('Score must be 1–5')
    const existing = await prisma.csatResponse.findUnique({ where: { token } })
    if (!existing) throw new Error('Invalid token')
    if (existing.submittedAt) throw new Error('Already submitted')
    return prisma.csatResponse.update({
      where: { token },
      data: { score, comment, submittedAt: new Date() },
    })
  },

  async getStats(orgId: string) {
    const surveys = await prisma.csatSurvey.findMany({ where: { organizationId: orgId }, select: { id: true } })
    const surveyIds = surveys.map(s => s.id)

    const [total, submitted, responses] = await Promise.all([
      prisma.csatResponse.count({ where: { surveyId: { in: surveyIds } } }),
      prisma.csatResponse.count({ where: { surveyId: { in: surveyIds }, submittedAt: { not: null } } }),
      prisma.csatResponse.findMany({ where: { surveyId: { in: surveyIds }, score: { not: null } } }),
    ])

    const avgScore = responses.length > 0 ? responses.reduce((s, r) => s + (r.score ?? 0), 0) / responses.length : 0
    const dist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }
    responses.forEach(r => { if (r.score) dist[r.score] = (dist[r.score] ?? 0) + 1 })

    return { total, submitted, avgScore: Math.round(avgScore * 10) / 10, responseRate: total > 0 ? (submitted / total) * 100 : 0, distribution: dist }
  },
}
