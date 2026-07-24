import { Worker, type Job } from 'bullmq'
import { prisma } from '@kanavu/database'
import Anthropic from '@anthropic-ai/sdk'
import { redis } from '../redis.js'
import { logger } from '../logger.js'
import { config } from '../config.js'
import type { AiTaskJobData } from '../queues.js'

const anthropic = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })

export function createAiTaskWorker() {
  const worker = new Worker<AiTaskJobData>(
    'ai-task',
    async (job: Job<AiTaskJobData>) => {
      const { organizationId, taskId, agentType, prompt, context } = job.data
      logger.info({ jobId: job.id, taskId, agentType }, 'Processing AI task')

      await prisma.aITask.update({
        where: { id: taskId },
        data: { status: 'IN_PROGRESS', startedAt: new Date() },
      }).catch(() => {})

      let result: string
      try {
        const systemPrompt = buildSystemPrompt(agentType, context)
        const message = await anthropic.messages.create({
          model: 'claude-sonnet-5',
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: 'user', content: prompt }],
        })
        result = message.content[0]?.type === 'text' ? message.content[0].text : ''
      } catch (err) {
        await prisma.aITask.update({
          where: { id: taskId },
          data: { status: 'FAILED', completedAt: new Date(), output: { error: String(err) } },
        }).catch(() => {})
        throw err
      }

      await prisma.aITask.update({
        where: { id: taskId },
        data: { status: 'COMPLETED', completedAt: new Date(), output: { result } },
      }).catch(() => {})

      logger.info({ jobId: job.id, taskId }, 'AI task completed')
      return result
    },
    {
      connection: redis,
      concurrency: 3,
      removeOnComplete: { count: 200 },
      removeOnFail: { count: 100 },
    }
  )

  worker.on('failed', (job, err) => {
    logger.error({ jobId: job?.id, err }, 'AI task job failed')
  })

  return worker
}

function buildSystemPrompt(agentType: string, context?: Record<string, unknown>): string {
  const businessContext = context ? JSON.stringify(context, null, 2) : 'No additional context provided.'
  const basePrompt = `You are a specialized AI agent for a business operating system called Kanavu AI.\nBusiness context: ${businessContext}\n\n`

  switch (agentType) {
    case 'BUSINESS_BRAIN':
      return basePrompt + 'You are the Business Brain — a strategic advisor who helps business owners make data-driven decisions. Provide concise, actionable insights.'
    case 'MARKETING':
      return basePrompt + 'You are the Marketing AI — an expert in digital marketing, content creation, and lead generation. Create compelling marketing copy and strategies.'
    case 'SALES':
      return basePrompt + 'You are the Sales AI — an expert in sales optimization, CRM management, and deal closing. Provide sales strategies and coaching.'
    case 'FINANCE':
      return basePrompt + 'You are the Finance AI — a financial analyst who helps with budgeting, forecasting, and financial health analysis.'
    case 'OPERATIONS':
      return basePrompt + 'You are the Operations AI — an expert in process optimization, scheduling, and operational efficiency.'
    default:
      return basePrompt + 'You are a helpful AI business assistant. Provide concise, actionable responses.'
  }
}
