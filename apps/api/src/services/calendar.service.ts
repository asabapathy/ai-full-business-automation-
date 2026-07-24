import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

const GOOGLE_CLIENT_ID = process.env['GOOGLE_CLIENT_ID'] ?? ''
const GOOGLE_CLIENT_SECRET = process.env['GOOGLE_CLIENT_SECRET'] ?? ''
const REDIRECT_BASE = process.env['API_URL'] ?? 'http://localhost:4000/api/v1'

export class CalendarService {
  getGoogleAuthUrl(orgId: string, userId: string): string {
    const state = Buffer.from(JSON.stringify({ orgId, userId, provider: 'google' })).toString('base64')
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      redirect_uri: `${REDIRECT_BASE}/calendar/callback/google`,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/calendar',
      access_type: 'offline',
      prompt: 'consent',
      state,
    })
    return `https://accounts.google.com/o/oauth2/v2/auth?${params}`
  }

  async handleGoogleCallback(code: string, state: string): Promise<void> {
    const { orgId, userId } = JSON.parse(Buffer.from(state, 'base64').toString()) as { orgId: string; userId: string }

    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${REDIRECT_BASE}/calendar/callback/google`,
        grant_type: 'authorization_code',
      }),
    })

    if (!tokenRes.ok) throw new Error('Failed to exchange Google auth code')
    const tokens = await tokenRes.json() as { access_token: string; refresh_token?: string; expires_in: number }

    // Get primary calendar info
    const calRes = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const calInfo = calRes.ok ? await calRes.json() as { id: string; summary: string } : { id: 'primary', summary: 'Primary Calendar' }

    await prisma.calendarIntegration.upsert({
      where: { organizationId_userId_provider: { organizationId: orgId, userId, provider: 'google' } },
      create: {
        organizationId: orgId,
        userId,
        provider: 'google',
        accessToken: tokens.access_token,
        refreshToken: tokens.refresh_token ?? '',
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        calendarId: calInfo.id,
        calendarName: calInfo.summary,
      },
      update: {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token && { refreshToken: tokens.refresh_token }),
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        calendarId: calInfo.id,
        calendarName: calInfo.summary,
        isActive: true,
      },
    })
  }

  async getIntegrations(orgId: string) {
    return prisma.calendarIntegration.findMany({
      where: { organizationId: orgId, isActive: true },
      select: { id: true, provider: true, calendarName: true, lastSyncedAt: true, isActive: true },
    })
  }

  async disconnectIntegration(orgId: string, id: string): Promise<void> {
    await prisma.calendarIntegration.updateMany({
      where: { id, organizationId: orgId },
      data: { isActive: false },
    })
  }

  async syncAppointmentsToCalendar(orgId: string): Promise<{ synced: number }> {
    const integrations = await prisma.calendarIntegration.findMany({
      where: { organizationId: orgId, isActive: true, provider: 'google' },
    })
    if (integrations.length === 0) return { synced: 0 }

    const integration = integrations[0]!
    const token = await this.refreshTokenIfNeeded(integration)

    const upcoming = await prisma.appointment.findMany({
      where: {
        organizationId: orgId,
        startTime: { gte: new Date() },
        status: { in: ['CONFIRMED', 'SCHEDULED'] },
      },
      include: { contact: { select: { firstName: true, lastName: true, email: true } }, service: { select: { name: true } } },
      take: 100,
    })

    let synced = 0
    for (const appt of upcoming) {
      try {
        const body: Record<string, unknown> = {
          summary: `${appt.service?.name ?? 'Appointment'} - ${appt.contact?.firstName} ${appt.contact?.lastName ?? ''}`.trim(),
          start: { dateTime: appt.startTime.toISOString() },
          end: { dateTime: appt.endTime.toISOString() },
          ...(appt.contact?.email && {
            attendees: [{ email: appt.contact.email }],
          }),
        }

        await fetch(`https://www.googleapis.com/calendar/v3/calendars/${integration.calendarId ?? 'primary'}/events`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })
        synced++
      } catch {
        // continue
      }
    }

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: { lastSyncedAt: new Date() },
    })

    return { synced }
  }

  private async refreshTokenIfNeeded(integration: { id: string; accessToken: string; refreshToken: string | null; tokenExpiresAt: Date | null }): Promise<string> {
    if (!integration.tokenExpiresAt || integration.tokenExpiresAt > new Date(Date.now() + 60_000)) {
      return integration.accessToken
    }

    if (!integration.refreshToken) return integration.accessToken

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        refresh_token: integration.refreshToken,
        grant_type: 'refresh_token',
      }),
    })

    if (!res.ok) return integration.accessToken
    const tokens = await res.json() as { access_token: string; expires_in: number }

    await prisma.calendarIntegration.update({
      where: { id: integration.id },
      data: {
        accessToken: tokens.access_token,
        tokenExpiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      },
    })

    return tokens.access_token
  }
}

export const calendarService = new CalendarService()
