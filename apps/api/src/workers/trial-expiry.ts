import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'
import { sendEmail, buildTrialExpiryEmail } from '../services/email.service.js'
import { config } from '../config/index.js'

const APP_URL = config.APP_URL ?? 'http://localhost:3000'

// ── Send trial warning email (deduped via subscription.metadata) ──────────────

async function sendTrialWarning(subId: string, orgName: string, adminEmail: string, daysLeft: number) {
  const key = `trialEmail${daysLeft}d`

  const sub = await prisma.subscription.findUnique({ where: { id: subId }, select: { metadata: true } })
  const meta = (sub?.metadata ?? {}) as Record<string, unknown>

  if (meta[key]) return // already sent

  const email = buildTrialExpiryEmail({
    orgName,
    daysLeft,
    upgradeUrl: `${APP_URL}/dashboard/upgrade`,
  })

  const sent = await sendEmail({ to: adminEmail, ...email })
  if (sent) {
    await prisma.subscription.update({
      where: { id: subId },
      data: { metadata: { ...meta, [key]: new Date().toISOString() } },
    })
  }
}

// ── Main expiry job ───────────────────────────────────────────────────────────

export async function expireTrials(): Promise<void> {
  const now = new Date()
  const in7d = new Date(now.getTime() + 7 * 86400000)
  const in2d = new Date(now.getTime() + 2 * 86400000)
  const oneDayAgo = new Date(now.getTime() - 86400000)

  // --- Expire trials that have passed ---
  const expired = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { lte: now } },
    select: { id: true, organizationId: true },
  })

  if (expired.length > 0) {
    logger.info({ count: expired.length }, 'trial-expiry: downgrading expired trials')
    await prisma.subscription.updateMany({
      where: { id: { in: expired.map(s => s.id) } },
      data: { plan: 'STARTER', status: 'ACTIVE' },
    })
  }

  // --- Send expiry email for just-expired (within last 24h) ---
  const justExpired = await prisma.subscription.findMany({
    where: {
      status: 'ACTIVE',
      plan: 'STARTER',
      trialEndsAt: { gte: oneDayAgo, lte: now },
    },
    include: {
      organization: {
        select: {
          name: true,
          members: {
            where: { role: 'ADMIN' },
            include: { user: { select: { email: true } } },
            take: 1,
          },
        },
      },
    },
  })

  for (const sub of justExpired) {
    const adminEmail = sub.organization.members[0]?.user.email
    if (adminEmail) {
      await sendTrialWarning(sub.id, sub.organization.name, adminEmail, 0)
    }
  }

  // --- Send 7-day warning ---
  const about7d = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { gte: new Date(in7d.getTime() - 3600000), lte: in7d } },
    include: {
      organization: {
        select: {
          name: true,
          members: {
            where: { role: 'ADMIN' },
            include: { user: { select: { email: true } } },
            take: 1,
          },
        },
      },
    },
  })

  for (const sub of about7d) {
    const adminEmail = sub.organization.members[0]?.user.email
    if (adminEmail) await sendTrialWarning(sub.id, sub.organization.name, adminEmail, 7)
  }

  // --- Send 2-day warning ---
  const about2d = await prisma.subscription.findMany({
    where: { status: 'TRIALING', trialEndsAt: { gte: new Date(in2d.getTime() - 3600000), lte: in2d } },
    include: {
      organization: {
        select: {
          name: true,
          members: {
            where: { role: 'ADMIN' },
            include: { user: { select: { email: true } } },
            take: 1,
          },
        },
      },
    },
  })

  for (const sub of about2d) {
    const adminEmail = sub.organization.members[0]?.user.email
    if (adminEmail) await sendTrialWarning(sub.id, sub.organization.name, adminEmail, 2)
  }

  logger.debug({ expired: expired.length, warned: about7d.length + about2d.length }, 'trial-expiry: cycle complete')
}

export function startTrialExpiryWorker(intervalMs = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  expireTrials().catch(err => logger.error({ err }, 'trial-expiry: initial run failed'))
  return setInterval(() => {
    expireTrials().catch(err => logger.error({ err }, 'trial-expiry: scheduled run failed'))
  }, intervalMs)
}
