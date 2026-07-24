import { Worker, type Job } from 'bullmq'
import { prisma } from '@kanavu/database'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { queues, type DripJobData } from '../queues.js'

export function createDripWorker() {
  const worker = new Worker<DripJobData>(
    'drip',
    async (job: Job<DripJobData>) => {
      const { organizationId, contactId, sequenceId, stepIndex } = job.data
      logger.info({ jobId: job.id, sequenceId, stepIndex }, 'Processing drip step')

      const sequence = await prisma.dripCampaign.findFirst({
        where: { id: sequenceId, organizationId },
        select: { id: true, name: true, steps: true, isActive: true },
      })

      if (!sequence || !sequence.isActive) {
        logger.info({ sequenceId }, 'Drip sequence inactive or not found, skipping')
        return
      }

      const steps = (sequence.steps as Array<Record<string, unknown>>) ?? []
      const step = steps[stepIndex]
      if (!step) {
        logger.info({ sequenceId, stepIndex }, 'No more steps in drip sequence')
        return
      }

      const contact = await prisma.contact.findFirst({
        where: { id: contactId, organizationId },
        select: { id: true, email: true, firstName: true, lastName: true, phone: true },
      })

      if (!contact) {
        logger.warn({ contactId }, 'Contact not found for drip step')
        return
      }

      const contactName = `${contact.firstName ?? ''} ${contact.lastName ?? ''}`.trim()

      if (step['type'] === 'email' && contact.email) {
        await queues.email.add('drip-email', {
          to: contact.email,
          subject: (step['subject'] as string) ?? `Message from ${sequence.name}`,
          html: ((step['html'] as string) ?? step['body'] as string ?? '').replace(/\{\{name\}\}/g, contactName),
          organizationId,
          contactId,
        })
      } else if (step['type'] === 'sms' && contact.phone) {
        await queues.sms.add('drip-sms', {
          to: contact.phone,
          body: ((step['body'] as string) ?? '').replace(/\{\{name\}\}/g, contactName),
          organizationId,
          contactId,
        })
      }

      // Schedule next step if exists
      const nextStep = steps[stepIndex + 1]
      if (nextStep) {
        const delayMs = parseInt(String(nextStep['delayMs'] ?? '86400000'), 10)
        await queues.drip.add(
          'drip-step',
          { organizationId, contactId, sequenceId, stepIndex: stepIndex + 1, scheduledAt: new Date(Date.now() + delayMs).toISOString() },
          { delay: delayMs }
        )
      }

      logger.info({ jobId: job.id, stepIndex }, 'Drip step processed')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Drip job failed')
  })

  return worker
}
