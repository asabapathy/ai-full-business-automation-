import { AIProviderFactory } from '@kanavu/ai-core'
import { prisma } from './database.js'
import { logger } from '../utils/logger.js'

interface CreateWorkflowRequest {
  name: string
  description?: string
  triggerType: string
  triggerConfig?: Record<string, unknown>
  steps?: Array<{
    type: string
    name: string
    config: Record<string, unknown>
    order: number
    conditions?: unknown
  }>
}

export class AutomationService {
  private provider = AIProviderFactory.createFromEnv()

  async getWorkflows(organizationId: string, filters: { isActive?: boolean; triggerType?: string; page?: number; limit?: number }) {
    const { isActive, triggerType, page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit
    const where = {
      organizationId,
      ...(isActive !== undefined ? { isActive } : {}),
      ...(triggerType ? { triggerType: triggerType as never } : {}),
    }

    const [workflows, total] = await Promise.all([
      prisma.workflow.findMany({
        where,
        include: { steps: { orderBy: { order: 'asc' } }, _count: { select: { executions: true } } },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflow.count({ where }),
    ])

    return { workflows, total, page, limit }
  }

  async createWorkflow(organizationId: string, data: CreateWorkflowRequest) {
    const workflow = await prisma.workflow.create({
      data: {
        organizationId,
        name: data.name,
        description: data.description,
        triggerType: data.triggerType as never,
        triggerConfig: data.triggerConfig ?? {},
        isActive: false,
        steps: data.steps ? {
          create: data.steps.map(step => ({
            type: step.type as never,
            name: step.name,
            config: step.config,
            order: step.order,
            conditions: step.conditions,
          })),
        } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })

    return workflow
  }

  async updateWorkflow(organizationId: string, workflowId: string, data: Partial<CreateWorkflowRequest> & { isActive?: boolean }) {
    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, organizationId } })
    if (!workflow) throw new Error('Workflow not found')

    return prisma.workflow.update({
      where: { id: workflowId },
      data: {
        ...(data.name ? { name: data.name } : {}),
        ...(data.description !== undefined ? { description: data.description } : {}),
        ...(data.triggerConfig ? { triggerConfig: data.triggerConfig } : {}),
        ...(data.isActive !== undefined ? { isActive: data.isActive } : {}),
      },
    })
  }

  async deleteWorkflow(organizationId: string, workflowId: string) {
    const workflow = await prisma.workflow.findFirst({ where: { id: workflowId, organizationId } })
    if (!workflow) throw new Error('Workflow not found')
    return prisma.workflow.delete({ where: { id: workflowId } })
  }

  async executeWorkflow(organizationId: string, workflowId: string, triggerData: Record<string, unknown> = {}) {
    const workflow = await prisma.workflow.findFirst({
      where: { id: workflowId, organizationId },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    if (!workflow) throw new Error('Workflow not found')

    const execution = await prisma.workflowExecution.create({
      data: {
        organizationId,
        workflowId,
        status: 'IN_PROGRESS',
        triggerData,
      },
    })

    const stepResults: Array<Record<string, unknown>> = []

    try {
      for (const step of workflow.steps) {
        const result = await this.executeStep(step.type, step.config as Record<string, unknown>, triggerData, organizationId)
        stepResults.push({ stepId: step.id, type: step.type, status: 'completed', result })
        logger.info({ workflowId, stepId: step.id, type: step.type }, 'Workflow step executed')
      }

      await prisma.workflow.update({ where: { id: workflowId }, data: { runCount: { increment: 1 }, lastRunAt: new Date() } })

      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'COMPLETED', completedAt: new Date(), stepResults },
      })

      return { executionId: execution.id, status: 'COMPLETED', stepResults }
    } catch (err) {
      const error = err instanceof Error ? err.message : 'Unknown error'
      await prisma.workflowExecution.update({
        where: { id: execution.id },
        data: { status: 'FAILED', completedAt: new Date(), error, stepResults },
      })
      throw err
    }
  }

  private async executeStep(type: string, config: Record<string, unknown>, triggerData: Record<string, unknown>, organizationId: string): Promise<unknown> {
    switch (type) {
      case 'SEND_EMAIL':
        logger.info({ type, to: config['to'] }, 'Email step — integration pending')
        return { sent: false, reason: 'email_integration_pending' }
      case 'SEND_SMS':
        logger.info({ type, to: config['to'] }, 'SMS step — integration pending')
        return { sent: false, reason: 'sms_integration_pending' }
      case 'WAIT_DELAY':
        return { delayed: true, minutes: config['minutes'] ?? 0 }
      case 'NOTIFY_TEAM':
        await prisma.notification.create({
          data: {
            organizationId,
            type: 'workflow_action',
            title: (config['title'] as string) ?? 'Workflow notification',
            body: (config['body'] as string) ?? 'A workflow action was triggered',
            data: { triggerData, config },
          },
        })
        return { notified: true }
      case 'UPDATE_CRM':
        return { updated: true, entity: config['entity'], action: config['action'] }
      case 'AI_ACTION':
        return { aiProcessed: true, prompt: config['prompt'] }
      default:
        return { status: 'skipped', type }
    }
  }

  async getExecutions(organizationId: string, workflowId: string, filters: { page?: number; limit?: number }) {
    const { page = 1, limit = 20 } = filters
    const skip = (page - 1) * limit

    const [executions, total] = await Promise.all([
      prisma.workflowExecution.findMany({
        where: { organizationId, workflowId },
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.workflowExecution.count({ where: { organizationId, workflowId } }),
    ])

    return { executions, total, page, limit }
  }

  async generateAiWorkflow(organizationId: string, request: { goal: string; triggerEvent?: string }) {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { name: true, industry: true },
    })
    if (!org) throw new Error('Organization not found')

    const prompt = `Design an automation workflow for ${org.name} (${org.industry.replace(/_/g, ' ')}) to achieve: "${request.goal}".
${request.triggerEvent ? `Trigger event: ${request.triggerEvent}` : ''}

Return a JSON workflow with this exact structure:
{
  "name": "Workflow name",
  "description": "What this workflow does",
  "triggerType": "one of: CONTACT_CREATED | DEAL_STAGE_CHANGED | APPOINTMENT_BOOKED | INVOICE_OVERDUE | REVIEW_RECEIVED | SCHEDULE | MANUAL",
  "triggerConfig": {},
  "steps": [
    { "order": 1, "type": "WAIT_DELAY | SEND_EMAIL | SEND_SMS | NOTIFY_TEAM | UPDATE_CRM | AI_ACTION", "name": "Step name", "config": {} }
  ]
}
Return ONLY the JSON, no explanation.`

    const result = await this.provider.generate({
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      maxTokens: 1024,
    })

    try {
      const workflowDef = JSON.parse(result.content.replace(/```json\n?|\n?```/g, '').trim()) as CreateWorkflowRequest
      const workflow = await this.createWorkflow(organizationId, workflowDef)
      return { workflow, aiGenerated: true }
    } catch {
      return { rawResponse: result.content, aiGenerated: true, parseError: true }
    }
  }

  async getStats(organizationId: string) {
    const [total, active, totalRuns, recentFailures] = await Promise.all([
      prisma.workflow.count({ where: { organizationId } }),
      prisma.workflow.count({ where: { organizationId, isActive: true } }),
      prisma.workflowExecution.count({ where: { organizationId } }),
      prisma.workflowExecution.count({ where: { organizationId, status: 'FAILED' as never, startedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
    ])

    return { total, active, totalRuns, recentFailures }
  }
}

export const automationService = new AutomationService()
