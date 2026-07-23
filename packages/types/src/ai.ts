export type AIProvider = 'anthropic' | 'openai' | 'groq' | 'ollama'

export type AIAgentType =
  | 'business_brain'
  | 'receptionist'
  | 'marketing'
  | 'sales'
  | 'finance'
  | 'operations'
  | 'employee_assistant'
  | 'website_builder'
  | 'competitor_intel'
  | 'business_doctor'
  | 'automation_builder'

export interface AIMessage {
  role: 'user' | 'assistant' | 'system' | 'tool'
  content: string
  toolCalls?: ToolCall[]
  toolResults?: ToolResult[]
}

export interface ToolCall {
  id: string
  name: string
  input: Record<string, unknown>
}

export interface ToolResult {
  toolCallId: string
  output: unknown
  error?: string
}

export interface AITool {
  name: string
  description: string
  inputSchema: {
    type: 'object'
    properties: Record<string, unknown>
    required?: string[]
  }
}

export interface AgentContext {
  organizationId: string
  userId?: string
  conversationId?: string
  agentType: AIAgentType
  businessContext?: BusinessContext
  memories?: MemoryItem[]
  tools?: AITool[]
}

export interface BusinessContext {
  name: string
  industry: string
  description?: string
  goals?: string[]
  recentInsights?: string[]
  kpis?: Record<string, number>
}

export interface MemoryItem {
  id: string
  content: string
  type: 'episodic' | 'semantic' | 'procedural' | 'working'
  importance: number
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface AgentResponse {
  content: string
  reasoning?: string
  actions?: AgentAction[]
  memories?: string[]
  confidence?: number
  requiresApproval?: boolean
  approvalContext?: string
}

export interface AgentAction {
  type: string
  description: string
  parameters: Record<string, unknown>
  status?: 'pending' | 'executing' | 'completed' | 'failed'
  result?: unknown
}

export interface TaskPlan {
  goal: string
  tasks: PlannedTask[]
  estimatedDuration?: string
  confidence: number
  reasoning: string
}

export interface PlannedTask {
  id: string
  title: string
  description: string
  agentType: AIAgentType
  priority: 'low' | 'medium' | 'high' | 'urgent'
  dependencies?: string[]
  estimatedTime?: string
  parameters: Record<string, unknown>
}

export interface VectorSearchResult {
  id: string
  content: string
  score: number
  metadata?: Record<string, unknown>
}

export interface EmbeddingResult {
  text: string
  embedding: number[]
  tokensUsed: number
}

export interface StreamChunk {
  type: 'text' | 'tool_call' | 'tool_result' | 'done' | 'error'
  content?: string
  toolCall?: ToolCall
  toolResult?: ToolResult
  error?: string
}
