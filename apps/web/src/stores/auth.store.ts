'use client'

import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AuthUser } from '@kanavu/types'
import { api } from '../lib/api-client'

interface AuthState {
  user: AuthUser | null
  organization: { id: string; name: string; slug: string; plan: string; industry: string | null } | null
  isAuthenticated: boolean
  isLoading: boolean

  login: (email: string, password: string) => Promise<void>
  register: (data: {
    email: string
    password: string
    firstName: string
    lastName: string
    organizationName: string
  }) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      organization: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email, password) => {
        set({ isLoading: true })
        try {
          const result = await api.post<{
            user: AuthUser
            tokens: { accessToken: string; refreshToken: string }
            organization: { id: string; name: string; slug: string; plan?: string; industry?: string | null }
          }>('/auth/login', { email, password })

          api.setTokens(result.tokens.accessToken, result.tokens.refreshToken)
          set({
            user: result.user,
            organization: { ...result.organization, plan: result.organization.plan ?? 'STARTER', industry: result.organization.industry ?? null },
            isAuthenticated: true,
          })
        } finally {
          set({ isLoading: false })
        }
      },

      register: async data => {
        set({ isLoading: true })
        try {
          const result = await api.post<{
            user: AuthUser
            tokens: { accessToken: string; refreshToken: string }
          }>('/auth/register', data)

          api.setTokens(result.tokens.accessToken, result.tokens.refreshToken)
          set({ user: result.user, isAuthenticated: true })
        } finally {
          set({ isLoading: false })
        }
      },

      logout: async () => {
        api.clearTokens()
        set({ user: null, organization: null, isAuthenticated: false })
      },

      refreshUser: async () => {
        try {
          const [meResult, orgResult] = await Promise.all([
            api.get<{ user: AuthUser }>('/auth/me'),
            api.get<{ organization: { id: string; name: string; slug: string; plan?: string; industry?: string | null } }>('/org').catch(() => ({ organization: get().organization })),
          ])
          const org = orgResult.organization
          set({
            user: meResult.user,
            organization: org ? { ...org, plan: (org as any).plan ?? get().organization?.plan ?? 'STARTER', industry: (org as any).industry ?? get().organization?.industry ?? null } : get().organization,
          })
        } catch {
          get().logout()
        }
      },
    }),
    {
      name: 'kanavu-auth',
      partialize: state => ({ user: state.user, organization: state.organization, isAuthenticated: state.isAuthenticated }),
    },
  ),
)
