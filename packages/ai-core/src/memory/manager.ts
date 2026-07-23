import type { MemoryItem, VectorSearchResult } from '@kanavu/types'
import type { BaseAIProvider } from '../providers/base.js'

export interface MemoryStoreOptions {
  organizationId: string
  content: string
  type?: MemoryItem['type']
  sourceType?: string
  sourceId?: string
  importance?: number
  metadata?: Record<string, unknown>
}

export interface MemorySearchOptions {
  organizationId: string
  query: string
  type?: MemoryItem['type']
  limit?: number
  minScore?: number
}

// Interface for the persistence layer — implemented by the API layer
export interface MemoryRepository {
  store(options: MemoryStoreOptions & { embedding: number[] }): Promise<MemoryItem>
  search(embedding: number[], organizationId: string, limit: number): Promise<VectorSearchResult[]>
  getRecent(organizationId: string, limit: number, type?: string): Promise<MemoryItem[]>
  updateImportance(id: string, importance: number): Promise<void>
  delete(id: string): Promise<void>
}

export class MemoryManager {
  constructor(
    private provider: BaseAIProvider,
    private repository: MemoryRepository,
  ) {}

  async store(options: MemoryStoreOptions): Promise<MemoryItem> {
    const [embeddingResult] = await this.provider.embed(options.content)
    if (!embeddingResult) throw new Error('Failed to generate embedding')

    return this.repository.store({
      ...options,
      embedding: embeddingResult.embedding,
    })
  }

  async search(options: MemorySearchOptions): Promise<MemoryItem[]> {
    const [embeddingResult] = await this.provider.embed(options.query)
    if (!embeddingResult) return []

    const results = await this.repository.search(
      embeddingResult.embedding,
      options.organizationId,
      options.limit ?? 10,
    )

    const threshold = options.minScore ?? 0.7
    return results
      .filter(r => r.score >= threshold)
      .map(r => ({
        id: r.id,
        content: r.content,
        type: (r.metadata?.['type'] as MemoryItem['type']) ?? 'episodic',
        importance: (r.metadata?.['importance'] as number) ?? 0.5,
        createdAt: (r.metadata?.['createdAt'] as string) ?? new Date().toISOString(),
        metadata: r.metadata,
      }))
  }

  async getRelevantContext(organizationId: string, query: string, maxTokens = 2000): Promise<string> {
    const memories = await this.search({ organizationId, query, limit: 20 })

    if (memories.length === 0) return ''

    let context = '## Relevant Memory\n\n'
    let totalLength = 0

    for (const memory of memories) {
      const entry = `- ${memory.content}\n`
      if (totalLength + entry.length > maxTokens) break
      context += entry
      totalLength += entry.length
    }

    return context
  }

  async consolidate(organizationId: string): Promise<void> {
    const recentMemories = await this.repository.getRecent(organizationId, 100)
    if (recentMemories.length < 10) return

    // AI-driven consolidation: group similar memories, extract key facts
    // This runs as a background job in production
  }
}
