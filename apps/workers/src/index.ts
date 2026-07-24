import { logger } from './logger.js'
import { redis } from './redis.js'
import { createEmailWorker } from './workers/email.worker.js'
import { createSmsWorker } from './workers/sms.worker.js'
import { createNotificationWorker } from './workers/notification.worker.js'
import { createDripWorker } from './workers/drip.worker.js'
import { createAiTaskWorker } from './workers/ai-task.worker.js'
import { createSocialWorker } from './workers/social.worker.js'
import { createInvoiceWorker } from './workers/invoice.worker.js'
import { createReviewWorker } from './workers/review.worker.js'

logger.info('Starting Kanavu workers...')

const workers = [
  createEmailWorker(),
  createSmsWorker(),
  createNotificationWorker(),
  createDripWorker(),
  createAiTaskWorker(),
  createSocialWorker(),
  createInvoiceWorker(),
  createReviewWorker(),
]

logger.info(`Started ${workers.length} workers`)

async function shutdown(signal: string) {
  logger.info({ signal }, 'Shutting down workers...')
  await Promise.all(workers.map(w => w.close()))
  await redis.quit()
  logger.info('All workers closed')
  process.exit(0)
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

process.on('uncaughtException', err => {
  logger.error(err, 'Uncaught exception')
  process.exit(1)
})

process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection')
})
