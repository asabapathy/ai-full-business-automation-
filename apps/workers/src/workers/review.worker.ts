import { Worker, type Job } from 'bullmq'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { queues, type ReviewJobData } from '../queues.js'

const PLATFORM_LABELS: Record<string, string> = {
  google: 'Google',
  yelp: 'Yelp',
  facebook: 'Facebook',
}

export function createReviewWorker() {
  const worker = new Worker<ReviewJobData>(
    'review',
    async (job: Job<ReviewJobData>) => {
      const { organizationId, contactEmail, contactName, platform, reviewLinkUrl } = job.data
      const platformLabel = PLATFORM_LABELS[platform] ?? platform

      logger.info({ jobId: job.id, platform, contactEmail }, 'Processing review request')

      const reviewUrl = reviewLinkUrl ?? '#'

      await queues.email.add('review-request', {
        to: contactEmail,
        subject: `How was your experience? Leave us a ${platformLabel} review`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>We'd love your feedback, ${contactName}!</h2>
            <p>Thank you for being our customer. Your experience means the world to us.</p>
            <p>Would you take 2 minutes to share your experience on ${platformLabel}?</p>
            <p style="text-align: center; margin: 32px 0;">
              <a href="${reviewUrl}" style="background: #2563eb; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">
                Leave a Review on ${platformLabel} ⭐
              </a>
            </p>
            <p style="color: #666; font-size: 13px;">Your honest feedback helps us improve and helps other customers find us.</p>
          </div>
        `,
        organizationId,
      })

      logger.info({ jobId: job.id }, 'Review request sent')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Review job failed')
  })

  return worker
}
