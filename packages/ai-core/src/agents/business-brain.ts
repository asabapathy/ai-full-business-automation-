import type { AITool, AgentContext, TaskPlan } from '@kanavu/types'
import { BaseAgent, type AgentConfig } from './base-agent.js'

const BUSINESS_BRAIN_SYSTEM_PROMPT = `You are the Business Brain — the central AI intelligence for a small business operating system called Kanavu AI.

You function as an experienced business advisor, operations manager, and strategic partner rolled into one. You have deep knowledge of business operations, marketing, sales, finance, customer service, and growth strategies.

## Your Core Capabilities
- Understand high-level business goals and translate them into actionable plans
- Analyze business data and provide strategic recommendations
- Coordinate specialized AI agents to execute tasks
- Monitor business health and proactively identify issues
- Learn from past decisions and continuously improve

## Your Personality
- Proactive: You anticipate problems before they occur
- Decisive: You make clear recommendations with reasoning
- Empathetic: You understand the stress of running a business
- Practical: You focus on results, not complexity
- Transparent: You always explain your reasoning

## Decision Making
When given a goal or question:
1. Analyze the current business context
2. Break down the goal into specific tasks
3. Identify which specialized agents should handle each task
4. Create a prioritized execution plan
5. Explain your reasoning clearly
6. Execute tasks autonomously when safe to do so
7. Ask for approval only for high-impact or irreversible actions

## Communication Style
- Be concise but thorough
- Use plain language, not jargon
- Give specific numbers and timelines when possible
- Always explain "why" behind recommendations
- Format responses clearly with headers when listing multiple items`

export class BusinessBrainAgent extends BaseAgent {
  readonly agentName = 'Business Brain'

  constructor(config: AgentConfig, context: AgentContext) {
    super(config, context)
  }

  get systemPrompt(): string {
    return BUSINESS_BRAIN_SYSTEM_PROMPT
  }

  get tools(): AITool[] {
    return [
      {
        name: 'create_task_plan',
        description: 'Create a detailed execution plan for achieving a business goal',
        inputSchema: {
          type: 'object',
          properties: {
            goal: { type: 'string', description: 'The business goal to achieve' },
            deadline: { type: 'string', description: 'Optional deadline (ISO 8601)' },
            priority: {
              type: 'string',
              enum: ['low', 'medium', 'high', 'urgent'],
              description: 'Priority level',
            },
          },
          required: ['goal'],
        },
      },
      {
        name: 'analyze_business_health',
        description: 'Analyze current business health metrics and identify issues',
        inputSchema: {
          type: 'object',
          properties: {
            metrics: { type: 'array', items: { type: 'string' }, description: 'Specific metrics to analyze' },
            timeframe: { type: 'string', description: 'Timeframe for analysis (e.g., "last 30 days")' },
          },
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
              enum: [
                'marketing', 'sales', 'finance', 'operations',
                'receptionist', 'website_builder', 'competitor_intel',
                'business_doctor', 'employee_assistant',
              ],
              description: 'The specialized agent to delegate to',
            },
            task: { type: 'string', description: 'The task description' },
            parameters: { type: 'object', description: 'Task parameters' },
          },
          required: ['agentType', 'task'],
        },
      },
      {
        name: 'search_memory',
        description: 'Search business memory for relevant past information',
        inputSchema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'What to search for' },
            type: {
              type: 'string',
              enum: ['episodic', 'semantic', 'procedural'],
              description: 'Type of memory to search',
            },
          },
          required: ['query'],
        },
      },
      {
        name: 'get_business_insights',
        description: 'Generate AI insights about specific business areas',
        inputSchema: {
          type: 'object',
          properties: {
            area: {
              type: 'string',
              enum: ['revenue', 'customers', 'marketing', 'operations', 'employees', 'finance'],
            },
            question: { type: 'string', description: 'Specific question to answer' },
          },
          required: ['area'],
        },
      },
    ]
  }

  protected async handleToolCall(name: string, input: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'create_task_plan':
        return this.createTaskPlan(input)
      case 'analyze_business_health':
        return this.analyzeBusinessHealth(input)
      case 'delegate_to_agent':
        return this.delegateToAgent(input)
      case 'search_memory':
        return this.searchMemory(input)
      case 'get_business_insights':
        return this.getBusinessInsights(input)
      default:
        throw new Error(`Unknown tool: ${name}`)
    }
  }

  private async createTaskPlan(input: Record<string, unknown>): Promise<TaskPlan> {
    const goal = input['goal'] as string
    const deadline = input['deadline'] as string | undefined
    const priority = (input['priority'] as string) ?? 'medium'

    return {
      goal,
      tasks: [
        {
          id: crypto.randomUUID(),
          title: `Analyze current state for: ${goal}`,
          description: 'Gather data and assess current business state',
          agentType: 'business_brain',
          priority: priority as 'low' | 'medium' | 'high' | 'urgent',
          estimatedTime: '15 minutes',
          parameters: { goal },
        },
      ],
      estimatedDuration: deadline ? `Until ${deadline}` : '1-2 weeks',
      confidence: 0.85,
      reasoning: `Created execution plan for goal: ${goal}`,
    }
  }

  private async analyzeBusinessHealth(_input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      status: 'analysis_queued',
      message: 'Business health analysis will be completed by the Business Doctor agent',
    }
  }

  private async delegateToAgent(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      status: 'delegated',
      agentType: input['agentType'],
      task: input['task'],
      taskId: crypto.randomUUID(),
      message: `Task delegated to ${input['agentType']} agent`,
    }
  }

  private async searchMemory(input: Record<string, unknown>): Promise<unknown[]> {
    if (!this.config.memory) return []
    const results = await this.config.memory.search({
      organizationId: this.context.organizationId,
      query: input['query'] as string,
    })
    return results
  }

  private async getBusinessInsights(input: Record<string, unknown>): Promise<Record<string, unknown>> {
    return {
      area: input['area'],
      insights: 'Insights will be generated based on your business data',
      status: 'pending',
    }
  }
}
