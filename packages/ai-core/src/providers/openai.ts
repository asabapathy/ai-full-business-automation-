import OpenAI from 'openai'
import type { AIMessage, StreamChunk, EmbeddingResult } from '@kanavu/types'
import { BaseAIProvider, type GenerateOptions, type GenerateResult } from './base.js'

export class OpenAIProvider extends BaseAIProvider {
  readonly name = 'openai'
  readonly defaultModel = 'gpt-4o'

  private client: OpenAI

  constructor(apiKey: string, private model = 'gpt-4o') {
    super()
    this.client = new OpenAI({ apiKey })
  }

  async generate(options: GenerateOptions): Promise<GenerateResult> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of options.messages) {
      messages.push({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })
    }

    const tools = options.tools?.map(t => ({
      type: 'function' as const,
      function: {
        name: t.name,
        description: t.description,
        parameters: t.inputSchema,
      },
    }))

    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.7,
      tools: tools?.length ? tools : undefined,
    })

    const choice = response.choices[0]
    if (!choice) throw new Error('No response from OpenAI')

    const content = choice.message.content ?? ''
    const toolCalls = choice.message.tool_calls?.map(tc => ({
      id: tc.id,
      name: tc.function.name,
      input: JSON.parse(tc.function.arguments) as Record<string, unknown>,
    }))

    return {
      content,
      toolCalls: toolCalls?.length ? toolCalls : undefined,
      tokensUsed: {
        input: response.usage?.prompt_tokens ?? 0,
        output: response.usage?.completion_tokens ?? 0,
      },
      model: response.model,
      stopReason: choice.finish_reason ?? 'stop',
    }
  }

  async *stream(options: GenerateOptions): AsyncGenerator<StreamChunk> {
    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = []

    if (options.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt })
    }

    for (const m of options.messages) {
      messages.push({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })
    }

    const stream = await this.client.chat.completions.create({
      model: this.model,
      messages,
      max_tokens: options.maxTokens ?? 8192,
      temperature: options.temperature ?? 0.7,
      stream: true,
    })

    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta
      if (delta?.content) {
        yield { type: 'text', content: delta.content }
      }
    }

    yield { type: 'done' }
  }

  async embed(texts: string | string[]): Promise<EmbeddingResult[]> {
    const textArray = Array.isArray(texts) ? texts : [texts]

    const response = await this.client.embeddings.create({
      model: 'text-embedding-3-small',
      input: textArray,
      dimensions: 1536,
    })

    return response.data.map((item, i) => ({
      text: textArray[i] ?? '',
      embedding: item.embedding,
      tokensUsed: response.usage.total_tokens / textArray.length,
    }))
  }
}
