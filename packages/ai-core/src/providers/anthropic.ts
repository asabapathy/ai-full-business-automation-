import Anthropic from '@anthropic-ai/sdk'
import type { AIMessage, StreamChunk, EmbeddingResult } from '@kanavu/types'
import { BaseAIProvider, type GenerateOptions, type GenerateResult } from './base.js'

export class AnthropicProvider extends BaseAIProvider {
  readonly name = 'anthropic'
  readonly defaultModel = 'claude-sonnet-5'

  private client: Anthropic

  constructor(apiKey: string, private model = 'claude-sonnet-5') {
    super()
    this.client = new Anthropic({ apiKey })
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const messages = this.convertMessages(options.messages)
    const tools = options.tools?.map(t => ({
      name: t.name,
      description: t.description,
      input_schema: t.inputSchema as Anthropic.Tool['input_schema'],
    }))

    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages,
      tools: tools?.length ? tools : undefined,
    })

    const content = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as Anthropic.TextBlock).text)
      .join('')

    const toolCalls = response.content
      .filter(b => b.type === 'tool_use')
      .map(b => {
        const tb = b as Anthropic.ToolUseBlock
        return {
          id: tb.id,
          name: tb.name,
          input: tb.input as Record<string, unknown>,
        }
      })

    return {
      content,
      toolCalls: toolCalls.length ? toolCalls : undefined,
      tokensUsed: {
        input: response.usage.input_tokens,
        output: response.usage.output_tokens,
      },
      model: response.model,
      stopReason: response.stop_reason ?? 'end_turn',
    }
  }

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
    const messages = this.convertMessages(options.messages)

    const stream = await this.client.messages.stream({
      model: this.model,
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.7,
      system: options.systemPrompt,
      messages,
    })

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield { type: 'text', content: event.delta.text }
      }
    }

    yield { type: 'done' }
  }

  async embed(texts: string | string[]): Promise<EmbeddingResult[]> {
    // Anthropic doesn't have embeddings yet — delegate to a text model for now
    // In production, use OpenAI embeddings or a dedicated embedding service
    const textArray = Array.isArray(texts) ? texts : [texts]
    return textArray.map(text => ({
      text,
      embedding: [],
      tokensUsed: 0,
    }))
  }

  private convertMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
    return messages
      .filter(m => m.role !== 'system')
      .map(m => ({
        role: m.role === 'user' ? 'user' as const : 'assistant' as const,
        content: m.content,
      }))
  }
}
