import { Worker, type Job } from 'bullmq'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import type { SmsJobData } from '../queues.js'

async function sendSms(data: SmsJobData): Promise<void> {
  if (!config.TWILIO_ACCOUNT_SID || !config.TWILIO_AUTH_TOKEN) {
    logger.warn({ to: data.to }, 'Twilio not configured — skipping SMS send')
    return
  }

  const fromNumber = data.fromNumber ?? config.TWILIO_FROM_NUMBER
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.TWILIO_ACCOUNT_SID}/Messages.json`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${config.TWILIO_ACCOUNT_SID}:${config.TWILIO_AUTH_TOKEN}`).toString('base64')}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({ To: data.to, From: fromNumber, Body: data.body }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Twilio error ${response.status}: ${body}`)
  }
}

export function createSmsWorker() {
  const worker = new Worker<SmsJobData>(
    'sms',
    async (job: Job<SmsJobData>) => {
      logger.info({ jobId: job.id, to: job.data.to }, 'Processing SMS job')
      await sendSms(job.data)
      logger.info({ jobId: job.id }, 'SMS sent successfully')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'SMS job failed')
  })

  return worker
}
