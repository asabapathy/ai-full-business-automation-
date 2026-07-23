import type { AIProvider } from '@kanavu/types'
import { AnthropicProvider } from './anthropic.js'
import { OpenAIProvider } from './openai.js'
import type { BaseAIProvider } from './base.js'

export interface ProviderConfig {
  provider: AIProvider
  apiKey: string
  model?: string
}

export class AIProviderFactory {
  private static instances = new Map<string, BaseAIProvider>()

  static create(config: ProviderConfig): BaseAIProvider {
    const key = `${config.provider}:${config.model ?? 'default'}`

    if (this.instances.has(key)) {
      return this.instances.get(key)!
    }

    let provider: BaseAIProvider

    switch (config.provider) {
      case 'anthropic':
        provider = new AnthropicProvider(config.apiKey, config.model)
        break
      case 'openai':
        provider = new OpenAIProvider(config.apiKey, config.model)
        break
      default:
        throw new Error(`Unsupported AI provider: ${config.provider}`)
    }

    this.instances.set(key, provider)
    return provider
  }

  static createFromEnv(): BaseAIProvider {
    if (process.env['ANTHROPIC_API_KEY']) {
      return this.create({ provider: 'anthropic', apiKey: process.env['ANTHROPIC_API_KEY'] })
    }
    if (process.env['OPENAI_API_KEY']) {
      return this.create({ provider: 'openai', apiKey: process.env['OPENAI_API_KEY'] })
    }
    throw new Error('No AI provider API key found in environment')
  }
}
