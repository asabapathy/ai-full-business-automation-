import { vi, beforeEach } from 'vitest'

// Mock Prisma client
vi.mock('../services/database.js', () => ({
  prisma: {
    contact: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    deal: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    invoice: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    campaign: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    notification: {
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      count: vi.fn(),
    },
    organization: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    workflow: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      delete: vi.fn(),
    },
    workflowExecution: {
      create: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
    },
    review: {
      findMany: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
      aggregate: vi.fn(),
    },
  },
}))

// Mock AI provider
vi.mock('@kanavu/ai-core', () => ({
  AIProviderFactory: {
    createFromEnv: vi.fn(() => ({
      generate: vi.fn().mockResolvedValue({ content: 'AI response', usage: { inputTokens: 10, outputTokens: 20 } }),
    })),
  },
}))

beforeEach(() => {
  vi.clearAllMocks()
})
