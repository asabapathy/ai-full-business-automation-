export interface ChatRequest {
  message: string
  conversationId?: string
  agentType?: string
  context?: Record<string, unknown>
  stream?: boolean
}

export interface ChatResponse {
  conversationId: string
  messageId: string
  content: string
  actions?: unknown[]
  requiresApproval?: boolean
}

export interface GoalRequest {
  goal: string
  priority?: 'low' | 'medium' | 'high' | 'urgent'
  deadline?: string
  context?: Record<string, unknown>
}

export interface GoalResponse {
  goalId: string
  plan: unknown
  estimatedCompletion?: string
  tasks: unknown[]
}
