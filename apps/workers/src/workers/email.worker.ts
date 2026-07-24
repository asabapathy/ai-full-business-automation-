import { Worker, type Job } from 'bullmq'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import type { EmailJobData } from '../queues.js'

async function sendEmail(data: EmailJobData): Promise<void> {
  if (!config.SENDGRID_API_KEY) {
    logger.warn({ to: data.to }, 'SendGrid not configured — skipping email send')
    return
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: data.to }] }],
      from: { email: data.from ?? 'noreply@kanavu.ai', name: 'Kanavu AI' },
      subject: data.subject,
      content: [
        { type: 'text/plain', value: data.text ?? data.html.replace(/<[^>]*>/g, '') },
        { type: 'text/html', value: data.html },
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`SendGrid error ${response.status}: ${body}`)
  }
}

export function createEmailWorker() {
  const worker = new Worker<EmailJobData>(
    'email',
    async (job: Job<EmailJobData>) => {
      logger.info({ jobId: job.id, to: job.data.to }, 'Processing email job')
      await sendEmail(job.data)
      logger.info({ jobId: job.id }, 'Email sent successfully')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Email job failed')
  })

  worker.on('completed', job => {
    logger.debug({ jobId: job.id }, 'Email job completed')
  })

  return worker
}
