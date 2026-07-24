import { Worker, type Job } from 'bullmq'
import { prisma } from '@kanavu/database'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import type { NotificationJobData } from '../queues.js'

export function createNotificationWorker() {
  const worker = new Worker<NotificationJobData>(
    'notification',
    async (job: Job<NotificationJobData>) => {
      const { organizationId, userId, title, body, type, data, actionUrl } = job.data
      logger.info({ jobId: job.id, type }, 'Processing notification job')

      await prisma.notification.create({
        data: {
          organizationId,
          userId: userId ?? null,
          title,
          body,
          type,
          data: data ?? {},
          actionUrl: actionUrl ?? null,
        },
      })

      logger.info({ jobId: job.id }, 'Notification created')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 1000 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Notification job failed')
  })

  return worker
}
