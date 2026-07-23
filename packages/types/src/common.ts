export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
  hasNext: boolean
  hasPrev: boolean
}

export interface ApiResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: Record<string, unknown>
}

export interface ApiError {
  code: string
  message: string
  details?: Record<string, unknown>
  statusCode: number
}

export type ISO8601 = string
export type UUID = string
export type Slug = string

export interface Address {
  street?: string
  city?: string
  state?: string
  zip?: string
  country?: string
}

export interface FileUpload {
  id: string
  url: string
  name: string
  size: number
  mimeType: string
  createdAt: ISO8601
}

export interface WebhookEvent<T = unknown> {
  id: string
  type: string
  organizationId: string
  data: T
  timestamp: ISO8601
}
