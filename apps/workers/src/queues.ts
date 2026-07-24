import { Queue } from 'bullmq'
import { redis } from './redis.js'

const connection = redis

export const queues = {
  email: new Queue('email', { connection }),
  sms: new Queue('sms', { connection }),
  notification: new Queue('notification', { connection }),
  drip: new Queue('drip', { connection }),
  aiTask: new Queue('ai-task', { connection }),
  social: new Queue('social', { connection }),
  invoice: new Queue('invoice', { connection }),
  review: new Queue('review', { connection }),
}

export type QueueName = keyof typeof queues

export interface EmailJobData {
  to: string
  subject: string
  html: string
  text?: string
  from?: string
  organizationId: string
  contactId?: string
  templateId?: string
  trackingId?: string
}

export interface SmsJobData {
  to: string
  body: string
  organizationId: string
  contactId?: string
  fromNumber?: string
}

export interface NotificationJobData {
  organizationId: string
  userId?: string
  title: string
  body: string
  type: string
  data?: Record<string, unknown>
  actionUrl?: string
}

export interface DripJobData {
  organizationId: string
  contactId: string
  sequenceId: string
  stepIndex: number
  scheduledAt: string
}

export interface AiTaskJobData {
  organizationId: string
  taskId: string
  agentType: string
  prompt: string
  context?: Record<string, unknown>
}

export interface SocialJobData {
  organizationId: string
  postId: string
  platform: string
  content: string
  mediaUrls?: string[]
  scheduledAt: string
}

export interface InvoiceJobData {
  organizationId: string
  invoiceId: string
  action: 'send_reminder' | 'send_overdue' | 'send_receipt'
  contactEmail: string
  contactName: string
}

export interface ReviewJobData {
  organizationId: string
  contactId: string
  contactEmail: string
  contactName: string
  platform: 'google' | 'yelp' | 'facebook'
  reviewLinkUrl?: string
}
