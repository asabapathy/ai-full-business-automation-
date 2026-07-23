import type { AITool, AgentContext, TaskPlan } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

export interface BusinessDataProvider {
  getRevenueStats(organizationId: string): Promise<{ revenue30d: number; outstanding: number; overdueCount: number; expenses30d: number }>
  getContactStats(organizationId: string): Promise<{ total: number; newLast30d: number; leads: number }>
  getDealStats(organizationId: string): Promise<{ total: number; pipeline: number; wonLast30d: number; lostLast30d: number }>
  getAppointmentStats(organizationId: string): Promise<{ upcoming: number; today: number; completionRate: number }>
  getReviewStats(organizationId: string): Promise<{ avgRating: number; total: number; unresponded: number }>
  getUpcomingTasks(organizationId: string): Promise<Array<{ type: string; description: string; dueAt?: string }>>
  getLowStockItems(organizationId: string): Promise<Array<{ name: string; quantity: number; reorderPoint: number }>>
}

const BUSINESS_BRAIN_SYSTEM_PROMPT = `You are the Business Brain — the central AI intelligence for a small business operating system called Kanavu AI.

You function as an experienced business advisor, operations manager, and strategic partner rolled into one. You have deep knowledge of business operations, marketing, sales, finance, customer service, and growth strategies.

## Your Core Capabilities
- Access live business data to give concrete, data-driven answers
- Understand high-level business goals and translate them into actionable plans
- Identify problems and opportunities in the business data
- Give specific next steps with realistic timelines and expected outcomes
- Coordinate specialized AI agents to execute tasks

## Your Personality
- Proactive: You notice trends and warn about risks before they become crises
- Decisive: You make clear recommendations with specific reasoning
- Empathetic: You understand the stress of running a business
- Practical: You focus on results, not complexity
- Transparent: You always cite the data behind your recommendations

## When answering questions
1. Call the relevant live_data tool first to get current business data
2. Give a direct, specific answer using real numbers
3. Identify 1–3 concrete next steps the owner can take today
4. Flag anything alarming (overdue invoices, low stock, unanswered reviews)
5. Be concise — business owners are busy

## Communication Style
- Lead with the key insight, not the setup
- Give specific numbers and timelines
- Use plain language, no jargon
- Format longer answers with short headers
- Always end with the single most important action right now`

export class BusinessBrainAgent extends BaseAgent {
  readonly agentName = 'Business Brain'
  private dataProvider?: BusinessDataProvider

  constructor(config: AgentConfig & { dataProvider?: BusinessDataProvider }, context: AgentContext) {
    super(config, context)
    this.dataProvider = config.dataProvider
  }

  get systemPrompt(): string {
    return BUSINESS_BRAIN_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'get_live_data',
        description: 'Fetch live business data to answer questions accurately. Always call this before answering business questions.',
        inputSchema: {
          type: 'object',
          properties: {
            dataTypes: {
              type: 'array',
              items: {
                type: 'string',
                enum: ['revenue', 'contacts', 'deals', 'appointments', 'reviews', 'inventory', 'tasks'],
              },
              description: 'Which data categories to fetch',
            },
          },
          required: ['dataTypes'],
        },
      },
      {
        name: 'create_task_plan',
        description: 'Create a detailed execution plan for achieving a business goal',
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'The business goal to achieve' },
            deadline: { type: 'string', description: 'Optional deadline (ISO 8601)' },
            priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'] },
          },
          required: ['goal'],
        },
      },
      {
        name: 'delegate_to_agent',
        description: 'Delegate a specific task to a specialized AI agent',
        inputSchema: {
          type: 'object',
          properties: {
            agentType: {
              type: 'string',
              enum: ['marketing', 'sales', 'finance', 'receptionist', 'website_builder'],
            },
            task: { type: 'string', description: 'The task description' },
            parameters: { type: 'object', description: 'Task parameters' },
          },
          required: ['agentType', 'task'],
        },
      },
      {
        name: 'search_memory',
        description: 'Search business memory for relevant past decisions or information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for' },
          },
          required: ['query'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'get_live_data':
        return this.getLiveData(input['dataTypes'] as string[])
      case 'create_task_plan':
        return this.createTaskPlan(input)
      case 'delegate_to_agent':
        return this.delegateToAgent(input)
      case 'search_memory':
        return this.searchMemory(input)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async getLiveData(dataTypes: string[]): Promise<Record<string, unknown>> {
    if (!this.dataProvider) {
      return { error: 'No data provider configured', note: 'Answering from general knowledge only' }
    }

    const orgId = this.context.organizationId
    const results: Record<string, unknown> = {}

    await Promise.all(dataTypes.map(async (type) => {
      try {
        switch (type) {
          case 'revenue':
            results['revenue'] = await this.dataProvider!.getRevenueStats(orgId)
            break
          case 'contacts':
            results['contacts'] = await this.dataProvider!.getContactStats(orgId)
            break
          case 'deals':
            results['deals'] = await this.dataProvider!.getDealStats(orgId)
            break
          case 'appointments':
            results['appointments'] = await this.dataProvider!.getAppointmentStats(orgId)
            break
          case 'reviews':
            results['reviews'] = await this.dataProvider!.getReviewStats(orgId)
            break
          case 'inventory':
            results['inventory'] = await this.dataProvider!.getLowStockItems(orgId)
            break
          case 'tasks':
            results['tasks'] = await this.dataProvider!.getUpcomingTasks(orgId)
            break
        }
      } catch (err) {
        results[type] = { error: `Failed to fetch ${type} data` }
      }
    }))

    return results
  }

  private async createTaskPlan(input: Record<string, unknown>): Promise<TaskPlan> {
    const goal = input['goal'] as string
    const priority = (input['priority'] as string) ?? 'medium'

    return {
      goal,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: `Analyze current state for: ${goal}`,
          description: 'Gather business data and assess current situation',
          agentType: 'business_brain',
          priority: priority as 'low' | 'medium' | 'high' | 'urgent',
          estimatedTime: '15 minutes',
          parameters: { goal },
        },
      ],
      estimatedDuration: input['deadline'] ? `Until ${input['deadline']}` : '1-2 weeks',
      confidence: 0.85,
      reasoning: `Created execution plan for goal: ${goal}`,
    }
  }

  private async delegateToAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      status: 'delegated',
      agentType: input['agentType'],
      task: input['task'],
      taskId: crypto.randomUUID(),
      message: `Task has been queued for the ${input['agentType']} agent`,
    }
  }

  private async searchMemory(input: Record<string, unknown>): Promise<unknown[]> {
    if (!this.config.memory) return []
    return this.config.memory.search({ organizationId: this.context.organizationId, query: input['query'] as string })
  }
}
