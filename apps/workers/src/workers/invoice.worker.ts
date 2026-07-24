import { Worker, type Job } from 'bullmq'
import { prisma } from '@kanavu/database'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import { queues, type InvoiceJobData } from '../queues.js'

export function createInvoiceWorker() {
  const worker = new Worker<InvoiceJobData>(
    'invoice',
    async (job: Job<InvoiceJobData>) => {
      const { organizationId, invoiceId, action, contactEmail, contactName } = job.data
      logger.info({ jobId: job.id, invoiceId, action }, 'Processing invoice job')

      const invoice = await prisma.invoice.findFirst({
        where: { id: invoiceId, organizationId },
        select: { id: true, invoiceNumber: true, totalAmount: true, dueDate: true, status: true },
      })

      if (!invoice) {
        logger.warn({ invoiceId }, 'Invoice not found')
        return
      }

      const amount = invoice.totalAmount.toString()
      const dueDate = invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString() : 'N/A'

      if (action === 'send_reminder') {
        await queues.email.add('invoice-reminder', {
          to: contactEmail,
          subject: `Payment Reminder: Invoice #${invoice.invoiceNumber}`,
          html: `<p>Hi ${contactName},</p><p>This is a friendly reminder that Invoice #${invoice.invoiceNumber} for <strong>$${amount}</strong> is due on <strong>${dueDate}</strong>.</p><p>Please process your payment at your earliest convenience.</p>`,
          organizationId,
        })
      } else if (action === 'send_overdue') {
        await queues.email.add('invoice-overdue', {
          to: contactEmail,
          subject: `OVERDUE: Invoice #${invoice.invoiceNumber} - Immediate Action Required`,
          html: `<p>Hi ${contactName},</p><p>Invoice #${invoice.invoiceNumber} for <strong>$${amount}</strong> is now <strong>overdue</strong>. The due date was ${dueDate}.</p><p>Please arrange payment immediately to avoid any disruption to your services.</p>`,
          organizationId,
        })
        await prisma.invoice.update({ where: { id: invoiceId }, data: { status: 'OVERDUE' as never } }).catch(() => {})
      } else if (action === 'send_receipt') {
        await queues.email.add('invoice-receipt', {
          to: contactEmail,
          subject: `Payment Received: Invoice #${invoice.invoiceNumber}`,
          html: `<p>Hi ${contactName},</p><p>Thank you! We have received your payment of <strong>$${amount}</strong> for Invoice #${invoice.invoiceNumber}.</p><p>Your receipt is attached.</p>`,
          organizationId,
        })
      }

      logger.info({ jobId: job.id, action }, 'Invoice job completed')
    },
    {
      connection: redis,
      concurrency: config.CONCURRENCY,
      removeOnComplete: { count: 500 },
      removeOnFail: { count: 200 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'Invoice job failed')
  })

  return worker
}
