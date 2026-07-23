import axios, { type AxiosInstance } from 'axios'
import * as SecureStore from 'expo-secure-store'
import Constants from 'expo-constants'

const API_URL = (Constants.expoConfig?.extra?.['apiUrl'] as string | undefined) ?? 'http://localhost:4000/api/v1'

const TOKEN_KEY = 'kanavu_access_token'
const REFRESH_KEY = 'kanavu_refresh_token'

class MobileAPIClient {
  private client: AxiosInstance
  private refreshing = false

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      timeout: 30000,
      headers: { 'Content-Type': 'application/json' },
    })

    this.client.interceptors.request.use(async config => {
      const token = await SecureStore.getItemAsync(TOKEN_KEY)
      if (token) config.headers.Authorization = `Bearer ${token}`
      return config
    })

    this.client.interceptors.response.use(
      res => res,
      async error => {
        if (error.response?.status !== 401 || this.refreshing) throw error
        this.refreshing = true
        try {
          const refreshToken = await SecureStore.getItemAsync(REFRESH_KEY)
          if (!refreshToken) throw new Error('No refresh token')
          const { data } = await this.client.post('/auth/refresh', { refreshToken })
          await this.setTokens(data.data.tokens.accessToken, data.data.tokens.refreshToken)
          return this.client.request(error.config)
        } catch {
          await this.clearTokens()
          throw error
        } finally {
          this.refreshing = false
        }
      },
    )
  }

  async setTokens(accessToken: string, refreshToken: string): Promise<void> {
    await Promise.all([
      SecureStore.setItemAsync(TOKEN_KEY, accessToken),
      SecureStore.setItemAsync(REFRESH_KEY, refreshToken),
    ])
  }

  async clearTokens(): Promise<void> {
    await Promise.all([
      SecureStore.deleteItemAsync(TOKEN_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ])
  }

  async hasToken(): Promise<boolean> {
    const token = await SecureStore.getItemAsync(TOKEN_KEY)
    return !!token
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
}

export const api = new MobileAPIClient()
