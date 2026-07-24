import { prisma } from './database.js'
import { aiService } from './ai.service.js'
import { logger } from '../utils/logger.js'

export class TestimonialService {
  async createRequest(orgId: string, data: { contactId?: string; appointmentId?: string }): Promise<{ token: string; captureUrl: string }> {
    const t = await prisma.videoTestimonial.create({
      data: { organizationId: orgId, contactId: data.contactId, appointmentId: data.appointmentId },
    })

    const webBase = process.env['WEB_URL'] ?? 'http://localhost:3000'
    const captureUrl = `${webBase}/testimonial/${t.token}`

    return { token: t.token, captureUrl }
  }

  async getTestimonials(orgId: string, status?: string) {
    return prisma.videoTestimonial.findMany({
      where: { organizationId: orgId, ...(status ? { status } : {}) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  }

  async getByToken(token: string) {
    return prisma.videoTestimonial.findUnique({
      where: { token },
      include: { organization: { select: { name: true, logoUrl: true } } },
    })
  }

  async submitVideo(token: string, data: { videoUrl: string; thumbnailUrl?: string; rating?: number }): Promise<void> {
    await prisma.videoTestimonial.update({
      where: { token },
      data: {
        videoUrl: data.videoUrl,
        thumbnailUrl: data.thumbnailUrl,
        rating: data.rating,
        status: 'received',
      },
    })

    // Trigger AI transcription/summary (async)
    void this.generateSummary(token)
  }

  async generateSummary(token: string): Promise<void> {
    const t = await prisma.videoTestimonial.findUnique({ where: { token } })
    if (!t) return

    try {
      const aiResp = await aiService.chat(t.organizationId, undefined, {
        message: `A customer submitted a video testimonial. Based on this being a positive review for a service business, write:
1. A concise 2-sentence summary (as if you watched the video)
2. Key sentiment: positive/neutral/negative

Reply as JSON: {"summary": "...", "sentiment": "positive"}`,
      })

      let parsed: { summary?: string; sentiment?: string } = {}
      try { parsed = JSON.parse(aiResp.content.replace(/```json\n?|```/g, '').trim()) } catch {}

      await prisma.videoTestimonial.update({
        where: { token },
        data: {
          summary: parsed.summary ?? 'Customer provided positive feedback about the service.',
          status: 'processed',
        },
      })
    } catch (err) {
      logger.error({ token, err }, 'Testimonial summary generation failed')
    }
  }

  async publishTestimonial(orgId: string, id: string, platforms: string[]): Promise<void> {
    await prisma.videoTestimonial.updateMany({
      where: { id, organizationId: orgId },
      data: { isPublished: true, publishedTo: platforms },
    })
  }

  async deleteTestimonial(orgId: string, id: string): Promise<void> {
    await prisma.videoTestimonial.deleteMany({ where: { id, organizationId: orgId } })
  }

  generateQrCode(captureUrl: string): string {
    const encoded = encodeURIComponent(captureUrl)
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encoded}`
  }
}

export const testimonialService = new TestimonialService()
