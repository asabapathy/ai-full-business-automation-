import type { AIMessage, AITool, StreamChunk, EmbeddingResult } from '@kanavu/types'

export interface GenerateOptions {
  messages: AIMessage[]
  tools?: AITool[]
  temperature?: number
  maxTokens?: number
  systemPrompt?: string
  stream?: boolean
}

export interface GenerateResult {
  content: string
  toolCalls?: Array<{ id: string; name: string; input: Record<string, unknown> }>
  tokensUsed?: { input: number; output: number }
  model: string
  stopReason: string
}

export abstract class BaseAIProvider {
  abstract readonly name: string
  abstract readonly defaultModel: string

  abstract generate(options: GenerateOptions): Promise<GenerateResult>
  abstract stream(options: GenerateOptions): AsyncGenerator<StreamChunk>
  abstract embed(text: string | string[]): Promise<EmbeddingResult[]>

  protected buildSystemPrompt(base: string, context?: string): string {
    let prompt = base
    if (context) {
      prompt += `\n\n## Business Context\n${context}`
    }
    prompt += `\n\nCurrent date and time: ${new Date().toISOString()}`
    return prompt
  }
}
