import type { AgentContext, AgentResponse, AIMessage, AITool, StreamChunk } from '@kanavu/types'
import type { BaseAIProvider } from '../providers/base.js'
import type { MemoryManager } from '../memory/manager.js'

export interface AgentConfig {
  provider: BaseAIProvider
  memory?: MemoryManager
  maxIterations?: number
  requireApprovalThreshold?: number
}

export abstract class BaseAgent {
  protected messages: AIMessage[] = []
  protected maxIterations: number
  protected requireApprovalThreshold: number

  constructor(
    protected config: AgentConfig,
    protected context: AgentContext,
  ) {
    this.maxIterations = config.maxIterations ?? 10
    this.requireApprovalThreshold = config.requireApprovalThreshold ?? 0.3
  }

  abstract get systemPrompt(): string
  abstract get tools(): AITool[]
  abstract get agentName(): string

  protected abstract handleToolCall(
    name: string,
    input: Record<string, unknown>,
  ): Promise<unknown>

  async run(userMessage: string): Promise<AgentResponse> {
    const relevantMemory = this.config.memory
      ? await this.config.memory.getRelevantContext(
          this.context.organizationId,
          userMessage,
          1500,
        )
      : ''

    const systemPrompt = this.buildSystemPrompt(relevantMemory)

    this.messages.push({ role: 'user', content: userMessage })

    let iterations = 0
    let finalContent = ''
    const actions: AgentResponse['actions'] = []

    while (iterations < this.maxIterations) {
      const result = await this.config.provider.generate({
        messages: this.messages,
        tools: this.tools,
        systemPrompt,
        temperature: 0.7,
        maxTokens: 4096,
      })

      finalContent = result.content

      if (!result.toolCalls?.length || result.stopReason === 'end_turn') {
        break
      }

      // Execute tool calls
      this.messages.push({ role: 'assistant', content: result.content })

      for (const toolCall of result.toolCalls) {
        let toolOutput: unknown
        let toolError: string | undefined

        try {
          toolOutput = await this.handleToolCall(toolCall.name, toolCall.input)
          actions.push({
            type: toolCall.name,
            description: `Executed ${toolCall.name}`,
            parameters: toolCall.input,
            status: 'completed',
            result: toolOutput,
          })
        } catch (err) {
          toolError = err instanceof Error ? err.message : String(err)
          actions.push({
            type: toolCall.name,
            description: `Failed ${toolCall.name}`,
            parameters: toolCall.input,
            status: 'failed',
          })
        }

        this.messages.push({
          role: 'tool',
          content: toolError
            ? JSON.stringify({ error: toolError })
            : JSON.stringify(toolOutput ?? null),
          toolResults: [
            {
              toolCallId: toolCall.id,
              output: toolOutput,
              error: toolError,
            },
          ],
        })
      }

      iterations++
    }

    // Store the interaction in memory
    if (this.config.memory && finalContent) {
      await this.config.memory.store({
        organizationId: this.context.organizationId,
        content: `User asked: "${userMessage}"\nAgent responded: "${finalContent.slice(0, 500)}"`,
        type: 'episodic',
        sourceType: 'conversation',
        importance: 0.5,
      }).catch(() => {}) // Non-blocking
    }

    return {
      content: finalContent,
      actions: actions.length ? actions : undefined,
    }
  }

  async *stream(userMessage: string): AsyncGenerator<StreamChunk> {
    const systemPrompt = this.buildSystemPrompt()
    this.messages.push({ role: 'user', content: userMessage })

    yield* this.config.provider.stream({
      messages: this.messages,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4096,
    })
  }

  private buildSystemPrompt(memoryContext = ''): string {
    let prompt = this.systemPrompt

    if (this.context.businessContext) {
      const bc = this.context.businessContext
      prompt += `\n\n## Business Information\n`
      prompt += `Name: ${bc.name}\n`
      prompt += `Industry: ${bc.industry}\n`
      if (bc.description) prompt += `Description: ${bc.description}\n`
      if (bc.goals?.length) prompt += `Current Goals: ${bc.goals.join(', ')}\n`
    }

    if (memoryContext) {
      prompt += `\n\n${memoryContext}`
    }

    prompt += `\n\nDate: ${new Date().toISOString()}`
    return prompt
  }

  clearMessages(): void {
    this.messages = []
  }
}
