import { vi, beforeEach } from 'vitest'

const prismaMock = {
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
  // Batch 5 models
  expense: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  vendor: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  inventoryItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    fields: { reorderPoint: {} },
  },
  project: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  projectTask: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    delete: vi.fn(),
    count: vi.fn(),
  },
  timeEntry: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  estimate: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  contract: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  goal: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  emailTemplate: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
  onboardingChecklist: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
  },
  onboardingItem: {
    findMany: vi.fn(),
    findFirst: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    count: vi.fn(),
  },
}

// Mock local database service (used by earlier services)
vi.mock('../services/database.js', () => ({ prisma: prismaMock }))

// Mock workspace package (used by Batch 5 services)
vi.mock('@kanavu/database', () => ({ prisma: prismaMock }))

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
