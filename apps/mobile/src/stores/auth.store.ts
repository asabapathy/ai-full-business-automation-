import { create } from 'zustand'
import { api } from '../lib/api'

interface User {
  id: string
  email: string
  firstName: string
  lastName?: string
}

interface Organization {
  id: string
  name: string
  slug: string
}

interface AuthState {
  user: User | null
  organization: Organization | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  loadUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  organization: null,
  isAuthenticated: false,
  isLoading: true,

  loadUser: async () => {
    try {
      const hasToken = await api.hasToken()
      if (!hasToken) {
        set({ isLoading: false, isAuthenticated: false })
        return
      }
      const data = await api.get<{ user: User; organization: Organization }>('/auth/me')
      set({ user: data.user, organization: data.organization, isAuthenticated: true, isLoading: false })
    } catch {
      await api.clearTokens()
      set({ isLoading: false, isAuthenticated: false })
    }
  },

  login: async (email: string, password: string) => {
    const data = await api.post<{
      user: User
      organization: Organization
      tokens: { accessToken: string; refreshToken: string }
    }>('/auth/login', { email, password })
    await api.setTokens(data.tokens.accessToken, data.tokens.refreshToken)
    set({ user: data.user, organization: data.organization, isAuthenticated: true })
  },

  logout: async () => {
    try { await api.post('/auth/logout') } catch {}
    await api.clearTokens()
    set({ user: null, organization: null, isAuthenticated: false })
  },
}))
