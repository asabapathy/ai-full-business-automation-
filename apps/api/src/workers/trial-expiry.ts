import { prisma } from '../services/database.js'
import { logger } from '../utils/logger.js'

export async function expireTrials(): Promise<void> {
  const now = new Date()

  // Find all TRIALING subscriptions whose trial has ended
  const expired = await prisma.subscription.findMany({
    where: {
      status: 'TRIALING',
      trialEndsAt: { lte: now },
    },
    select: { id: true, organizationId: true, trialEndsAt: true },
  })

  if (expired.length === 0) {
    logger.debug('trial-expiry: no expired trials found')
    return
  }

  logger.info({ count: expired.length }, 'trial-expiry: downgrading expired trials to STARTER')

  await prisma.subscription.updateMany({
    where: { id: { in: expired.map(s => s.id) } },
    data: { plan: 'STARTER', status: 'ACTIVE' },
  })

  logger.info({ count: expired.length }, 'trial-expiry: done')
}

export function startTrialExpiryWorker(intervalMs = 6 * 60 * 60 * 1000): NodeJS.Timeout {
  // Run immediately, then every 6 hours
  expireTrials().catch(err => logger.error({ err }, 'trial-expiry: initial run failed'))

  return setInterval(() => {
    expireTrials().catch(err => logger.error({ err }, 'trial-expiry: scheduled run failed'))
  }, intervalMs)
}
