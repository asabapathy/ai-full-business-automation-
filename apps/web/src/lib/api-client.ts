import axios, { type AxiosInstance, type AxiosRequestConfig } from 'axios'

const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1'

class APIClient {
  private client: AxiosInstance
  private refreshing = false
  private refreshQueue: Array<() => void> = []

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.client.interceptors.request.use(config => {
      const token = this.getAccessToken()
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    })

    this.client.interceptors.response.use(
      res => res,
      async error => {
        if (error.response?.status !== 401) throw error
        return this.handleTokenRefresh(error)
      },
    )
  }

  private getAccessToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('kanavu_access_token')
  }

  private getRefreshToken(): string | null {
    if (typeof window === 'undefined') return null
    return localStorage.getItem('kanavu_refresh_token')
  }

  setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('kanavu_access_token', accessToken)
    localStorage.setItem('kanavu_refresh_token', refreshToken)
  }

  clearTokens(): void {
    localStorage.removeItem('kanavu_access_token')
    localStorage.removeItem('kanavu_refresh_token')
  }

  private async handleTokenRefresh(originalError: { config: AxiosRequestConfig & { _retry?: boolean } }): Promise<unknown> {
    if (originalError.config._retry) {
      this.clearTokens()
      window.location.href = '/login'
      throw originalError
    }

    if (this.refreshing) {
      return new Promise(resolve => {
        this.refreshQueue.push(() => resolve(this.client.request(originalError.config)))
      })
    }

    this.refreshing = true
    originalError.config._retry = true

    try {
      const refreshToken = this.getRefreshToken()
      if (!refreshToken) throw new Error('No refresh token')

      const { data } = await this.client.post('/auth/refresh', { refreshToken })
      this.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken)

      this.refreshQueue.forEach(fn => fn())
      this.refreshQueue = []

      return this.client.request(originalError.config)
    } catch {
      this.clearTokens()
      this.refreshQueue = []
      window.location.href = '/login'
      throw originalError
    } finally {
      this.refreshing = false
    }
  }

  async get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
    const { data } = await this.client.get<{ success: boolean; data: T }>(url, { params })
    return data.data!
  }

  async post<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await this.client.post<{ success: boolean; data: T }>(url, body)
    return data.data!
  }

  async patch<T>(url: string, body?: unknown): Promise<T> {
    const { data } = await this.client.patch<{ success: boolean; data: T }>(url, body)
    return data.data!
  }

  async delete<T>(url: string): Promise<T> {
    const { data } = await this.client.delete<{ success: boolean; data: T }>(url)
    return data.data!
  }

  async streamChat(message: string, conversationId?: string, onChunk?: (text: string) => void): Promise<string> {
    const token = this.getAccessToken()
    const response = await fetch(`${API_URL}/ai/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token ?? ''}`,
      },
      body: JSON.stringify({ message, conversationId, stream: true }),
    })

    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response body')

    const decoder = new TextDecoder()
    let fullContent = ''

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      const chunk = decoder.decode(value)
      const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

      for (const line of lines) {
        const json = line.slice(6)
        try {
          const parsed = JSON.parse(json) as { type: string; content?: string }
          if (parsed.type === 'text' && parsed.content) {
            fullContent += parsed.content
            onChunk?.(parsed.content)
          }
        } catch {}
      }
    }

    return fullContent
  }
}

export const api = new APIClient()
